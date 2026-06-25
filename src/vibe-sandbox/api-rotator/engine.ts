import { redis } from './redis';
import { prisma } from './prisma';

const POOL_KEY = 'api:pool:active';

// Chống treo luồng (non-blocking yield)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function syncPoolFromDB() {
  const activeKeys = await prisma.vibeApiKey.findMany({
    where: {
      OR: [
        { status: 'GREEN' },
        { status: 'ORANGE', recoveryUntil: { lte: new Date() } }
      ]
    }
  });

  const pipeline = redis.pipeline();
  pipeline.del(POOL_KEY);
  
  const validKeys: string[] = [];
  
  for (const key of activeKeys) {
    if (key.status === 'ORANGE') {
      const lock = await redis.get(`api:lock:${key.id}`);
      if (!lock) {
        // Lazy Auto-Heal
        await prisma.vibeApiKey.update({
          where: { id: key.id },
          data: { status: 'GREEN', recoveryUntil: null }
        });
        validKeys.push(key.id);
      }
    } else {
      validKeys.push(key.id);
    }
  }

  if (validKeys.length > 0) {
    pipeline.sadd(POOL_KEY, ...validKeys);
    await pipeline.exec();
  }
}

export async function routeApiRequest(promptData: any, retryCount = 0): Promise<any> {
  if (retryCount >= 5) {
    throw new Error('CRITICAL_ERROR: Max retry limit exceeded (5). Stack overflow prevented.');
  }

  const keyId = await redis.srandmember(POOL_KEY);

  if (!keyId) {
    await syncPoolFromDB();
    const emergencyKeyId = await redis.srandmember(POOL_KEY);
    if (!emergencyKeyId) {
       throw new Error('CRITICAL_ERROR: Active API Key pool is completely empty.');
    }
    return routeApiRequest(promptData, retryCount);
  }

  const keyRecord = await prisma.vibeApiKey.findUnique({ where: { id: keyId as string } });
  
  if (!keyRecord) {
     await redis.srem(POOL_KEY, keyId);
     return routeApiRequest(promptData, retryCount);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keyRecord.keyValue}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptData)
    });

    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      (error as any).status = res.status;
      throw error;
    }

    return await res.json();

  } catch (error: any) {
    const status = error.status;

    if (status === 429 || status === 503) {
      // YELLOW -> ORANGE 
      await redis.srem(POOL_KEY, keyId);
      await redis.setex(`api:lock:${keyId}`, 30, 'cooldown');
      
      const recoveryTime = new Date(Date.now() + 30000);
      await prisma.vibeApiKey.update({
        where: { id: keyId as string },
        data: { status: 'ORANGE', recoveryUntil: recoveryTime }
      });

      await delay(150);
      return routeApiRequest(promptData, retryCount + 1);
    } 
    
    if (status === 401 || status === 403) {
      // RED
      await redis.srem(POOL_KEY, keyId);
      await prisma.vibeApiKey.update({
        where: { id: keyId as string },
        data: { status: 'RED' }
      });

      await delay(150);
      return routeApiRequest(promptData, retryCount + 1);
    }

    await delay(150);
    return routeApiRequest(promptData, retryCount + 1);
  }
}
