import http from 'http'
import { useServer } from 'graphql-ws/lib/use/ws'
import { WebSocketServer } from 'ws'
import pino from 'pino'
import { getContext } from './lib/auth.js'
import path from 'path';
import { fileURLToPath } from 'url';
import WSPersistedQueriesMiddleware from './graphql/middleware/wsPersistedQueries.js';
import { createApp } from './app.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { DataRetentionService } from './services/DataRetentionService.js'; // Import DataRetentionService
import { getNeo4jDriver } from './db/neo4j.js'; // Import getNeo4jDriver

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger: pino.Logger = pino();

const startServer = async () => {
  const app = await createApp();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const httpServer = http.createServer(app);

  // Subscriptions with Persisted Query validation

  const wss = new WebSocketServer({
    server: httpServer as import("http").Server,
    path: "/graphql",
  });

  const wsPersistedQueries = new WSPersistedQueriesMiddleware();
  const wsMiddleware = wsPersistedQueries.createMiddleware();

  useServer({
    schema,
    context: getContext,
    ...wsMiddleware,
  }, wss);

  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  const { initSocket, getIO } = await import('./realtime/socket.js'); // New import

  const port = Number(process.env.PORT || 4000)
          httpServer.listen(port, async () => {
            logger.info(`Server listening on port ${port}`);
            
            // Initialize and start Data Retention Service
            const neo4jDriver = getNeo4jDriver();
            const dataRetentionService = new DataRetentionService(neo4jDriver);
            dataRetentionService.startCleanupJob(); // Start the cleanup job

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
          })

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
    await Promise.allSettled([
      closeNeo4jDriver(),
      closePostgresPool(),
      closeRedisClient(),
    ]);
    httpServer.close(err => {
      if (err) { logger.error(`Error during shutdown: ${err instanceof Error ? err.message : 'Unknown error'}`); process.exitCode = 1 }
      process.exit();
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();
