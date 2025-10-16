import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { typeDefs, resolvers } from './graphql/schema.js';
import { createContext } from './auth/context.js';
import { setupIngest } from './ingest/http.js';
import { startKafkaConsumer } from './ingest/kafka.js';
import { initializeDatabase } from './db/neo4j.js';
import { initializePostgres } from './db/pg.js';
import { initializeRedis } from './cache/redis.js';
import { setupObservability } from './observability/metrics.js';
import { logger } from './observability/logger.js';
import { startMaterializer } from './services/materializer.js';
import { config } from '../config/environment.js';

const PORT = config.PORT || 4000;
const GRAPHQL_PATH = '/graphql';

async function startServer() {
  try {
    // Initialize infrastructure
    logger.info('Initializing V24 Global Coherence Ecosystem...');

    await initializeDatabase();
    await initializePostgres();
    await initializeRedis();

    // Setup observability
    setupObservability();

    // Create HTTP server
    const app = express();
    const httpServer = http.createServer(app);

    // Security middleware
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false,
      }),
    );

    app.use(compression());
    app.use(
      cors({
        origin: config.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
      }),
    );

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Setup WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: GRAPHQL_PATH,
    });

    const serverCleanup = useServer(
      {
        schema: { typeDefs, resolvers },
        context: createContext,
      },
      wsServer,
    );

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await serverCleanup.dispose();
              },
            };
          },
        },
      ],
      formatError: (err) => {
        logger.error('GraphQL Error', { error: err.message, stack: err.stack });
        return {
          message: err.message,
          code: err.extensions?.code || 'INTERNAL_ERROR',
          path: err.path,
        };
      },
      introspection: config.NODE_ENV !== 'production',
      includeStacktraceInErrorResponses: config.NODE_ENV !== 'production',
    });

    await server.start();

    // Setup GraphQL endpoint
    app.use(
      GRAPHQL_PATH,
      expressMiddleware(server, {
        context: createContext,
      }),
    );

    // Setup coherence signal ingest endpoints
    setupIngest(app);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: config.APP_VERSION || '1.0.0',
        service: 'v24-coherence-ecosystem',
      });
    });

    // Start background services
    if (config.KAFKA_ENABLED === 'true') {
      startKafkaConsumer();
    }

    // Start materialization service
    startMaterializer();

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(
        `🚀 V24 Global Coherence Ecosystem ready at http://localhost:${PORT}${GRAPHQL_PATH}`,
      );
      logger.info(
        `🔌 WebSocket subscriptions ready at ws://localhost:${PORT}${GRAPHQL_PATH}`,
      );
      logger.info(
        `📊 Health check available at http://localhost:${PORT}/health`,
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
