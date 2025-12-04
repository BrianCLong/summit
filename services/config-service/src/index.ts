import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { typeDefs, resolvers, createContext } from './api/index.js';
import {
  initializePool,
  closePool,
  postgresHealthCheck,
  initializeRedis,
  closeRedis,
  redisHealthCheck,
  initializeSchema,
  isSchemaInitialized,
  subscribeToInvalidations,
  cacheDeletePattern,
} from './db/index.js';
import { logger } from './utils/logger.js';
import { registry } from './utils/metrics.js';

const log = logger.child({ module: 'server' });

const PORT = parseInt(process.env.PORT || '4100', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer(): Promise<void> {
  log.info('Starting Config Service...');

  // Initialize database connections
  log.info('Initializing database connections...');
  initializePool();
  initializeRedis();

  // Initialize schema if needed
  const schemaReady = await isSchemaInitialized();
  if (!schemaReady) {
    log.info('Initializing database schema...');
    await initializeSchema();
  }

  // Subscribe to cache invalidations
  await subscribeToInvalidations(async (message) => {
    log.debug({ message }, 'Received cache invalidation');
    if (message.type === 'all') {
      await cacheDeletePattern('*');
    } else if (message.key) {
      await cacheDeletePattern(`${message.type}:${message.key}:*`);
    }
  });

  // Create Express app
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }),
  );

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: NODE_ENV !== 'production',
    plugins: [
      {
        async requestDidStart() {
          return {
            async willSendResponse({ response, contextValue }) {
              // Add request ID to response headers if available
              const ctx = contextValue as { requestId?: string };
              if (ctx.requestId && response.http) {
                response.http.headers.set('X-Request-ID', ctx.requestId);
              }
            },
          };
        },
      },
    ],
  });

  await server.start();

  // GraphQL endpoint
  app.use(
    '/graphql',
    express.json({ limit: '1mb' }),
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  // Health endpoints
  app.get('/health', async (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.get('/health/ready', async (req, res) => {
    const [pgHealth, redisHealth] = await Promise.all([
      postgresHealthCheck(),
      redisHealthCheck(),
    ]);

    const ready = pgHealth && redisHealth;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks: {
        postgres: pgHealth ? 'ok' : 'fail',
        redis: redisHealth ? 'ok' : 'fail',
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/live', (req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  // Start server
  app.listen(PORT, () => {
    log.info(`Config Service ready at http://localhost:${PORT}/graphql`);
    log.info(`Health check at http://localhost:${PORT}/health`);
    log.info(`Metrics at http://localhost:${PORT}/metrics`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'Received shutdown signal');

    await server.stop();
    await closePool();
    await closeRedis();

    log.info('Config Service shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  log.error({ error }, 'Failed to start Config Service');
  process.exit(1);
});

// Export for testing and programmatic use
export * from './types/index.js';
export * from './services/index.js';
export * from './db/index.js';
export { ConfigClient, createConfigClient } from './sdk/index.js';
