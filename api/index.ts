import express from 'express';
import { keyStore } from './keyStore';
import { executeWithCircuitBreaker } from './rotator';

const app = express();
app.use(express.json());

// Endpoint to fetch the current state of all keys
app.get('/api/keys', (_req, res) => {
  const keys = keyStore.getKeys();
  res.json({ keys });
});

// Endpoint to simulate an ingestion request
app.post('/api/ingest', async (req, res) => {
  const { simulateStatus } = req.body;

  try {
    const result = await executeWithCircuitBreaker(async (apiKey) => {
      // Simulate external API call
      console.log(`Executing request with key: ${apiKey}`);
      
      if (simulateStatus) {
        const error: any = new Error(`Simulated Error ${simulateStatus}`);
        error.status = simulateStatus;
        throw error;
      }

      // Simulate a successful call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, usedKey: apiKey, message: 'Data ingested successfully' };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vercel Lambda compatibility: export the express app
export default app;
