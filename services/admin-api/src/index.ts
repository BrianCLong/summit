/**
 * Admin Studio GraphQL API Server
 */

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { SlowQueryKiller } from '@intelgraph/slow-query-killer';
import { MetricsExporter, createMetricsMiddleware, createMetricsEndpoint } from '@intelgraph/metrics-exporter';
import { resolvers, Context } from './resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = parseInt(process.env.ADMIN_API_PORT || '4100');
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

// Initialize dependencies
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit',
});

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

await redis.connect();

const pubsub = new PubSub();

const slowQueryKiller = new SlowQueryKiller({
  maxExecutionTimeMs: parseInt(process.env.DEFAULT_QUERY_TIMEOUT_MS || '30000'),
  maxCostDollars: parseFloat(process.env.DEFAULT_QUERY_MAX_COST || '1.0'),
  softThreshold: 0.8,
  killEnabled: process.env.NODE_ENV === 'production',
});

const metrics = new MetricsExporter({
  serviceName: 'admin-api',
  environment: process.env.NODE_ENV || 'development',
});

// Set up query monitoring events
slowQueryKiller.on('query_warning', (event) => {
  console.warn('Query warning:', event);
  pubsub.publish('QUERY_WARNING', { queryWarnings: event });
  pubsub.publish(`QUERY_WARNING_${event.tenantId}`, { queryWarnings: event });
});

slowQueryKiller.on('query_killed', (event) => {
  console.log('Query killed:', event);
  metrics.recordSlowQueryKill(event.database, event.tenantId);
  pubsub.publish('QUERY_KILL', { queryKills: event });
  pubsub.publish(`QUERY_KILL_${event.tenantId}`, { queryKills: event });
});

// Create Express app
const app = express();
const httpServer = createServer(app);

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer(
  {
    schema,
    context: async () => ({
      db,
      redis,
      slowQueryKiller,
      metrics,
      pubsub,
    }),
  },
  wsServer
);

// Create Apollo Server
const server = new ApolloServer<Context>({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
  introspection: process.env.NODE_ENV !== 'production',
});

await server.start();

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));

app.use(express.json());

// Metrics middleware
app.use(createMetricsMiddleware(metrics));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'admin-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dependencies: {} as Record<string, any>,
  };

  // Check database
  try {
    await db.query('SELECT 1');
    health.dependencies.postgres = { status: 'healthy' };
  } catch (error) {
    health.dependencies.postgres = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    await redis.ping();
    health.dependencies.redis = { status: 'healthy' };
  } catch (error) {
    health.dependencies.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    };
    health.status = 'degraded';
  }

  // Slow query stats
  health.dependencies.slowQueryKiller = {
    status: 'healthy',
    stats: slowQueryKiller.getStats(),
  };

  res.json(health);
});

// Prometheus metrics endpoint
app.get('/metrics', createMetricsEndpoint(metrics));

// GraphQL endpoint
app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      // Extract user from JWT or session
      // For now, just pass through
      const user = req.headers.authorization
        ? {
            id: 'system',
            tenantId: req.headers['x-tenant-id'] as string || 'default',
            roles: ['admin'],
          }
        : undefined;

      return {
        db,
        redis,
        slowQueryKiller,
        metrics,
        pubsub,
        user,
      };
    },
  })
);

// Start periodic system metrics updates
setInterval(async () => {
  const memoryUsage = process.memoryUsage();
  const systemMetrics = {
    cpuUsagePercent: 0,
    memoryUsageBytes: memoryUsage.heapUsed,
    memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    activeConnections: 0,
    requestRate: 0,
    errorRate: 0,
    p95LatencyMs: 0,
  };

  metrics.updateActiveConnections('http', 0); // Would track real connections
  pubsub.publish('SYSTEM_METRICS', { systemMetricsUpdated: systemMetrics });
}, 10000); // Every 10 seconds

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  slowQueryKiller.stop();
  await redis.quit();
  await db.end();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Admin Studio GraphQL API running at http://localhost:${PORT}/graphql`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🔍 Health check at http://localhost:${PORT}/health`);
  console.log(`📡 Subscriptions available at ws://localhost:${PORT}/graphql`);
});
