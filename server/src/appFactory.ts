import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './utils/logger.js';

/**
 * Options for creating the Express application.
 */
interface AppOptions {
  /** If true, creates a lightweight app without additional middleware (e.g., for testing). */
  lightweight?: boolean;
}

/**
 * Creates and configures an Express application.
 * Sets up basic security headers (Helmet), CORS, JSON/URL-encoded parsing, and request logging.
 * Adds a standard health check endpoint at `/health`.
 *
 * @param options - Configuration options for the app.
 * @returns The configured Express application instance.
 */
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

  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(
    morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }),
  );

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: '1.0.0',
    });
  });

  if (lightweight) return app;

  // In full mode, server.js wires DB + GraphQL + websockets.
  return app;
}

export { createApp };
