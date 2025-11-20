import express, { Request, Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import cors from 'cors';
import { setupRoutes } from './routes/index.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export async function createApp(): Promise<express.Application> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(pinoHttp({ logger }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'supply-chain-service',
      timestamp: new Date().toISOString(),
    });
  });

  // Setup routes
  setupRoutes(app);

  return app;
}

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  createApp().then((app) => {
    const port = process.env.PORT || 4020;
    app.listen(port, () => {
      logger.info(`Supply Chain Service listening on port ${port}`);
    });
  });
}
