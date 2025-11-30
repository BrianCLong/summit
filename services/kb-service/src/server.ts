/**
 * KB Service API Server
 * Knowledge Base service for documentation, runbooks, SOPs, and contextual help
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { articleRouter, helpRouter, adminRouter } from './routes/index.js';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  logger,
} from './middleware/index.js';
import { healthCheck, closePool } from './db/connection.js';

const app = express();
const PORT = parseInt(process.env.KB_SERVICE_PORT || '3200', 10);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Request processing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Health checks
app.get('/health', async (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'kb-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req, res) => {
  try {
    const dbHealthy = await healthCheck();
    if (dbHealthy) {
      res.json({
        status: 'ready',
        service: 'kb-service',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        service: 'kb-service',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'kb-service',
      database: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/health/live', (_req, res) => {
  res.json({
    status: 'alive',
    service: 'kb-service',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/kb/articles', articleRouter);
app.use('/api/v1/kb', helpRouter);
app.use('/api/v1/kb/admin', adminRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal');

  try {
    await closePool();
    logger.info('Database connections closed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'KB Service started');
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, 'Port already in use');
  } else {
    logger.error({ error }, 'Server error');
  }
  process.exit(1);
});

export default app;
export { server };
