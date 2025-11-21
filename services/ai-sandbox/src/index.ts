import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerRoutes } from './api/routes.js';
import { TaskQueue } from './queue/TaskQueue.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '4020', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main(): Promise<void> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Security middleware
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  });
  await app.register(helmet);

  // Initialize task queue
  const taskQueue = new TaskQueue({
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
  });

  // Register API routes
  await registerRoutes(app, taskQueue);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...');
    await taskQueue.shutdown();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start server
  await app.listen({ port: PORT, host: HOST });
  logger.info({ port: PORT }, 'AI Sandbox service started');
}

main().catch((error) => {
  logger.error({ error: error.message }, 'Failed to start server');
  process.exit(1);
});
