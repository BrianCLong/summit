import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './utils/logger.js';
import { checkRedis, checkNeo4j } from './monitoring/health.js';

interface AppOptions {
  lightweight?: boolean;
}

function createApp({ lightweight = false }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    },
    referrerPolicy: { policy: 'no-referrer' }
  }));

  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

  app.get('/health', async (_req, res) => {
    try {
      const [redis, neo4j] = await Promise.all([
        checkRedis(),
        checkNeo4j(),
      ]);
      const healthy =
        redis.status === 'healthy' && neo4j.status === 'healthy';
      res.status(healthy ? 200 : 500).json({
        status: healthy ? 'ok' : 'error',
        redis: redis.status,
        neo4j: neo4j.status,
      });
    } catch (err) {
      res.status(500).json({ status: 'error', error: (err as Error).message });
    }
  });

  if (lightweight) return app;

  // In full mode, server.js wires DB + GraphQL + websockets.
  return app;
}

export { createApp };
