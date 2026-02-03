import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { cfg } from './config.js';
import logger from './utils/logger.js';
import { auditLogDashboard } from './logging/structuredLogger.js';

interface AppOptions {
  lightweight?: boolean;
}

function createApp({ lightweight = false }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(cors({ origin: cfg.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(
    morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }),
  );

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: cfg.NODE_ENV,
      version: '1.0.0',
    });
  });

  app.get('/observability/logs/dashboard', (req, res) => {
    res.status(200).json(auditLogDashboard.getDashboardSnapshot());
  });

  if (lightweight) return app;

  // In full mode, server.ts wires DB + GraphQL + websockets.
  return app;
}

export { createApp };
