import http from 'http';
import express from 'express';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import rootLogger from './config/logger';
import { getContext } from './lib/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
// import WSPersistedQueriesMiddleware from "./graphql/middleware/wsPersistedQueries.js";
import { createApp } from './app.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { recipeResolvers } from './graphql/recipes/resolvers.js';
import { integrationsResolvers } from './graphql/integrations/resolvers.js';
import { toolsResolvers } from './graphql/tools/resolvers.js';
import { conductorResolvers } from './graphql/conductor/resolvers.js';
import { disclosureResolvers } from './graphql/disclosure/resolvers.js';
import { searchResolvers } from './graphql/search/resolvers.js';
import { DataRetentionService } from './services/DataRetentionService.js';
import { getNeo4jDriver } from './db/neo4j.js';
import { wireConductor, validateConductorEnvironment } from './bootstrap/conductor.js';
import { startTemporalWorker } from './temporal/index.js';
import { setTemporalHandle } from './temporal/control.js';
import { startSchedulerLoop } from './conductor/scheduler.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = rootLogger.child({ name: 'index' });

const startServer = async () => {
  // Initialize database connections first
  try {
    const { connectNeo4j, connectPostgres, connectRedis } = await import('./config/database.js');
    await Promise.allSettled([connectNeo4j(), connectPostgres(), connectRedis()]);
    logger.info('Database connections initialized');
  } catch (error) {
    logger.warn('Some database connections failed - proceeding with available services', { error });
  }

  // Optional Kafka consumer import - only when AI services enabled
  let startKafkaConsumer: any = null;
  let stopKafkaConsumer: any = null;
  if (process.env.AI_ENABLED === 'true' || process.env.KAFKA_ENABLED === 'true') {
    try {
      const kafkaModule = await import('./realtime/kafkaConsumer.js');
      startKafkaConsumer = kafkaModule.startKafkaConsumer;
      stopKafkaConsumer = kafkaModule.stopKafkaConsumer;
    } catch (_error) {
      void _error; // Mark as used to satisfy ESLint
      logger.warn('Kafka not available - running in minimal mode');
    }
  }
  const app = await createApp();
  try {
    const { tenantAllowlist } = await import('./middleware/tenantAllowlist.ts');
    const allowed = (process.env.ALLOWED_TENANTS || "").split(',').filter(Boolean);
    if (allowed.length) (app as any).use(tenantAllowlist(allowed, (process.env.DEPLOY_MODE as any) || "staging"));
  } catch {}
  try {
    const usageRouter = (await import('./routes/usage.ts')).default;
    (app as any).use('/api/billing', usageRouter);
  } catch {}
  try {
    const marketplaceRouter = (await import('./routes/marketplace.ts')).default;
    (app as any).use('/api/plugins', marketplaceRouter);
  } catch {}
  try {
    const gitopsRouter = (await import('./routes/gitops.ts')).default;
    (app as any).use('/api/gitops', gitopsRouter);
  } catch {}
  try {
    const backfillRouter = (await import('./routes/backfill.ts')).default;
    (app as any).use('/api/backfill', backfillRouter);
  } catch {}
  try {
    const complianceRouter = (await import('./routes/compliance.ts')).default;
    (app as any).use('/api/compliance', complianceRouter);
  } catch {}
  let extraSchema = '';
  try {
    extraSchema = readFileSync(path.resolve(__dirname, './graphql/recipes/schema.gql'), 'utf8');
  } catch {}
  let integrationsSchema = '';
  try {
    integrationsSchema = readFileSync(path.resolve(__dirname, './graphql/integrations/schema.gql'), 'utf8');
  } catch {}
  let conductorSchema = '';
  let toolsSchema = '';
  let disclosureSchema = '';
  let searchSchema = '';
  let saasSchema = '';

  try {
    conductorSchema = readFileSync(path.resolve(__dirname, './graphql/conductor/schema.gql'), 'utf8');
  } catch {}
  try {
    toolsSchema = readFileSync(path.resolve(__dirname, './graphql/tools/schema.gql'), 'utf8');
  } catch {}
  try {
    disclosureSchema = readFileSync(path.resolve(__dirname, './graphql/disclosure/schema.gql'), 'utf8');
  } catch {}
  try {
    searchSchema = readFileSync(path.resolve(__dirname, './graphql/search/schema.gql'), 'utf8');
  } catch {}
  try {
    saasSchema = readFileSync(path.resolve(__dirname, './graphql/saas/schema.gql'), 'utf8');
  } catch {}
  const mergedResolvers: any = {
    ...resolvers,
    Query: { ...(resolvers as any).Query, ...integrationsResolvers.Query },
    Mutation: { ...(resolvers as any).Mutation, ...recipeResolvers.Mutation, ...conductorResolvers.Mutation },
  };
  mergedResolvers.Query = { ...mergedResolvers.Query, ...toolsResolvers.Query };
  mergedResolvers.Query = { ...mergedResolvers.Query, ...(disclosureResolvers as any).Query };
  mergedResolvers.Mutation = { ...mergedResolvers.Mutation, ...(disclosureResolvers as any).Mutation };
  mergedResolvers.Query = { ...mergedResolvers.Query, ...(searchResolvers as any).Query };
  try {
    const { saasResolvers } = await import('./graphql/saas/resolvers.ts');
    mergedResolvers.Query = { ...mergedResolvers.Query, ...(saasResolvers as any).Query };
    mergedResolvers.Mutation = { ...mergedResolvers.Mutation, ...(saasResolvers as any).Mutation };
  } catch {}
  const schema = makeExecutableSchema({ typeDefs: [typeDefs, extraSchema, integrationsSchema, conductorSchema, toolsSchema, disclosureSchema, searchSchema, saasSchema], resolvers: mergedResolvers });
  const httpServer = http.createServer(app);

  // Validate Conductor environment early
  if (process.env.CONDUCTOR_ENABLED === 'true') {
    const envCheck = validateConductorEnvironment();
    if (!envCheck.valid) {
      logger.error('Conductor environment validation failed', { errors: envCheck.errors });
      if (process.env.CONDUCTOR_REQUIRED === 'true') {
        process.exit(1);
      }
    }
    if (envCheck.warnings.length > 0) {
      logger.warn('Conductor environment warnings', { warnings: envCheck.warnings });
    }
  }

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
      context: getContext,
      // ...wsMiddleware,
    },
    wss,
  );

  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  const { initSocket, _getIO } = await import('./realtime/socket.ts'); // JWT auth

  const port = Number(process.env.PORT || 4000);
  let conductorSystem: Awaited<ReturnType<typeof wireConductor>> = null;
  let temporalHandle: Awaited<ReturnType<typeof startTemporalWorker>> | null = null;
  let schedulerHandle: { stop: () => void } | null = null;

  httpServer.listen(port, async () => {
    logger.info(`Server listening on port ${port}`);
    // Start Temporal worker if enabled (lazy/no-op otherwise)
    temporalHandle = await startTemporalWorker();
    try { setTemporalHandle(temporalHandle); } catch {}
    if (process.env.SCHEDULER_ENABLED === 'true') {
      schedulerHandle = startSchedulerLoop();
    }

    // Initialize and start Data Retention Service
    const neo4jDriver = getNeo4jDriver();
    const dataRetentionService = new DataRetentionService(neo4jDriver);
    dataRetentionService.startCleanupJob(); // Start the cleanup job

    // WAR-GAMED SIMULATION - Start Kafka Consumer
    await startKafkaConsumer();

    // Initialize Conductor system after core services are up
    try {
      conductorSystem = await wireConductor({
        app: app as any, // Cast to Express type
      });
      if (conductorSystem) {
        logger.info('Conductor system initialized successfully');
      }
    } catch (_error) {
      logger.error('Failed to initialize Conductor system:', _error);
      if (process.env.CONDUCTOR_REQUIRED === 'true') {
        process.exit(1);
      }
    }

    // Create sample data for development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        try {
          const { createSampleData } = await import('./utils/sampleData.js');
          await createSampleData();
        } catch (_error) {
          void _error; // Mark as used to satisfy ESLint
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
    if (stopKafkaConsumer) await stopKafkaConsumer(); // WAR-GAMED SIMULATION - Stop Kafka Consumer

    // Shutdown Conductor system
    if (conductorSystem?.shutdown) {
      try {
        await conductorSystem.shutdown();
      } catch (_error) {
        logger.error('Error shutting down Conductor:', _error);
      }
    }

    await Promise.allSettled([closeNeo4jDriver(), closePostgresPool(), closeRedisClient()]);
    try { schedulerHandle?.stop(); } catch {}
    httpServer.close((_err) => {
      if (_err) {
        logger.error(
          `Error during shutdown: ${_err instanceof Error ? _err.message : 'Unknown error'}`,
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
    // Stop Temporal worker if running
    try { await temporalHandle?.stop(); } catch {}
