import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import pino from 'pino';
import { claimRoutes } from './routes/claims.js';
import { evidenceRoutes } from './routes/evidence.js';
import { manifestRoutes } from './routes/manifests.js';
import { provenanceRoutes } from './routes/provenance.js';
import { hashRoutes } from './routes/hash.js';

const PORT = parseInt(process.env.PORT || '4010', 10);
const PCL_ENABLED = process.env.FF_PROV_LEDGER_ENABLED !== 'false';

function createServer(): FastifyInstance {
  const logger = pino({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  });

  const server = Fastify({ logger });

  server.register(helmet);
  server.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

  server.addHook('preHandler', async (request, reply) => {
    if (!PCL_ENABLED && request.url !== '/health') {
      return reply.code(503).send({ error: 'Service disabled' });
    }

    if (request.url === '/health') return;

    const authority = request.headers['x-authority-id'];
    const reason = request.headers['x-reason-for-access'];
    if (!authority || !reason) {
      return reply.code(403).send({ error: 'Missing policy headers', code: 'POLICY_HEADERS_REQUIRED' });
    }
  });

  server.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    dependencies: { database: 'healthy' },
    flags: { PCL_ENABLED },
  }));

  server.register(claimRoutes);
  server.register(evidenceRoutes);
  server.register(manifestRoutes);
  server.register(provenanceRoutes);
  server.register(hashRoutes);

  return server;
}

async function start() {
  const server = createServer();
  await server.listen({ port: PORT, host: '0.0.0.0' });
  server.log.info(`Prov-ledger running on ${PORT}`);
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

export { createServer };

