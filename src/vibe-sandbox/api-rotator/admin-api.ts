import express from 'express';
import { prisma } from './prisma';

const router = express.Router();

router.get('/keys', async (req, res) => {
  try {
    const keys = await prisma.vibeApiKey.findMany({
      orderBy: { id: 'asc' }
    });

    const maskedKeys = keys.map(k => {
      const kv = k.keyValue;
      const masked = kv.length > 8 
        ? `${kv.substring(0, 4)}...${kv.substring(kv.length - 4)}`
        : '***';
        
      return {
        id: k.id,
        keyValue: masked,
        status: k.status,
        recoveryUntil: k.recoveryUntil ? k.recoveryUntil.toISOString() : null
      };
    });

    res.json(maskedKeys);
  } catch (error) {
    console.error('Error fetching admin keys:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
