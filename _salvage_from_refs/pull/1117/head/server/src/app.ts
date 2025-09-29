import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { auditLogger } from './middleware/audit-logger.js';
import monitoringRouter from './routes/monitoring.js';
import aiRouter from './routes/ai.js';
import graphApiRouter from './routes/graph-api.js';
import { register } from './monitoring/metrics.js';
import rbacRouter from './routes/rbacRoutes.js';
import { statusRouter } from './http/status.js';
import { incidentRouter } from './http/incident.js';
import evaluationRouter from './conductor/evaluation/evaluation-api.js';
import { rewardRouter } from './conductor/learn/reward-api.js';
import schedulerRouter from './conductor/scheduling/scheduler-api.js';
import { tenantIsolationMiddleware } from './conductor/governance/opa-integration.js';
import runbookRouter from './conductor/runbooks/runbook-api.js';
import syncRouter from './conductor/edge/sync-api.js';
import complianceRouter from './conductor/compliance/compliance-api.js';
import routerRouter from './conductor/router/router-api.js';
import { addConductorHeaders } from './conductor/middleware/version-header.js';
import dlpRouter from './routes/dlp.js';
import mcpServersRouter, { checkMCPHealth } from './maestro/mcp/servers-api.js';
import mcpSessionsRouter from './maestro/mcp/sessions-api.js';
import mcpInvokeRouter from './maestro/mcp/invoke-api.js';
import { otelRoute } from './middleware/otel-route.js';
import pipelinesRouter from './maestro/pipelines/pipelines-api.js';
import executorsRouter from './maestro/executors/executors-api.js';
import runsRouter from './maestro/runs/runs-api.js';
import dashboardRouter from './maestro/dashboard/dashboard-api.js';
import mcpAuditRouter from './maestro/mcp/audit-api.js';
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
import { getContext } from './lib/auth.js';
import { getNeo4jDriver } from './db/neo4j.js';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken'; // Assuming jsonwebtoken is available or will be installed
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import logger from './config/logger';

