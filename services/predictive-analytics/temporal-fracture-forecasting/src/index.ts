/**
 * Temporal Fracture Forecasting Service
 *
 * Main entry point for the service. Sets up Express server with GraphQL API.
 */

import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { TemporalFractureEngine } from './TemporalFractureEngine.js';
import { temporalFractureResolvers } from './resolvers/temporalFractureResolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger
const logger = pino({
  name: 'temporal-fracture-forecasting',
  level: process.env.LOG_LEVEL || 'info',
});

// Load GraphQL schema
const typeDefs = readFileSync(
  join(__dirname, '../schema.graphql'),
  'utf-8'
);

// Service configuration
const PORT = parseInt(process.env.PORT || '4500', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize engine
const engine = new TemporalFractureEngine();

// Context type
export interface GraphQLContext {
  engine: TemporalFractureEngine;
  logger: typeof logger;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers: temporalFractureResolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    introspection: NODE_ENV !== 'production',
  });

  await server.start();

  // Middleware
  app.use(
    helmet({
      contentSecurityPolicy:
        NODE_ENV === 'production' ? undefined : false,
    })
  );

  app.use(
    cors({
      origin:
        NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || []
          : '*',
      credentials: true,
    })
  );

  app.use(express.json());

  // Health check endpoints
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/health/ready', (_req, res) => {
    // Check database connectivity, etc.
    const isReady = true; // TODO: Implement actual readiness checks

    if (isReady) {
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res
        .status(503)
        .json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
  });

  app.get('/health/live', (_req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({
        engine,
        logger,
      }),
    })
  );

  // Start listening
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT }, resolve)
  );

  logger.info(
    `🚀 Temporal Fracture Forecasting service ready at http://localhost:${PORT}/graphql`
  );
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(`Environment: ${NODE_ENV}`);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await server.stop();
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start server
startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
