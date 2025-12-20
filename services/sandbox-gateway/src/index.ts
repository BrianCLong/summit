import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pinoHttp from 'pino-http';
import { resolvers } from './graphql/resolvers.js';
import { GraphQLContext } from './graphql/types.js';
import { authMiddleware, rateLimit } from './middleware/auth.js';
import { metrics, registry } from './metrics/index.js';
import { createLogger, logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const requestLogger = createLogger('Request');

// Load GraphQL schema
const typeDefs = readFileSync(
  join(__dirname, 'graphql', 'schema.graphql'),
  'utf-8'
);

// Configuration
const PORT = parseInt(process.env.PORT || '4100', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  }));
  app.use(compression());
  app.use(cors({
    origin: NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : '*',
    credentials: true,
  }));

  // Request logging
  app.use(pinoHttp({
    logger: logger as any,
    autoLogging: NODE_ENV === 'production',
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }));

  // Health check endpoints (before auth)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.get('/health/ready', async (req, res) => {
    // Check dependencies
    const checks = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        graphql: 'ok',
        // Would add actual dependency checks here
      },
    };
    res.json(checks);
  });

  app.get('/health/live', (req, res) => {
    res.json({ status: 'live', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Rate limiting
  app.use('/graphql', rateLimit({ windowMs: 60000, max: 1000 }));

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      }),
      // Custom plugin for metrics
      {
        async requestDidStart() {
          const startTime = Date.now();
          return {
            async willSendResponse(requestContext) {
              const duration = (Date.now() - startTime) / 1000;
              metrics.httpRequestDuration.observe(
                { method: 'POST', path: '/graphql', status: '200' },
                duration
              );
              metrics.httpRequestsTotal.inc({
                method: 'POST',
                path: '/graphql',
                status: '200',
              });
            },
            async didEncounterErrors(requestContext) {
              metrics.httpRequestsTotal.inc({
                method: 'POST',
                path: '/graphql',
                status: '500',
              });
            },
          };
        },
      },
    ],
    introspection: NODE_ENV !== 'production',
    formatError: (formattedError, error) => {
      // Log errors
      requestLogger.error('GraphQL Error', {
        message: formattedError.message,
        path: formattedError.path,
        extensions: formattedError.extensions,
      });

      // Hide internal errors in production
      if (NODE_ENV === 'production' && !formattedError.extensions?.code) {
        return {
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }

      return formattedError;
    },
  });

  await server.start();

  // GraphQL endpoint with auth
  app.use(
    '/graphql',
    authMiddleware,
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => {
        return {
          user: req.user!,
          requestId: req.requestId!,
          startTime: Date.now(),
        };
      },
    })
  );

  // REST API endpoints for simpler operations
  app.get('/api/v1/sandboxes', authMiddleware, async (req, res) => {
    try {
      // Would call resolver directly
      res.json({ sandboxes: [], total: 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list sandboxes' });
    }
  });

  app.get('/api/v1/sandboxes/:id', authMiddleware, async (req, res) => {
    try {
      res.json({ sandbox: null });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sandbox' });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    requestLogger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      requestId: req.requestId,
    });
    res.status(500).json({
      error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  // Start server
  await new Promise<void>((resolve) => {
    httpServer.listen({ port: PORT, host: HOST }, resolve);
  });

  logger.info(`🚀 Sandbox Gateway ready`, {
    graphql: `http://${HOST}:${PORT}/graphql`,
    health: `http://${HOST}:${PORT}/health`,
    metrics: `http://${HOST}:${PORT}/metrics`,
    environment: NODE_ENV,
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await server.stop();
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
