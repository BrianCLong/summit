import http from 'http';
import express from 'express';
import { GraphQLError } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { getContext } from './lib/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { subscriptionEngine } from './graphql/subscriptionEngine.js';
import { DataRetentionService } from './services/DataRetentionService.js';
import { getNeo4jDriver, initializeNeo4jDriver, closeNeo4jDriver } from './db/neo4j.js';
import { closePostgresPool } from './db/postgres.js';
import { closeRedisClient } from './db/redis.js';
import { cfg } from './config.js';
import { startOTEL, stopOTEL } from '../otel.js';
import { startOSINTWorkers } from './services/OSINTQueueService.js';
import { BackupManager } from './backup/BackupManager.js';
import { checkNeo4jIndexes } from './db/indexManager.js';
import { bootstrapSecrets } from './bootstrap-secrets.js';
import { logger } from './config/logger.js';
import { logConfigSummary } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startServer = async () => {
  await startOTEL();

  // 1. Load Secrets (Environment or Vault)
  await bootstrapSecrets();

  // Log Config
  logConfigSummary();

  logger.info('Secrets loaded. Starting server...');

  // Optional Kafka consumer import - only when AI services enabled
  let startKafkaConsumer: any = null;
  let stopKafkaConsumer: any = null;
  if (
    process.env.AI_ENABLED === 'true' ||
    process.env.KAFKA_ENABLED === 'true'
  ) {
    try {
      const kafkaModule = await import('./realtime/kafkaConsumer.js');
      startKafkaConsumer = kafkaModule.startKafkaConsumer;
      stopKafkaConsumer = kafkaModule.stopKafkaConsumer;
    } catch (error) {
      logger.warn('Kafka not available - running in minimal mode');
    }
  }

  const app = await createApp();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const httpServer = http.createServer(app);

  await initializeNeo4jDriver();
  await checkNeo4jIndexes();

  const wss = new WebSocketServer({
    server: httpServer as import('http').Server,
    path: '/graphql',
  });

  useServer(
    {
      schema,
      context: async (ctx) => {
        const request = (ctx.extra as any).request ?? (ctx as any).extra;
        const baseContext = await getContext({ req: request });

        return {
          ...baseContext,
          connectionId: (ctx.extra as any).connectionId,
          pubsub: subscriptionEngine.getPubSub(),
          subscriptionEngine,
        };
      },
      onConnect: (ctx) => {
        const connectionId = randomUUID();
        (ctx.extra as any).connectionId = connectionId;
        subscriptionEngine.registerConnection(
          connectionId,
          (ctx.extra as any).socket,
        );
      },
      onDisconnect: (ctx) => {
        const connectionId = (ctx.extra as any).connectionId;
        subscriptionEngine.unregisterConnection(connectionId);
      },
    },
    wss,
  );

  const PORT = cfg.PORT || 4000;
  httpServer.listen(PORT, () => {
    logger.info(`Server ready at http://localhost:${PORT}/graphql`);
    logger.info(`Subscriptions ready at ws://localhost:${PORT}/graphql`);

    // Start background services
    startOSINTWorkers();

    if (startKafkaConsumer) {
      startKafkaConsumer();
    }
  });

  const shutdown = async () => {
    logger.info('Shutting down server...');
    if (stopKafkaConsumer) await stopKafkaConsumer();
    await Promise.allSettled([
      closeNeo4jDriver(),
      closePostgresPool(),
      closeRedisClient(),
      stopOTEL(),
    ]);
    httpServer.close((err) => {
      if (err) {
        logger.error(
          `Error during shutdown: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        process.exitCode = 1;
      }
      process.exit();
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
