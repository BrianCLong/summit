/**
 * Enhanced Application Setup with OpenAPI, Tracing, and Metrics
 * Integrates all new middleware and features
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { json } from 'body-parser';
import { createServer } from 'http';
import pino from 'pino';

// Import existing modules
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { getContext } from './lib/auth.js';

// Import routes
import healthRouter from './routes/health.js';
import aiRouter from './routes/ai.js';
import adminRouter from './routes/admin.js';

// Import new middleware
import { tracingMiddleware } from './middleware/tracing.js';
import { metricsMiddleware, createMetricsRouter } from './middleware/prometheus-metrics.js';
import { createDocsRouter, logUndocumentedRoutes } from './openapi/middleware.js';
import {
  initializeLicenseSystem,
  enforceComplianceMode,
} from './middleware/authority-hooks.js';

// Import OpenAPI schemas to register routes
import './openapi/routes/health.schemas.js';
import './openapi/routes/ai.schemas.js';

const logger = pino();

export async function createEnhancedApp() {
  const app = express();
  const httpServer = createServer(app);

  // Initialize license system
  initializeLicenseSystem();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-ID',
        'X-Request-ID',
        'X-Trace-ID',
      ],
    }),
  );

  // General middleware
  app.use(compression());
  app.use(json({ limit: '10mb' }));

  // OpenTelemetry tracing middleware (must be early)
  app.use(tracingMiddleware());

  // Prometheus metrics middleware
  app.use(metricsMiddleware());

  // Compliance mode enforcement
  app.use(enforceComplianceMode());

  // Log undocumented routes in development
  if (process.env.NODE_ENV === 'development') {
    app.use(logUndocumentedRoutes());
  }

  // Serve OpenAPI documentation at /docs
  app.use('/docs', createDocsRouter());

  // Serve Prometheus metrics at /metrics
  app.use(createMetricsRouter());

  // Mount health check routes
  app.use(healthRouter);

  // Mount API routes
  app.use('/api/ai', aiRouter);
  app.use('/api/admin', adminRouter);

  // Create Apollo Server for GraphQL
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      logger.error({
        message: 'GraphQL Error',
        error: error.message,
        path: error.path,
        extensions: error.extensions,
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return new Error('An internal error occurred');
        }
      }

      return error;
    },
  });

  // Start Apollo Server
  await server.start();

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: getContext,
    }),
  );

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  // Error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    logger.error({
      msg: 'Unhandled error',
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      requestId: (req as any).requestId,
    });
  });

  logger.info('✅ Enhanced app created with:');
  logger.info('   - OpenAPI documentation at /docs');
  logger.info('   - Prometheus metrics at /metrics');
  logger.info('   - OpenTelemetry tracing enabled');
  logger.info('   - Authority/license hooks active');
  logger.info('   - Zod validation on API boundaries');

  return { app, httpServer };
}

// Export for backward compatibility
export async function createApp() {
  const { app } = await createEnhancedApp();
  return app;
}
