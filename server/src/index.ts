import http from "http";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";
import rootLogger from './config/logger';
import { getContext } from "./lib/auth.js";
import path from "path";
import { fileURLToPath } from "url";
// import WSPersistedQueriesMiddleware from "./graphql/middleware/wsPersistedQueries.js";
import { createApp } from "./app.js";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./graphql/schema.js";
import resolvers from "./graphql/resolvers/index.js";
import { DataRetentionService } from './services/DataRetentionService.js';
import { getNeo4jDriver } from './db/neo4j.js';
import { wireConductor, validateConductorEnvironment } from './bootstrap/conductor.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = rootLogger.child({ name: 'index' });

const startServer = async () => {
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
  const schema = makeExecutableSchema({ typeDefs, resolvers });
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
    server: httpServer as import("http").Server,
    path: "/graphql",
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

  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.resolve(__dirname, "../../client/dist");
    app.use(express.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  const { initSocket, _getIO } = await import("./realtime/socket.ts"); // JWT auth

  const port = Number(process.env.PORT || 4000);
  let conductorSystem: Awaited<ReturnType<typeof wireConductor>> = null;
  
  httpServer.listen(port, async () => {
    logger.info(`Server listening on port ${port}`);
    
    // Initialize and start Data Retention Service
    const neo4jDriver = getNeo4jDriver();
    const dataRetentionService = new DataRetentionService(neo4jDriver);
    dataRetentionService.startCleanupJob(); // Start the cleanup job

    // WAR-GAMED SIMULATION - Start Kafka Consumer
    await startKafkaConsumer();

    // Initialize Conductor system after core services are up
    try {
      conductorSystem = await wireConductor({ 
        app: app as any // Cast to Express type 
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
    if (process.env.NODE_ENV === "development") {
      setTimeout(async () => {
        try {
          const { createSampleData } = await import("./utils/sampleData.js");
          await createSampleData();
        } catch (_error) {
          void _error; // Mark as used to satisfy ESLint
          logger.warn("Failed to create sample data, continuing without it");
        }
      }, 2000); // Wait 2 seconds for connections to be established
    }
  });

  // Initialize Socket.IO
  const io = initSocket(httpServer);

  const { closeNeo4jDriver } = await import("./db/neo4j.js");
  const { closePostgresPool } = await import("./db/postgres.js");
  const { closeRedisClient } = await import("./db/redis.js");

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
    
    await Promise.allSettled([
      closeNeo4jDriver(),
      closePostgresPool(),
      closeRedisClient(),
    ]);
    httpServer.close((_err) => {
      if (_err) {
        logger.error(
          `Error during shutdown: ${_err instanceof Error ? _err.message : "Unknown error"}`,
        );
        process.exitCode = 1;
      }
      process.exit();
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();
