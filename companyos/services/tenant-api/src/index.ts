/**
 * CompanyOS Tenant API
 *
 * GraphQL API for tenant management, feature flags, and audit logging.
 */

import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import type { GraphQLContext } from './graphql/context.js';
import { generateRequestId, getClientIp } from './graphql/context.js';
import {
  stubIdentity,
  validateTenantId,
  httpMetrics,
  metricsHandler,
} from './middleware/index.js';
import { healthCheck, closePool } from './db/postgres.js';

const logger = pino({
  name: 'tenant-api',
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();
const port = Number(process.env.PORT || 4101);

// Middleware
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url === '/health' ||
        req.url === '/healthz' ||
        req.url === '/metrics',
    },
  }),
);
app.use(httpMetrics);
app.use(validateTenantId);
app.use(stubIdentity);

// Health endpoints
app.get('/health', async (req, res) => {
  const dbHealthy = await healthCheck();
  const status = dbHealthy ? 'healthy' : 'unhealthy';

  res.status(dbHealthy ? 200 : 503).json({
    status,
    service: 'tenant-api',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.get('/health/ready', async (req, res) => {
  const dbHealthy = await healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    ready: dbHealthy,
    services: {
      postgres: dbHealthy ? 'healthy' : 'unhealthy',
    },
  });
});

app.get('/health/live', (req, res) => {
  res.json({ live: true });
});

app.get('/health/detailed', async (req, res) => {
  const dbHealthy = await healthCheck();

  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    services: {
      postgres: dbHealthy ? 'healthy' : 'unhealthy',
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Create Apollo Server
const apolloServer = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});

// Start server
async function start() {
  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        const requestId =
          (req.headers['x-request-id'] as string) || generateRequestId();
        const clientIp = getClientIp(req);

        return {
          req,
          res,
          user: req.user,
          requestId,
          clientIp,
          logger: logger.child({
            requestId,
            userId: req.user?.id,
            tenantId: req.user?.tenantId,
          }),
        };
      },
    }),
  );

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
      logger.info(
        { port, graphql: `http://localhost:${port}/graphql` },
        'CompanyOS Tenant API started',
      );
    });
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await apolloServer.stop();
    await closePool();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down...');
    await apolloServer.stop();
    await closePool();
    process.exit(0);
  });
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start Tenant API');
  process.exit(1);
});

export default app;