export const createApp = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const appLogger = logger.child({ name: 'app' });
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
    }),
  );
  app.use(
    pinoHttp({
      logger: appLogger,
      redact: [
        'req.headers.authorization',
        'req.headers.Authorization',
        "req.headers['x-api-key']",
        "res.headers['set-cookie']",
        // Defensive redactions if bodies are ever logged
        'req.body.token',
        'res.body.token',
      ],
    }),
  );
  app.use(auditLogger);

  // Rate limiting (exempt monitoring endpoints)
  app.use('/monitoring', monitoringRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api', graphApiRouter);
  app.use('/rbac', rbacRouter);
  app.use('/api', statusRouter);
  app.use('/api/incident', incidentRouter);
  app.use('/api/dlp', dlpRouter);
  app.use('/api/compliance', (await import('./routes/compliance.js')).default);
  app.use('/api/siem', (await import('./routes/siem.js')).default);
  // Apply conductor-specific middleware (headers, tenant isolation)
  app.use('/api/conductor', addConductorHeaders);
  app.use('/api/conductor', tenantIsolationMiddleware.middleware());
  app.use('/api/conductor/v1/router', routerRouter);
  app.use('/api/conductor/v1/evaluation', evaluationRouter);
  app.use('/api/conductor/v1/reward', rewardRouter);
  app.use('/api/conductor/v1/scheduler', schedulerRouter);
  app.use('/api/conductor/v1/runbooks', runbookRouter);
  app.use('/api/conductor/v1/sync', syncRouter);
  app.use('/api/conductor/v1/compliance', complianceRouter);
  // Maestro MCP API (feature-gated)
  if (process.env.MAESTRO_MCP_ENABLED === 'true') {
    // Tighten per-route limits for write/invoke paths
    const writeLimiter = rateLimit({
      windowMs: 60_000,
      max: 60,
      keyGenerator: (req) => {
        const user: any = (req as any).user || {};
        return user?.id ? `u:${user.id}` : `ip:${req.ip}`;
      },
    });
    const invokeLimiter = rateLimit({
      windowMs: 60_000,
      max: 120,
      keyGenerator: (req) => {
        const user: any = (req as any).user || {};
        return user?.id ? `u:${user.id}` : `ip:${req.ip}`;
      },
    });
    // Apply OTEL route middleware for consistent spans
    app.use('/api/maestro/v1/mcp', otelRoute('mcp/servers'));
    app.use('/api/maestro/v1/runs', otelRoute('mcp/runs'));
    app.use('/api/maestro/v1/mcp', mcpServersRouter); // internal router enforces admin on writes
    app.use('/api/maestro/v1', writeLimiter, mcpSessionsRouter);
    app.use('/api/maestro/v1', invokeLimiter, mcpInvokeRouter);
  }
  app.use('/api/maestro/v1', mcpAuditRouter);
  // Contract alias: GET /mcp/servers/:id/health
  app.get('/mcp/servers/:id/health', async (req, res) => {
    try {
      const { mcpServersRepo } = await import('./maestro/mcp/MCPServersRepo.js');
      const rec = await mcpServersRepo.get(req.params.id);
      if (!rec) return res.status(404).json({ error: 'server not found' });
      const healthy = await checkMCPHealth(rec.url, rec.auth_token || undefined);
      res.json({ id: rec.id, name: rec.name, url: rec.url, healthy });
    } catch (err) {
      res.status(500).json({ error: 'health check failed' });
    }
  });
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.RATE_LIMIT_MAX || 600),
      message: { error: 'Too many requests, please try again later' },
    }),
  );

  // Serve OpenAPI docs (static) at /docs/openapi
  try {
    const openapiPath = path.resolve(__dirname, '../../docs/openapi');
    app.use('/docs/openapi', express.static(openapiPath));
  } catch (e) {
    // Non-fatal if docs path not present
  }

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

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // GraphQL over HTTP
  const { persistedQueriesPlugin } = await import('./graphql/plugins/persistedQueries.js');
  const { default: pbacPlugin } = await import('./graphql/plugins/pbac.js');
  const { default: resolverMetricsPlugin } = await import('./graphql/plugins/resolverMetrics.js');
  const { default: auditLoggerPlugin } = await import('./graphql/plugins/auditLogger.js');
  const { default: dlpPlugin } = await import('./graphql/plugins/dlpPlugin.js');
  const { depthLimit } = await import('./graphql/validation/depthLimit.js');
  const { otelApolloPlugin } = await import('./graphql/middleware/otelPlugin.js');

  const apollo = new ApolloServer({
    schema,
    // Security plugins - Order matters for execution lifecycle
    plugins: [
      otelApolloPlugin(),
      persistedQueriesPlugin as any,
      resolverMetricsPlugin as any,
      auditLoggerPlugin as any,
      // Enable DLP scanning
      dlpPlugin({
        enabled: process.env.DLP_ENABLED !== 'false',
        scanVariables: true,
        scanResponse: process.env.NODE_ENV === 'production',
        blockOnViolation: process.env.NODE_ENV === 'production'
      }) as any,
      // Enable PBAC in production
      ...(process.env.NODE_ENV === 'production' ? [pbacPlugin() as any] : []),
    ],
    // Security configuration based on environment
    introspection: process.env.NODE_ENV !== 'production',
    // Enhanced query validation rules
    validationRules: [
      depthLimit(process.env.NODE_ENV === 'production' ? 6 : 8), // Stricter in prod
    ],
    // Security context
    formatError: (err) => {
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        appLogger.error(`GraphQL Error: ${err.message}`, { stack: err.stack });
        return new Error('Internal server error');
      }
      return err;
    },
  });
  await apollo.start();

  // Production Authentication - Use proper JWT validation
  const { productionAuthMiddleware, applyProductionSecurity, graphqlSecurityConfig } = await import(
    './config/production-security.js'
  );

  // Apply security middleware based on environment
  if (process.env.NODE_ENV === 'production') {
    applyProductionSecurity(app);
  }

  const authenticateToken =
    process.env.NODE_ENV === 'production'
      ? productionAuthMiddleware
      : (req: Request, res: Response, next: NextFunction) => {
          // Development mode - relaxed auth for easier testing
          const authHeader = req.headers['authorization'];
          const token = authHeader && authHeader.split(' ')[1];

          if (!token) {
            console.warn('Development: No token provided, allowing request');
            (req as any).user = { sub: 'dev-user', email: 'dev@intelgraph.local', role: 'admin' };
          }
          next();
        };

  app.use(
    '/graphql',
    express.json(),
    authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
    expressMiddleware(apollo, { context: getContext }),
  );

  // Visual Pipelines & Executors
  if (process.env.MAESTRO_PIPELINES_ENABLED !== 'false') {
    app.use('/api/maestro/v1', otelRoute('pipelines'), pipelinesRouter);
    app.use('/api/maestro/v1', otelRoute('executors'), executorsRouter);
    app.use('/api/maestro/v1', otelRoute('runs'), runsRouter);
    app.use('/api/maestro/v1', otelRoute('dashboard'), dashboardRouter);
  }

  return app;
};
