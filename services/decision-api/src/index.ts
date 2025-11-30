/**
 * Decision Graph API Service
 * REST API for managing decision provenance graphs
 *
 * Endpoints:
 * - POST /api/v1/entities - Create entity
 * - POST /api/v1/claims - Create claim
 * - POST /api/v1/evidence - Create evidence
 * - POST /api/v1/decisions - Create decision
 * - GET /api/v1/decisions/:id/graph - Get decision graph
 * - POST /api/v1/decisions/:id/approve - Approve decision
 * - GET /api/v1/decisions/:id/disclosure - Generate disclosure pack
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Pool } from 'pg';
import { entityRoutes } from './routes/entities.js';
import { claimRoutes } from './routes/claims.js';
import { evidenceRoutes } from './routes/evidence.js';
import { decisionRoutes } from './routes/decisions.js';
import { queryRoutes } from './routes/queries.js';
import { disclosureRoutes } from './routes/disclosure.js';
import { healthRoutes } from './routes/health.js';
import { authMiddleware } from './middleware/auth.js';
import { auditMiddleware } from './middleware/audit.js';

const PORT = parseInt(process.env.PORT || '4020');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection pool
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/decision_graph',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

// Register plugins
await server.register(helmet);
await server.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// Register middleware
server.addHook('preHandler', authMiddleware);
server.addHook('onResponse', auditMiddleware);

// Register routes
await server.register(healthRoutes, { prefix: '/health' });
await server.register(entityRoutes, { prefix: '/api/v1/entities' });
await server.register(claimRoutes, { prefix: '/api/v1/claims' });
await server.register(evidenceRoutes, { prefix: '/api/v1/evidence' });
await server.register(decisionRoutes, { prefix: '/api/v1/decisions' });
await server.register(queryRoutes, { prefix: '/api/v1/query' });
await server.register(disclosureRoutes, { prefix: '/api/v1/disclosure' });

// Graceful shutdown
const shutdown = async () => {
  server.log.info('Shutting down...');
  await server.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(
      `🔍 Decision API service ready at http://localhost:${PORT}`,
    );
    server.log.info(
      `📖 API docs at http://localhost:${PORT}/documentation`,
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export { server };
