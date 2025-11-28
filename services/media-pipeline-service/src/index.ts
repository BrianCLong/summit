/**
 * Media Pipeline Service
 *
 * Main entry point for the media intake and processing service.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { healthRoutes } from './routes/health.routes.js';
import { mediaRoutes } from './routes/media.routes.js';
import { transcriptRoutes } from './routes/transcript.routes.js';
import { providerRoutes } from './routes/providers.routes.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { policyMiddleware } from './middleware/policy.js';
import { providerRegistry } from './providers/registry.js';
import { logger } from './utils/logger.js';
import config from './config/index.js';

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    trustProxy: true,
  });

  // Register plugins
  await server.register(helmet, {
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
  });

  await server.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Register hooks
  server.addHook('preHandler', correlationIdMiddleware);
  server.addHook('preHandler', policyMiddleware);

  // Register routes
  await server.register(healthRoutes);
  await server.register(mediaRoutes);
  await server.register(transcriptRoutes);
  await server.register(providerRoutes);

  // Error handler
  server.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        error: errorMessage,
        stack: errorStack,
        correlationId: request.correlationId,
        url: request.url,
        method: request.method,
      },
      'Request error'
    );

    const statusCode = error.statusCode || 500;
    const message =
      config.nodeEnv === 'production' && statusCode >= 500
        ? 'Internal server error'
        : errorMessage;

    reply.status(statusCode).send({
      error: message,
      correlationId: request.correlationId,
    });
  });

  return server;
}

async function start(): Promise<void> {
  let server: FastifyInstance | null = null;

  try {
    logger.info(
      {
        nodeEnv: config.nodeEnv,
        port: config.port,
        host: config.host,
      },
      'Starting Media Pipeline Service'
    );

    // Initialize provider registry
    await providerRegistry.initialize();
    logger.info('Provider registry initialized');

    // Build and start server
    server = await buildServer();

    await server.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(
      {
        address: `http://${config.host}:${config.port}`,
        routes: server.printRoutes(),
      },
      'Media Pipeline Service started'
    );

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      if (server) {
        await server.close();
        logger.info('Server closed');
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();

export { buildServer };
