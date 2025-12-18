/**
 * Entity Resolution Service - Main Entry Point
 *
 * Starts the ER service with HTTP API, event bus, and batch processor.
 */

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { apiRouter } from './api/routes.js';
import { initializeDatabase, type DatabaseConfig } from './db/connection.js';
import { initializeEventBus, type EventBusConfig } from './events/EventBus.js';
import { batchProcessor } from './batch/BatchProcessor.js';

const logger = pino({ name: 'er-service' });

export interface ServiceConfig {
  port: number;
  database: DatabaseConfig;
  kafka: EventBusConfig;
  enableBatchWorker: boolean;
}

function loadConfig(): ServiceConfig {
  return {
    port: parseInt(process.env.ER_SERVICE_PORT ?? '8090', 10),
    database: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'intelgraph',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10),
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID ?? 'er-service',
      topic: process.env.KAFKA_TOPIC ?? 'er-events',
    },
    enableBatchWorker: process.env.ENABLE_BATCH_WORKER !== 'false',
  };
}

export async function createApp(config: ServiceConfig): Promise<express.Application> {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(pinoHttp({ logger }));

  // CORS for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Routes
  app.use(apiRouter);

  return app;
}

export async function start(): Promise<void> {
  const config = loadConfig();

  logger.info({ port: config.port }, 'Starting ER service');

  try {
    // Initialize database
    const db = initializeDatabase(config.database);
    await db.initialize();
    logger.info('Database connection established');

    // Initialize event bus
    const eventBus = initializeEventBus(config.kafka);
    await eventBus.connect();
    logger.info('Event bus connected');

    // Start batch worker if enabled
    if (config.enableBatchWorker) {
      await batchProcessor.start();
      logger.info('Batch processor started');
    }

    // Create and start HTTP server
    const app = await createApp(config);
    const server = app.listen(config.port, () => {
      logger.info({ port: config.port }, 'ER service listening');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        try {
          if (config.enableBatchWorker) {
            await batchProcessor.stop();
          }
          await eventBus.disconnect();
          await db.close();
          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start ER service');
    process.exit(1);
  }
}

// Start if running directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  start();
}
