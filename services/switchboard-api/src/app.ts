import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { webhookRoutes } from './routes/webhooks.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: false
  });

  await fastify.register(helmet);
  await fastify.register(cors);

  // Register routes
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });

  fastify.get('/healthz', async () => {
    return { status: 'ok' };
  });

  return fastify;
}
