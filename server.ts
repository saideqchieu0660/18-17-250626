import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import apiRouter from './api/index.js'; // Note the .js extension or let module resolution handle it

async function createServer() {
  const app = express();
  app.use(cors());

  // Mount API
  app.use(apiRouter);

  // Mount Vite dev server
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  app.use(vite.middlewares);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

createServer();
