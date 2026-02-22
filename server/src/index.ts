import http from 'http';
import express from 'express';
import { GraphQLError } from 'graphql';
// @ts-ignore
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { VoiceGateway } from './gateways/VoiceGateway.ts';
import pino from 'pino';
import { getContext } from './lib/auth.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schema.ts';
import resolvers from './graphql/resolvers/index.ts';
import { subscriptionEngine } from './graphql/subscriptionEngine.ts';
import { DataRetentionService } from './services/DataRetentionService.ts';
import { getNeo4jDriver, initializeNeo4jDriver } from './db/neo4j.ts';
import { cfg } from './config.ts';
import { initializeTracing, getTracer } from './observability/tracer.ts';
import { streamingRateLimiter } from './routes/streaming.ts';
import { startOSINTWorkers } from './services/OSINTQueueService.ts';
import { ingestionService } from './services/IngestionService.ts';
import { BackupManager } from './backup/BackupManager.ts';
import { checkNeo4jIndexes } from './db/indexManager.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { bootstrapSecrets } from './bootstrap-secrets.ts';
import { logger } from './config/logger.ts';
import { createApp } from './app.ts';
import './monitoring/metrics.ts'; // Initialize Prometheus metrics collection
import { partitionMaintenanceService } from './services/PartitionMaintenanceService.ts';

const startServer = async () => {
  // Initialize OpenTelemetry tracing early in the startup sequence
  const tracer = initializeTracing();
  await tracer.initialize();

  // Optional Kafka consumer import - only when AI services enabled
  let startKafkaConsumer: any = null;
  let stopKafkaConsumer: any = null;
  if (
    process.env.AI_ENABLED === 'true' ||
    process.env.KAFKA_ENABLED === 'true'
  ) {
    try {
      const kafkaModule = await import('./realtime/kafkaConsumer.ts');
      startKafkaConsumer = kafkaModule.startKafkaConsumer;
      stopKafkaConsumer = kafkaModule.stopKafkaConsumer;
    } catch (error: any) {
      logger.warn('Kafka not available - running in minimal mode');
    }
  }

  // 1. Load Secrets (Environment or Vault)
  await bootstrapSecrets();

  // Log Config


  const app = await createApp();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const httpServer = http.createServer(app);

  await initializeNeo4jDriver();

  // Subscriptions with Persisted Query validation

  const wss = new WebSocketServer({
    server: httpServer as import('http').Server,
    path: '/graphql',
  });

  const voiceWss = new WebSocketServer({
    server: httpServer as import('http').Server,
    path: '/speak',
  });
  new VoiceGateway(voiceWss);

  useServer(
    {
      schema,
      context: async (ctx: any) => {
        const request = (ctx.extra as any).request ?? (ctx as any).extra;
        const baseContext = await getContext({ req: request });

        return {
          ...baseContext,
          connectionId: (ctx.extra as any).connectionId,
          pubsub: subscriptionEngine.getPubSub(),
          subscriptionEngine,
        };
      },
      onConnect: (ctx: any) => {
        const connectionId = randomUUID();
        (ctx.extra as any).connectionId = connectionId;
        subscriptionEngine.registerConnection(
          connectionId,
          (ctx.extra as any).socket,
        );
      },
      onSubscribe: (ctx: any, msg: any) => {
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
      onNext: (ctx: any) => {
        const startedAt =
          (ctx.extra as any).lastFanoutStart ?? process.hrtime.bigint();
        subscriptionEngine.recordFanout(startedAt);
        (ctx.extra as any).lastFanoutStart = process.hrtime.bigint();
      },
      onComplete: (ctx: any, msg: any) => {
        const connectionId = (ctx.extra as any).connectionId;
        if (connectionId) {
          subscriptionEngine.completeSubscription(connectionId, msg?.id);
        }
      },
      onError: (ctx: any, msg: any, errors: any) => {
        logger.error(
          { errors, operationId: msg?.id, connectionId: (ctx.extra as any).connectionId },
          'GraphQL WS subscription error',
        );
      },
      onClose: (ctx: any) => {
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

  const { initSocket, getIO } = await import('./realtime/socket.ts'); // JWT auth

  const port = Number(cfg.PORT || 4000);
  httpServer.listen(port, async () => {
    logger.info(`Server listening on port ${port}`);

    // Initialize and start Data Retention Service
    const neo4jDriver = getNeo4jDriver();
    const dataRetentionService = new DataRetentionService(neo4jDriver);
    dataRetentionService.startCleanupJob(); // Start the cleanup job

    // Start OSINT Workers
    startOSINTWorkers();

    // Initialize Backup Manager
    const backupManager = new BackupManager();
    backupManager.startScheduler();

    // Start Policy Watcher (WS-2)
    const { PolicyWatcher } = await import('./services/governance/PolicyWatcher.ts');
    const policyWatcher = PolicyWatcher.getInstance();
    policyWatcher.start();

    // Start GA Core Metrics Service
    const { gaCoreMetrics } = await import('./services/GACoremetricsService.ts');
    gaCoreMetrics.start();

    // Check Neo4j Indexes
    checkNeo4jIndexes().catch(err => logger.error('Failed to run initial index check', err));

    // Start Partition Maintenance Service
    partitionMaintenanceService.start();

    // WAR-GAMED SIMULATION - Start Kafka Consumer
    await startKafkaConsumer();

    // Create sample data for development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        try {
          const { createSampleData } = await import('./utils/sampleData.ts');
          await createSampleData();
        } catch (error: any) {
          logger.warn('Failed to create sample data, continuing without it');
        }
      }, 2000); // Wait 2 seconds for connections to be established
    }
  });

  // Initialize Socket.IO
  const io = initSocket(httpServer);

  const { closeNeo4jDriver } = await import('./db/neo4j.ts');
  const { closePostgresPool } = await import('./db/postgres.ts');
  const { closeRedisClient } = await import('./db/redis.ts');

  // Graceful shutdown
  const shutdown = async (sig: NodeJS.Signals) => {
    logger.info(`Shutting down. Signal: ${sig}`);
    // Stop Policy Watcher
    const { PolicyWatcher } = await import('./services/governance/PolicyWatcher.ts');
    PolicyWatcher.getInstance().stop();

    partitionMaintenanceService.stop();

    wss.close();
    io.close(); // Close Socket.IO server
    streamingRateLimiter.destroy();
    if (stopKafkaConsumer) {
      await stopKafkaConsumer();
    } // WAR-GAMED SIMULATION - Stop Kafka Consumer

    // Shutdown OpenTelemetry
    await getTracer().shutdown();

    await Promise.allSettled([
      closeNeo4jDriver(),
      closePostgresPool(),
      closeRedisClient(),
    ]);
    httpServer.close((err: any) => {
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

startServer().catch((err: any) => {
  logger.error(`Fatal error during startup: ${err}`);
  process.exit(1);
});
