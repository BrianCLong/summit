/**
 * ESG Reporting Service
 * Main entry point for the ESG metrics tracking and automated reporting service
 */

import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import { db } from './utils/database.js';
import { schedulerService } from './services/SchedulerService.js';
import reportsRouter from './routes/reports.js';
import schedulesRouter from './routes/schedules.js';
import frameworksRouter from './routes/frameworks.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3450', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

// ============================================================================
// Health Check Endpoints
// ============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'esg-reporting-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');
    res.json({
      ready: true,
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      checks: {
        database: 'failed',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/health/live', (_req, res) => {
  res.json({ live: true });
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/schedules', schedulesRouter);
app.use('/api/v1/frameworks', frameworksRouter);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ error: err }, 'Unhandled error');
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  },
);

// ============================================================================
// Server Startup
// ============================================================================

async function start(): Promise<void> {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await db.connect();

    // Initialize scheduler
    logger.info('Initializing report scheduler...');
    await schedulerService.initialize();

    // Start server
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'ESG Reporting Service started');
      logger.info('Available endpoints:');
      logger.info('  GET  /health - Health check');
      logger.info('  GET  /health/ready - Readiness check');
      logger.info('  GET  /health/live - Liveness check');
      logger.info('  POST /api/v1/reports - Create report');
      logger.info('  GET  /api/v1/reports - List reports');
      logger.info('  GET  /api/v1/reports/:id - Get report');
      logger.info('  PATCH /api/v1/reports/:id - Update report');
      logger.info('  DELETE /api/v1/reports/:id - Delete report');
      logger.info('  POST /api/v1/reports/:id/metrics - Add metric');
      logger.info('  GET  /api/v1/reports/:id/metrics - Get metrics');
      logger.info('  POST /api/v1/reports/:id/export - Export report');
      logger.info('  POST /api/v1/schedules - Create schedule');
      logger.info('  GET  /api/v1/schedules - List schedules');
      logger.info('  GET  /api/v1/frameworks - List frameworks');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  schedulerService.shutdown();
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  schedulerService.shutdown();
  await db.disconnect();
  process.exit(0);
});

// Start the service
start();

export { app };
