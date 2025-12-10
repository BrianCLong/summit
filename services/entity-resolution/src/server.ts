/**
 * Entity Resolution Service - HTTP Server
 *
 * Express server entry point
 */

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { ErService } from './services/ErService.js';
import {
  InMemoryEntityRecordRepository,
  InMemoryMatchDecisionRepository,
  InMemoryMergeOperationRepository,
} from './repositories/InMemoryRepositories.js';
import { DEFAULT_CONFIG } from './matching/classifier.js';
import { createApiRouter } from './api/routes.js';

// Logger
const logger = pino({ name: 'entity-resolution-service' });

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// Initialize repositories (in-memory for now)
const entityRepo = new InMemoryEntityRecordRepository();
const decisionRepo = new InMemoryMatchDecisionRepository();
const mergeRepo = new InMemoryMergeOperationRepository();

// Initialize ER service
const erService = new ErService(entityRepo, decisionRepo, mergeRepo, DEFAULT_CONFIG);

// Mount API routes
app.use('/er', createApiRouter(erService));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Entity Resolution Service',
    version: '1.0.0',
    endpoints: {
      health: 'GET /er/health',
      compare: 'POST /er/compare',
      batchCandidates: 'POST /er/batch-candidates',
      merge: 'POST /er/merge',
      split: 'POST /er/split',
      getDecision: 'GET /er/decisions/:id',
      getMergeHistory: 'GET /er/merge-history/:recordId',
    },
  });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error({ err, req: req.url }, 'Unhandled error');
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
);

// Start server
const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  logger.info(`Entity Resolution Service listening on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/er/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
