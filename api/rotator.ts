import { keyStore } from './keyStore';

const PAUSE_DURATION_MS = 30000;

export async function executeWithCircuitBreaker<T>(
  action: (key: string) => Promise<T>,
  attempt: number = 0
): Promise<T> {
  const maxAttempts = 10;
  if (attempt >= maxAttempts) {
    throw new Error("CRITICAL_ERROR: Exceeded max retries in Circuit Breaker loop.");
  }

  // Step 1: Scan for GREEN keys
  const keys = keyStore.getKeys();
  const greenKeys = keys.filter(k => k.state === 'GREEN');

  if (greenKeys.length === 0) {
    // If we have ORANGE keys, maybe we should wait. But per prompt: 
    // "If zero GREEN keys exist, throw a critical error immediately."
    throw new Error("CRITICAL_ERROR: Zero GREEN keys available in the pool.");
  }

  // Step 2: Pick a GREEN key (randomly or round-robin)
  const selectedKeyObj = greenKeys[Math.floor(Math.random() * greenKeys.length)];

  try {
    // Execute action
    return await action(selectedKeyObj.key);
  } catch (error: any) {
    const status = error?.status || error?.response?.status;

    // Step 3: Catch block inspection
    if (status === 429 || status === 503) {
      // 429/503 -> YELLOW -> Sleep 30s -> ORANGE -> Retry
      keyStore.updateKeyState(selectedKeyObj.id, 'YELLOW');
      
      console.log(`[Circuit Breaker] Key ${selectedKeyObj.id} hit ${status}. Global pause for 30s...`);
      await new Promise(resolve => setTimeout(resolve, PAUSE_DURATION_MS));
      
      keyStore.updateKeyState(selectedKeyObj.id, 'ORANGE', Date.now() + PAUSE_DURATION_MS);
      
      return executeWithCircuitBreaker(action, attempt + 1);
    } 
    else if (status === 401 || status === 403) {
      // 401/403 -> RED -> Retry immediately
      keyStore.updateKeyState(selectedKeyObj.id, 'RED');
      console.log(`[Circuit Breaker] Key ${selectedKeyObj.id} hit ${status}. Marked RED (Banned).`);
      
      return executeWithCircuitBreaker(action, attempt + 1);
    } 
    else {
      // Other unknown error, rethrow
      throw error;
    }
  }
}
