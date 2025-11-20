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
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import { startTrustWorker } from './workers/trustScoreWorker.js';
import { startRetentionWorker } from './workers/retentionWorker.js';
import { cfg } from './config.js';
import { configureSecurity, unifiedAuthMiddleware, apiRateLimiter } from './middleware/securityChain.js';

export const createApp = async () => {
  const app = express();
  const logger = pino();

  // Apply Security Chain (Helmet, CORS, Global Rate Limit, Request Signing, Versioning)
  configureSecurity(app);

  app.use(pinoHttp({ logger, redact: ['req.headers.authorization'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use(auditLogger);

  // Health endpoints
  const healthRouter = (await import('./routes/health.js')).default;
  app.use(healthRouter);

  // Protect Sensitive Routes with Unified Auth (API Key / JWT)
  const protectedPrefixes = [
    '/api',
    '/monitoring',
    '/disclosures',
    '/rbac',
    '/search',
    '/metrics'
  ];

  protectedPrefixes.forEach(prefix => {
    app.use(prefix, unifiedAuthMiddleware);
  });

  // Mount Routes
  app.use('/monitoring', monitoringRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/ai/nl-graph-query', nlGraphQueryRouter);
  app.use('/api/narrative-sim', narrativeSimulationRouter);
  app.use('/disclosures', disclosuresRouter);
  app.use('/rbac', rbacRouter);
  app.get('/metrics', metricsRoute);

  // Additional Rate Limiting for API routes
  app.use('/api', apiRateLimiter);

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
  } = await import('./config/production-security.js');

  // Use unified auth for GraphQL
  const authenticateToken = unifiedAuthMiddleware;

  app.use(
    '/graphql',
    express.json(),
    authenticateToken,
    expressMiddleware(apollo, { context: getContext }),
  );

  // Start background trust worker if enabled
  startTrustWorker();
  // Start retention worker if enabled
  startRetentionWorker();

  return app;
};
