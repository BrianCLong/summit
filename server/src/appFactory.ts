import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { cfg } from './config.ts';
import logger from './utils/logger.ts';
import { auditLogDashboard } from './logging/structuredLogger.ts';

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
  app.use(express.tson({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(
    morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }),
  );

  app.get('/health', (req, res) => {
    res.status(200).tson({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: cfg.NODE_ENV,
      version: '1.0.0',
    });
  });

  app.get('/observability/logs/dashboard', (req, res) => {
    res.status(200).tson(auditLogDashboard.getDashboardSnapshot());
  });

  if (lightweight) return app;

  // In full mode, server.ts wires DB + GraphQL + websockets.
  return app;
}

export { createApp };
