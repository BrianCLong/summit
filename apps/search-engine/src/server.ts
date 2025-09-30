import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger, format, transports } from 'winston';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import searchRoutes from './routes/searchRoutes';
import { ElasticsearchService } from './services/ElasticsearchService';
import { typeDefs } from './graphql/schema';
import { resolvers, type SearchContext, type AuthContext } from './graphql/resolvers';
import { searchPolicyClient } from './policy/searchPolicyClient';

const app = express();
const port = process.env.PORT || 4006;

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({
      filename: 'logs/search-engine-error.log',
      level: 'error',
    }),
    new transports.File({
      filename: 'logs/search-engine.log',
    }),
  ],
});

const postgresPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'intelgraph',
  user: process.env.POSTGRES_USER || 'intelgraph',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'),
  {
    encrypted: process.env.NODE_ENV === 'production' ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
    maxConnectionPoolSize: 20,
  },
);

const elasticsearchService = new ElasticsearchService();

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

let httpServer: http.Server | null = null;

function parseHeaderList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .join(',')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAuthContext(req: express.Request): AuthContext {
  const tenantHeader = (req.headers['x-tenant-id'] as string | undefined) || undefined;
  const bodyTenant = (req.body?.variables?.input?.tenantId as string | undefined) || undefined;
  const tenantId = tenantHeader || bodyTenant;

  return {
    tenantId,
    userId: (req.headers['x-user-id'] as string | undefined) || undefined,
    roles: parseHeaderList(req.headers['x-user-roles'] as string | string[] | undefined),
    allowedNodeTypes: parseHeaderList(
      req.headers['x-allowed-node-types'] as string | string[] | undefined,
    ),
  };
}

const buildContext = async ({ req }: { req: express.Request }): Promise<SearchContext> => ({
  postgres: postgresPool,
  neo4j: neo4jDriver,
  elastic: elasticsearchService,
  opa: searchPolicyClient,
  logger,
  auth: buildAuthContext(req),
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

app.use(compression());

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalRateLimit);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'search-engine',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(
    `
# HELP search_engine_requests_total Total number of HTTP requests
# TYPE search_engine_requests_total counter
search_engine_requests_total 1

# HELP search_engine_response_time_seconds Response time in seconds
# TYPE search_engine_response_time_seconds histogram
search_engine_response_time_seconds_bucket{le="0.1"} 0
search_engine_response_time_seconds_bucket{le="0.5"} 1
search_engine_response_time_seconds_bucket{le="1.0"} 1
search_engine_response_time_seconds_bucket{le="+Inf"} 1
search_engine_response_time_seconds_sum 0.05
search_engine_response_time_seconds_count 1

# HELP search_engine_uptime_seconds Service uptime in seconds
# TYPE search_engine_uptime_seconds gauge
search_engine_uptime_seconds ${process.uptime()}
  `.trim(),
  );
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

async function startServer() {
  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: buildContext,
    }),
  );

  app.use('/api/search', searchRoutes);

  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method,
    });
  });

  httpServer = app.listen(port, () => {
    logger.info(`🔍 Search Engine service started`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      elasticsearch: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });
  });
}

startServer().catch((error) => {
  logger.error('Failed to start search engine service', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  try {
    await apolloServer.stop();

    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await postgresPool.end();
    await neo4jDriver.close();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: (error as Error).message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

export default app;
