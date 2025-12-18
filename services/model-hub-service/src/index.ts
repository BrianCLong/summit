/**
 * Model Hub Service
 *
 * Centralized model registry, routing, and governance for LLMs, embeddings,
 * and classifiers in the IntelGraph platform.
 */

import express from 'express';
import { logger } from './utils/logger.js';
import { db } from './db/connection.js';
import { runMigrations } from './db/migrations.js';
import { errorHandler } from './middleware/errorHandler.js';
import { modelsRouter } from './routes/models.js';
import { routingRouter } from './routes/routing.js';
import { governanceRouter } from './routes/governance.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'model-hub-service',
    timestamp: new Date().toISOString(),
  });
});

// Health check with database status
app.get('/health/detailed', async (req, res) => {
  const dbHealth = await db.healthCheck();
  res.json({
    status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
    service: 'model-hub-service',
    timestamp: new Date().toISOString(),
    components: {
      database: dbHealth,
    },
  });
});

// API Routes
app.use('/api/v1/models', modelsRouter);
app.use('/api/v1/routing', routingRouter);
app.use('/api/v1/governance', governanceRouter);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  const PORT = parseInt(process.env.MODEL_HUB_PORT || '3010');

  try {
    // Connect to database
    await db.connect();

    // Run migrations
    await runMigrations();

    app.listen(PORT, () => {
      logger.info({
        message: 'Model Hub Service started',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      });
    });
  } catch (error) {
    logger.error({
      message: 'Failed to start Model Hub Service',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down...');
  await db.close();
  process.exit(0);
});

// Export for testing
export { app };

// Start if main module
start();
