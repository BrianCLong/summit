import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { auditLogger } from './middleware/audit-logger.js';
import { correlationIdMiddleware } from './middleware/correlation-id.js';
import monitoringRouter from './routes/monitoring.js';
import aiRouter from './routes/ai.js';
import nlGraphQueryRouter from './routes/nl-graph-query.js';
import disclosuresRouter from './routes/disclosures.js';
import narrativeSimulationRouter from './routes/narrative-sim.js';
import { metricsRoute } from './http/metricsRoute.js';
import rbacRouter from './routes/rbacRoutes.js';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { getContext } from './lib/auth.js';
import { getNeo4jDriver } from './db/neo4j.js';
import { initializeTracing, getTracer } from './observability/tracer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import { startTrustWorker } from './workers/trustScoreWorker.js';
import { startRetentionWorker } from './workers/retentionWorker.js';
import { cfg } from './config.js';
import webhookRouter from './routes/webhooks.js';
import { webhookWorker } from './webhooks/webhook.worker.js';
import githubIntegrationsRouter from './routes/github-integrations.js';

export const createApp = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Initialize OpenTelemetry tracing
  const tracer = initializeTracing();
  await tracer.initialize();

  const app = express();
  const logger = pino();

  // Add correlation ID middleware FIRST (before other middleware)
  app.use(correlationIdMiddleware);

  app.use(helmet());
  const allowedOrigins = cfg.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || cfg.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by Summit CORS policy`));
      },
      credentials: true,
    }),
  );

  // Enhanced Pino HTTP logger with correlation and trace context
  app.use(
    pinoHttp({
      logger,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      customProps: (req: any) => ({
        correlationId: req.correlationId,
        traceId: req.traceId,
        spanId: req.spanId,
        userId: req.user?.sub || req.user?.id,
        tenantId: req.user?.tenant_id,
      }),
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(auditLogger);

  // Health endpoints (exempt from rate limiting)
  const healthRouter = (await import('./routes/health.js')).default;
  app.use(healthRouter);

  // Other routes (exempt from rate limiting)
  app.use('/monitoring', monitoringRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/ai/nl-graph-query', nlGraphQueryRouter);
  app.use('/api/narrative-sim', narrativeSimulationRouter);
  app.use('/disclosures', disclosuresRouter);
  app.use('/rbac', rbacRouter);
  app.use('/api/webhooks', webhookRouter);
  app.use('/api/integrations/github', githubIntegrationsRouter);
  app.get('/metrics', metricsRoute);
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.RATE_LIMIT_MAX || 600),
      message: { error: 'Too many requests, please try again later' },
    }),
  );

  app.get('/search/evidence', async (req, res) => {
    const { q, skip = 0, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).send({ error: "Query parameter 'q' is required" });
    }

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      const searchQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node, score
        RETURN node, score
        SKIP $skip
        LIMIT $limit
      `;

      const countQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node
        RETURN count(node) as total
      `;

      const [searchResult, countResult] = await Promise.all([
        session.run(searchQuery, {
          query: q,
          skip: Number(skip),
          limit: Number(limit),
        }),
        session.run(countQuery, { query: q }),
      ]);

      const evidence = searchResult.records.map((record) => ({
        node: record.get('node').properties,
        score: record.get('score'),
      }));

      const total = countResult.records[0].get('total').toNumber();

      res.send({
        data: evidence,
        metadata: {
          total,
          skip: Number(skip),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
          currentPage: Math.floor(Number(skip) / Number(limit)) + 1,
        },
      });
    } catch (error) {
      logger.error(
        `Error in search/evidence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      res.status(500).send({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  });

  const schema = makeExecutableSchema({
    typeDefs: typeDefs as any,
    resolvers: resolvers as any,
  });

  // GraphQL over HTTP
  const { persistedQueriesPlugin } = await import(
    './graphql/plugins/persistedQueries.js'
  );
  const { default: pbacPlugin } = await import('./graphql/plugins/pbac.js');
  const { default: resolverMetricsPlugin } = await import(
    './graphql/plugins/resolverMetrics.js'
  );
  const { default: auditLoggerPlugin } = await import(
    './graphql/plugins/auditLogger.js'
  );
  const { depthLimit } = await import('./graphql/validation/depthLimit.js');

  const apollo = new ApolloServer({
    schema,
    // Security plugins - Order matters for execution lifecycle
    plugins: [
      persistedQueriesPlugin as any,
      resolverMetricsPlugin as any,
      auditLoggerPlugin as any,
      // Enable PBAC in production
      ...(cfg.NODE_ENV === 'production' ? [pbacPlugin() as any] : []),
    ],
    // Security configuration based on environment
    introspection: cfg.NODE_ENV !== 'production',
    // Enhanced query validation rules
    validationRules: [
      depthLimit(cfg.NODE_ENV === 'production' ? 6 : 8), // Stricter in prod
    ],
    // Security context
    formatError: (err) => {
      // Don't expose internal errors in production
      if (cfg.NODE_ENV === 'production') {
        logger.error(
          { err, stack: (err as any).stack },
          `GraphQL Error: ${err.message}`,
        );
        return new Error('Internal server error');
      }
      return err as any;
    },
  });
  await apollo.start();

  // Production Authentication - Use proper JWT validation
  const {
    productionAuthMiddleware,
    applyProductionSecurity,
  } = await import('./config/production-security.js');

  // Apply security middleware based on environment
  if (cfg.NODE_ENV === 'production') {
    applyProductionSecurity(app);
  }

  const authenticateToken =
    cfg.NODE_ENV === 'production'
      ? productionAuthMiddleware
      : (req: Request, res: Response, next: NextFunction) => {
          // Development mode - relaxed auth for easier testing
          const authHeader = req.headers['authorization'];
          const token = authHeader && authHeader.split(' ')[1];

          if (!token) {
            console.warn('Development: No token provided, allowing request');
            (req as any).user = {
              sub: 'dev-user',
              email: 'dev@intelgraph.local',
              role: 'admin',
            };
          }
          next();
        };

  app.use(
    '/graphql',
    express.json(),
    authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
    expressMiddleware(apollo, { context: getContext }),
  );

  // Start background trust worker if enabled
  startTrustWorker();
  // Start retention worker if enabled
  startRetentionWorker();

  // Ensure webhook worker is running (it's an auto-starting worker, but importing it ensures it's registered)
  // In a real production setup, this might be in a separate process/container.
  // For MVP/Monolith, we keep it here.
  if (webhookWorker) {
      // Just referencing it to prevent tree-shaking/unused variable lint errors if any,
      // though import side-effects usually suffice.
  }

  return app;
};
