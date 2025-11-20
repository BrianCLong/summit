import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { EREngine } from './core/er-engine.js';
import { createRoutes } from './api/routes.js';
import { DEFAULT_SCORING_CONFIG } from './types.js';

const logger = pino({ name: 'er-service' });

/**
 * Create and configure Express app
 */
function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Logging
  app.use(pinoHttp({ logger }));

  // Create ER engine
  const engine = new EREngine(DEFAULT_SCORING_CONFIG);

  // API routes
  app.use('/api/v1', createRoutes(engine));

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err, path: req.path }, 'Request error');
    res.status(500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

/**
 * Start server
 */
function start() {
  const app = createApp();
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    logger.info({ port }, 'ER Service started');
  });
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createApp, EREngine };
export * from './types.js';
