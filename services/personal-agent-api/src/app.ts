import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { agentRoutes } from './routes/agent.js';
import { runRoutes } from './routes/runs.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: false
  });

  await fastify.register(helmet);
  await fastify.register(cors);

  // Register routes
  await fastify.register(agentRoutes, { prefix: '/agent' });
  await fastify.register(runRoutes, { prefix: '/runs' });

  fastify.get('/healthz', async () => {
    return { status: 'ok' };
  });

  return fastify;
}
