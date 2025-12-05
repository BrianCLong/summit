/**
 * Data Factory Service - Main Entry Point
 *
 * Fastify-based REST API server for dataset curation, labeling workflows,
 * and training data management.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pino from 'pino';
import { createPool, healthCheck, closePool } from './db/connection.js';
import { createServiceContainer } from './services/index.js';
import { registerRoutes } from './routes/index.js';

const logger = pino({
  name: 'data-factory-service',
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
});

interface ServerConfig {
  host: string;
  port: number;
}

const config: ServerConfig = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '8080', 10),
};

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-request-id'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Data Factory Service API',
        description: 'API for dataset curation, labeling workflows, and training data management',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'datasets', description: 'Dataset management' },
        { name: 'samples', description: 'Sample management' },
        { name: 'labeling', description: 'Labeling jobs and queues' },
        { name: 'workflows', description: 'Labeling workflows' },
        { name: 'exports', description: 'Dataset exports' },
        { name: 'annotators', description: 'Annotator management' },
        { name: 'quality', description: 'Quality control' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Initialize database
  createPool();

  // Create service container
  const services = createServiceContainer();

  // Register routes
  registerRoutes(app, services);

  // Health check endpoints
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  app.get('/health/ready', async () => {
    const dbHealth = await healthCheck();
    return {
      status: dbHealth.status === 'healthy' ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  });

  app.get('/health/live', async () => {
    return { status: 'live', timestamp: new Date().toISOString() };
  });

  app.get('/health/detailed', async () => {
    const dbHealth = await healthCheck();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
    };
  });

  // Metrics endpoint (Prometheus format)
  app.get('/metrics', async () => {
    const dbHealth = await healthCheck();
    return `# HELP data_factory_up Service health status
# TYPE data_factory_up gauge
data_factory_up 1

# HELP data_factory_db_pool_size Database pool size
# TYPE data_factory_db_pool_size gauge
data_factory_db_pool_size ${dbHealth.poolSize}

# HELP data_factory_db_pool_idle Idle connections in pool
# TYPE data_factory_db_pool_idle gauge
data_factory_db_pool_idle ${dbHealth.idleCount}

# HELP data_factory_db_pool_waiting Waiting connections
# TYPE data_factory_db_pool_waiting gauge
data_factory_db_pool_waiting ${dbHealth.waitingCount}

# HELP data_factory_db_latency_ms Database query latency
# TYPE data_factory_db_latency_ms gauge
data_factory_db_latency_ms ${dbHealth.latency}
`;
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      service: 'data-factory-service',
      version: '1.0.0',
      description: 'Dataset curation, labeling workflows, and training data management',
      documentation: '/docs',
      health: '/health',
    };
  });

  return app;
}

async function start(): Promise<void> {
  try {
    const app = await buildServer();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
      try {
        await app.close();
        await closePool();
        logger.info('Server shut down gracefully');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    await app.listen({ port: config.port, host: config.host });

    logger.info(
      { host: config.host, port: config.port },
      'Data Factory Service started'
    );
    logger.info(`API documentation available at http://localhost:${config.port}/docs`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if running directly
start();

export { buildServer, start };
