/**
 * Provenance and Claims Ledger Service
 * Handles evidence/claim registration, provenance chains, and export manifests
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import pclRoutes from './routes/pcl.js';

const PORT = parseInt(process.env.PORT || '4010');
const PCL_ENABLED = process.env.PCL_ENABLED !== 'false';

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
});

// Register plugins
server.register(helmet);
server.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

// Feature Flag Middleware
server.addHook('preHandler', async (req, reply) => {
  if (!PCL_ENABLED && req.url !== '/health') {
    return reply.code(503).send({ error: 'PCL Service is currently disabled by feature flag' });
  }
});

// Health check
server.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    pcl_enabled: PCL_ENABLED,
    timestamp: new Date().toISOString(),
  };
});

// Register Routes
server.register(pclRoutes);

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`🗃️  Prov-Ledger service ready at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
