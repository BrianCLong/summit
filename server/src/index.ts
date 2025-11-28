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
// import WSPersistedQueriesMiddleware from "./graphql/middleware/wsPersistedQueries.js";
import { createApp } from './app.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { subscriptionEngine } from './graphql/subscriptionEngine.js';
import { DataRetentionService } from './services/DataRetentionService.js';
import { getNeo4jDriver, initializeNeo4jDriver } from './db/neo4j.js';
import { cfg } from './config.js';
import { streamingRateLimiter } from './routes/streaming.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger: pino.Logger = pino();

const startServer = async () => {
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

  // Subscriptions with Persisted Query validation

  const wss = new WebSocketServer({
    server: httpServer as import('http').Server,
    path: '/graphql',
  });

  // const wsPersistedQueries = new WSPersistedQueriesMiddleware();
  // const wsMiddleware = wsPersistedQueries.createMiddleware();

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
      onSubscribe: (ctx, msg) => {
        const socket = (ctx.extra as any).socket;
        if (!subscriptionEngine.enforceBackpressure(socket)) {
          return [new GraphQLError('Backpressure threshold exceeded')];
        }
        const connectionId = (ctx.extra as any).connectionId;
        if (connectionId) {
          subscriptionEngine.trackSubscription(connectionId, msg.id);
        }
        (ctx.extra as any).lastFanoutStart = process.hrtime.bigint();
      },
      onNext: (ctx) => {
        const startedAt =
          (ctx.extra as any).lastFanoutStart ?? process.hrtime.bigint();
        subscriptionEngine.recordFanout(startedAt);
        (ctx.extra as any).lastFanoutStart = process.hrtime.bigint();
      },
      onComplete: (ctx, msg) => {
        const connectionId = (ctx.extra as any).connectionId;
        if (connectionId) {
          subscriptionEngine.completeSubscription(connectionId, msg?.id);
        }
      },
      onError: (ctx, msg, errors) => {
        logger.error(
          { errors, operationId: msg?.id, connectionId: (ctx.extra as any).connectionId },
          'GraphQL WS subscription error',
        );
      },
      onClose: (ctx) => {
        const connectionId = (ctx.extra as any).connectionId;
        if (connectionId) {
          subscriptionEngine.unregisterConnection(connectionId);
        }
      },
      // ...wsMiddleware,
    },
    wss,
  );

  if (cfg.NODE_ENV === 'production') {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  const { initSocket, getIO } = await import('./realtime/socket.js'); // JWT auth

  const port = Number(cfg.PORT || 4000);
  httpServer.listen(port, async () => {
    logger.info(`Server listening on port ${port}`);

    // Initialize and start Data Retention Service
    const neo4jDriver = getNeo4jDriver();
    const dataRetentionService = new DataRetentionService(neo4jDriver);
    dataRetentionService.startCleanupJob(); // Start the cleanup job

    // WAR-GAMED SIMULATION - Start Kafka Consumer
    await startKafkaConsumer();

    // Create sample data for development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        try {
          const { createSampleData } = await import('./utils/sampleData.js');
          await createSampleData();
        } catch (error) {
          logger.warn('Failed to create sample data, continuing without it');
        }
      }, 2000); // Wait 2 seconds for connections to be established
    }
  });

  // Initialize Socket.IO
  const io = initSocket(httpServer);

  const { closeNeo4jDriver } = await import('./db/neo4j.js');
  const { closePostgresPool } = await import('./db/postgres.js');
  const { closeRedisClient } = await import('./db/redis.js');

  // Graceful shutdown
  const shutdown = async (sig: NodeJS.Signals) => {
    logger.info(`Shutting down. Signal: ${sig}`);
    wss.close();
    io.close(); // Close Socket.IO server
    streamingRateLimiter.destroy();
    if (stopKafkaConsumer) await stopKafkaConsumer(); // WAR-GAMED SIMULATION - Stop Kafka Consumer
    await Promise.allSettled([
      closeNeo4jDriver(),
      closePostgresPool(),
      closeRedisClient(),
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
