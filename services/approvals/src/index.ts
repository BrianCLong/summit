import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { db } from './db/database.js';
import { registry } from './utils/metrics.js';
import { approvalService } from './services/approval-service.js';

import approvalsRouter from './routes/approvals.js';
import healthRouter from './routes/health.js';

const app = express();

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// CORS
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? false : '*',
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/health/live',
    },
  }),
);

// ============================================================================
// Routes
// ============================================================================

// Health endpoints (no auth required)
app.use('/health', healthRouter);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

// API routes
app.use('/api/v1', approvalsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  },
);

// ============================================================================
// Startup
// ============================================================================

async function start(): Promise<void> {
  try {
    // Connect to database
    await db.connect();
    logger.info('Database connected');

    // Start expiration job (every 5 minutes)
    setInterval(
      async () => {
        try {
          await approvalService.expireStaleRequests();
        } catch (err) {
          logger.error({ err }, 'Failed to expire stale requests');
        }
      },
      5 * 60 * 1000,
    );

    // Start server
    app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
          env: config.nodeEnv,
          features: config.features,
        },
        `Approvals service listening on port ${config.port}`,
      );
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start service');
    process.exit(1);
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  try {
    await db.disconnect();
    logger.info('Database disconnected');
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the service
start();

export { app };
