/**
 * HUMINT Source Management Service
 *
 * Main entry point for the HUMINT service providing:
 * - Source registration and management
 * - Debrief workflow orchestration
 * - Asset tracking and graph integration
 * - Validation and compliance checking
 */

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { createSourceRoutes } from './routes/sources.js';
import { createDebriefRoutes } from './routes/debriefs.js';
import { createAssetTrackingRoutes } from './routes/asset-tracking.js';
import { createValidationRoutes } from './routes/validation.js';
import { createHealthRoutes } from './routes/health.js';
import { errorHandler } from './middleware/error-handler.js';
import { authMiddleware } from './middleware/auth.js';
import { createServiceContext, ServiceContext } from './context.js';

const logger = pino({
  name: 'humint-service',
  level: process.env.LOG_LEVEL || 'info',
});

export async function createApp(
  context?: ServiceContext,
): Promise<express.Application> {
  const app = express();
  const ctx = context || (await createServiceContext());

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(pinoHttp({ logger }));

  // Health routes (no auth required)
  app.use('/health', createHealthRoutes(ctx));

  // Auth middleware for protected routes
  app.use(authMiddleware(ctx));

  // API routes
  app.use('/api/v1/sources', createSourceRoutes(ctx));
  app.use('/api/v1/debriefs', createDebriefRoutes(ctx));
  app.use('/api/v1/asset-tracking', createAssetTrackingRoutes(ctx));
  app.use('/api/v1/validation', createValidationRoutes(ctx));

  // Error handling
  app.use(errorHandler(logger));

  return app;
}

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '4020', 10);

  try {
    const app = await createApp();

    app.listen(port, () => {
      logger.info({ port }, 'HUMINT service started');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down HUMINT service');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Failed to start HUMINT service');
    process.exit(1);
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ServiceContext } from './context.js';
export * from './services/SourceService.js';
export * from './services/DebriefService.js';
export * from './services/AssetTrackingService.js';
export * from './services/ValidationService.js';
