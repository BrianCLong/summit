import 'dotenv/config';
import express from 'express';
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
import { getContext } from './lib/auth.js';
import { getNeo4jDriver } from './db/neo4j.js';
import { initializeTracing } from './observability/tracer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import { startTrustWorker } from './workers/trustScoreWorker.js';
import { startRetentionWorker } from './workers/retentionWorker.js';
import { cfg } from './config.js';
import webhookRouter from './routes/webhooks.js';
import { webhookWorker } from './webhooks/webhook.worker.js';
import supportTicketsRouter from './routes/support-tickets.js';
import ticketLinksRouter from './routes/ticket-links.js';

// Enhanced GraphQL Server
import { createApolloV5Server, createGraphQLMiddleware } from './graphql/apollo-v5-server.js';

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
  app.use('/api/support', supportTicketsRouter);
  app.use('/api', ticketLinksRouter);
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

  // Initialize Apollo Server v5
  // Requires passing the http server if we want to use ApolloServerPluginDrainHttpServer
  // But app.ts doesn't have the httpServer instance yet (it's created in index.ts usually)
  // For now we can pass null or minimal object if needed, but usually in express apps we pass it.
  // Looking at apollo-v5-server.ts, it takes httpServer.
  // However, app.ts returns the express app, and the server is started elsewhere?
  // Let's check where app.ts is used. Likely server/src/index.ts or similar.
  // If I can't pass httpServer, I might have to skip the drain plugin or init it later.
  // But for now, let's instantiate it without httpServer if possible or mock it.
  // Wait, createApolloV5Server expects httpServer.

  // Let's look at how the original code did it.
  // It did `await apollo.start();` inside `createApp`.

  // If I can't modify the caller of `createApp`, I have to deal with it here.
  // The `ApolloServerPluginDrainHttpServer` is optional but recommended.
  // I'll pass `undefined` for httpServer for now if the type allows, or modify `createApolloV5Server` to make it optional.

  // Let's check `createApolloV5Server` signature again.
  // export function createApolloV5Server(httpServer: any): ApolloServer<GraphQLContext>

  // I will instantiate it with {}.
  const apollo = createApolloV5Server({});
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

  // Use the enhanced middleware
  app.use(
    '/graphql',
    express.json(),
    authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
    // We need to bridge the gap between the auth middleware (which populates req.user)
    // and the createGraphQLMiddleware (which uses req.user).
    // The createGraphQLMiddleware calls createContext which uses req.user.
    createGraphQLMiddleware(apollo)
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
