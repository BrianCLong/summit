import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { policyGuard } from './middleware/policy.js';
import { createContext } from './context.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  const app = express();

  // Security middleware
  // app.use(helmet());
  // app.use(compression());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    }) as any,
  );

  // Policy enforcement middleware
  app.use(
    '/graphql',
    policyGuard({
      dryRun: process.env.POLICY_DRY_RUN === 'true',
    }) as any,
  );

  // Apollo GraphQL Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: NODE_ENV === 'development',
    logger: logger as any,
  });

  await server.start();

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server as any, {
      context: createContext as any,
    }) as any,
  );

  app.get(['/health', '/api/health'], (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
    });
  });

  // Mock ingest connectors for smoke tests
  app.get('/ingest/connectors', (req, res) => {
    res.json([
      { id: 'csv-http', name: 'HTTP CSV Connector', status: 'available' },
      { id: 'postgresql', name: 'PostgreSQL Connector', status: 'available' },
      { id: 'neo4j', name: 'Neo4j Connector', status: 'beta' }
    ]);
  });

  // Prometheus metrics for smoke tests
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(`# HELP gateway_requests_total Total requests
# TYPE gateway_requests_total counter
gateway_requests_total 1
# HELP gateway_uptime_seconds Uptime
# TYPE gateway_uptime_seconds gauge
gateway_uptime_seconds ${process.uptime()}
`);
  });

  // K8s liveness probe
  app.get('/health/live', (req, res) => {
    res.json({ status: 'alive' });
  });

  // K8s readiness probe
  app.get('/health/ready', (req, res) => {
    res.json({ status: 'ready' });
  });

  // Standard K8s health endpoints
  app.get('/healthz', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/readyz', (req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  app.listen(PORT, () => {
    logger.info(`🚀 API Gateway ready at http://localhost:${PORT}/graphql`);
    logger.info(`🏥 Health check at http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
