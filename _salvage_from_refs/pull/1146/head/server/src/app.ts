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
import { contextBindingMiddleware } from './middleware/context-binding.js';
import { maestroAuthzMiddleware } from './middleware/maestro-authz.js';
import monitoringRouter from './routes/monitoring.js';
import aiRouter from './routes/ai.js';
import graphApiRouter from './routes/graph-api.js';
import { register } from './monitoring/metrics.js';
import { startCostExporter } from './monitoring/cost_exporter.js';
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
import pmRouter from './routes/pm.js';
import ticketLinksRouter from './routes/ticket-links.js';
import adminRouter from './routes/admin.js';
import recipesRouter from './routes/recipes.js';
import mcpServersRouter, { checkMCPHealth } from './maestro/mcp/servers-api.js';
import mcpSessionsRouter from './maestro/mcp/sessions-api.js';
import mcpInvokeRouter from './maestro/mcp/invoke-api.js';
import { otelRoute } from './middleware/otel-route.js';
import pipelinesRouter from './maestro/pipelines/pipelines-api.js';
import executorsRouter from './maestro/executors/executors-api.js';
import runsRouter from './maestro/runs/runs-api.js';
import conductorApi from './conductor/api.js';
import slackRouter from './routes/slack.js';
import createHealth from './routes/health.js';
import dashboardRouter from './maestro/dashboard/dashboard-api.js';
import mcpAuditRouter from './maestro/mcp/audit-api.js';
import { healthIntegrationsRouter } from './routes/health.integrations.js';
import n8nRouter from './routes/n8n.js';
import { trustCenterRouter } from './routes/trust-center.js';
import { dataResidencyRouter } from './routes/data-residency.js';
import { qualityEvaluationRouter } from './routes/quality-evaluation.js';
import PluginManager from './marketplace/plugin-manager.js';
import SafetyV2Service from './safety/safety-v2.js';
import { fipsService } from './federal/fips-compliance.js';
import { airGapService } from './federal/airgap-service.js';
import { assertFipsAndHsm, hsmEnforcement } from './federal/hsm-enforcement.js';
import { wormAuditChain } from './federal/worm-audit-chain.js';
import { typeDefs, safeTypes } from './graphql/schema.js';
import { budgetDirective } from './graphql/directives/budget.js';
import resolvers from './graphql/resolvers/index.js';
import { tokcountRouter } from './routes/tokcount.js';
import { enforceTokenBudget } from './middleware/llm-preflight.js';
import { getContext } from './lib/auth.js';
import { getNeo4jDriver } from './db/neo4j.js';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken'; // Assuming jsonwebtoken is available or will be installed
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import logger from './config/logger';
import { env } from './config/env.js';
import { randomUUID } from 'crypto';
import morgan from 'morgan';
import { mountRawBody } from '../bootstrap/raw-body.js';
import twilioRouter from './routes/twilio.js';
import shopifyRouter from './routes/shopify.js';
import plaidRouter from './routes/plaid.js';
import paypalRouter from './routes/paypal.js';
import coinbaseRouter from './routes/coinbase.js';
import segmentRouter from './routes/segment.js';
import authRouter from './routes/auth.js';
import githubRouter from './routes/github.js';
import stripeRouter from './routes/stripe.js';
import githubAppRouter from './routes/github-app.js';
import stripeConnectRouter from './routes/stripe-connect.js';
import { replayGuard, webhookRatelimit } from './middleware/webhook-guard.js';

export const createApp = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const appLogger = logger.child({ name: 'app' });
  // Raw-body mounting for selected webhook routes, then generic parsers
  mountRawBody(app);
  app.set('trust proxy', true);
  app.use(helmet());
  const allow = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: allow.length ? allow : true, credentials: true }));
  // Attach request id for correlation
  app.use((req, res, next) => {
    const id = req.header('x-request-id') || randomUUID();
    res.setHeader('x-request-id', id);
    (req as any).reqId = id;
    next();
  });
  morgan.token('reqid', (req: any) => req.reqId || '-');
  app.use(morgan(':reqid :method :url :status :response-time ms'));
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
  app.use(contextBindingMiddleware);

  // Self-contained webhooks (raw-body) mounted early
  app.use('/webhooks/github', webhookRatelimit, replayGuard(), githubRouter);
  app.use('/webhooks/stripe', webhookRatelimit, replayGuard(), stripeRouter);
  app.use('/webhooks/github-app', webhookRatelimit, replayGuard(), githubAppRouter);
  app.use('/webhooks/stripe-connect', webhookRatelimit, replayGuard(), stripeConnectRouter);
  app.use('/webhooks/twilio', twilioRouter);
  app.use('/webhooks/shopify', shopifyRouter);
  app.use('/webhooks/plaid', plaidRouter);
  app.use('/webhooks/paypal', paypalRouter);
  app.use('/webhooks/coinbase', coinbaseRouter);
  app.use('/webhooks/segment', segmentRouter);
  app.use('/webhooks/auth', authRouter);

  // Health and readiness endpoints
  app.use('/', createHealth());

  // Apply Maestro authorization middleware
  app.use('/api/maestro/v1', maestroAuthzMiddleware);

  // Federal FIPS/HSM enforcement for crypto operations
  if (process.env.FEDERAL_ENABLED === 'true') {
    app.use('/api/federal', assertFipsAndHsm);
    app.use('/api/llm', assertFipsAndHsm); // Protect AI/crypto operations
  }

  // Token counting and LLM safety routes
  app.use(tokcountRouter);
  app.use('/api/llm', enforceTokenBudget);

  // Rate limiting (exempt monitoring endpoints)
  app.use('/monitoring', monitoringRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api', graphApiRouter);
  app.use('/rbac', rbacRouter);
  app.use('/api', statusRouter);
  app.use('/api', healthIntegrationsRouter());
  app.use('/api', adminRouter);
  app.use('/api', recipesRouter);
  app.use('/api', pmRouter);
  app.use('/api', ticketLinksRouter);
  app.use('/api/admission', (await import('./routes/admission.js')).default);
  app.use('/api', (await import('./routes/relay.js')).default);
  app.use('/api', (await import('./routes/sites.js')).default);
  app.use('/api', (await import('./routes/replicate.js')).default);
  app.use('/api', (await import('./routes/regions.js')).default);
  app.use('/api', (await import('./routes/ops.js')).default);
  // Signed, IP-filtered inbound callbacks from n8n
  app.use('/', n8nRouter);
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
  
  // Trust Center API - comprehensive audit and compliance
  app.use('/api/trust-center', trustCenterRouter);
  
  // Data Residency & BYOK - customer-managed encryption and geo-compliance
  app.use('/api/data-residency', dataResidencyRouter);
  
  // Quality Evaluation Platform - semantic SLOs and AI model quality assessment
  app.use('/api/quality-evaluation', qualityEvaluationRouter);
  
  // Marketplace GA - signed plugins with capability scoping and revocation
  const pluginManager = new PluginManager();
  app.get('/api/marketplace/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-ga',
      services: {
        pluginVerification: 'operational',
        signatureValidation: 'operational',
        revocationFeeds: 'operational',
      }
    });
  });
  
  // Safety v2 - action-risk scoring and semantic guardrails
  const safetyService = new SafetyV2Service();
  app.get('/api/safety/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      capabilities: {
        actionRiskScoring: true,
        semanticGuardrails: true,
        watchlistUpdates: true,
        citationRequirement: true,
      }
    });
  });

  // Federal/Gov Pack - FIPS compliance and air-gap support
  app.get('/api/federal/health', async (req, res) => {
    const fipsHealth = await fipsService.healthCheck();
    const airGapStatus = await airGapService.getStatus();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-federal',
      fips: {
        enabled: fipsHealth.fipsEnabled,
        level: fipsHealth.details?.mode || 'N/A',
        hsmConnected: fipsHealth.hsmConnected,
        keyRotationStatus: fipsHealth.keyRotationStatus,
      },
      airGap: {
        enabled: airGapStatus.enabled,
        mode: airGapStatus.mode,
        networkIsolated: airGapStatus.networkIsolated,
        componentCount: airGapStatus.componentCount,
        activeBreakGlass: airGapStatus.activeBreakGlass,
      },
      compliance: {
        fipsValidated: airGapStatus.compliance.fipsEnabled,
        sbomsValidated: airGapStatus.compliance.sbomsValidated,
        signaturesVerified: airGapStatus.compliance.signaturesVerified,
      }
    });
  });

  // Federal operations endpoints
  app.post('/api/federal/offline-update', async (req, res) => {
    const { updatePackagePath } = req.body;
    
    if (!updatePackagePath) {
      return res.status(400).json({ error: 'updatePackagePath required' });
    }

    const result = await airGapService.processOfflineUpdate(updatePackagePath);
    res.json(result);
  });

  app.post('/api/federal/break-glass', async (req, res) => {
    const result = await airGapService.initiateBreakGlass(req.body);
    res.json(result);
  });

  app.get('/api/federal/compliance-status', async (req, res) => {
    const fipsStatus = await fipsService.getComplianceStatus();
    res.json(fipsStatus);
  });

  app.get('/api/federal/offline-instructions', (req, res) => {
    const instructions = airGapService.generateOfflineUpdateInstructions();
    res.json({ instructions });
  });

  // Start cost exporter counters
  startCostExporter(60000);

  // WORM audit chain endpoints
  app.get('/api/federal/audit/compliance-report', async (req, res) => {
    const report = await wormAuditChain.generateComplianceReport();
    res.json(report);
  });

  app.get('/api/federal/audit/export/:segmentId', async (req, res) => {
    const { segmentId } = req.params;
    const exportData = await wormAuditChain.exportSegment(segmentId);
    
    if (!exportData) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    res.json(exportData);
  });

  // HSM enforcement status  
  app.get('/api/federal/hsm/status', (req, res) => {
    const hsmStatus = hsmEnforcement.getStatus();
    res.json(hsmStatus);
  });

  app.get('/api/federal/hsm/attestation', (req, res) => {
    const attestation = hsmEnforcement.generateAttestation();
    res.json(attestation);
  });

  // Force HSM probe for testing
  app.post('/api/federal/hsm/probe', async (req, res) => {
    const result = await hsmEnforcement.forceProbe();
    res.json(result);
  });
  // Maestro MCP API (feature-gated)
  if (process.env.MAESTRO_MCP_ENABLED === 'true') {
    // Tighten per-route limits for write/invoke paths
    const writeLimiter = rateLimit({
      windowMs: 60_000,
      max: 60,
      keyGenerator: (req) => {
        const context = req.context;
        return context?.tenantId ? `t:${context.tenantId}` : `ip:${req.ip}`;
      },
    });
    const invokeLimiter = rateLimit({
      windowMs: 60_000,
      max: 120,
      keyGenerator: (req) => {
        const context = req.context;
        return context?.tenantId ? `t:${context.tenantId}` : `ip:${req.ip}`;
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
      const { mcpServersRepo } = await import('./maestro/mcp/MCPServerRepo.js');
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
      keyGenerator: (req) => {
        const context = req.context;
        return context?.tenantId ? `t:${context.tenantId}` : `ip:${req.ip}`;
      },
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

  let schema = makeExecutableSchema({ typeDefs: [typeDefs, safeTypes], resolvers });
  if (process.env.REQUIRE_BUDGET_PLUGIN === 'true') {
    const { budgetDirectiveTypeDefs, budgetDirectiveTransformer } = budgetDirective();
    schema = makeExecutableSchema({ typeDefs: [budgetDirectiveTypeDefs, typeDefs, safeTypes], resolvers });
    schema = budgetDirectiveTransformer(schema as any) as any;
  }

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

  // Centralized error handler (Express 5-compatible)
  // Keep 4 args to mark as error middleware
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any)?.statusCode ?? 500;
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
  });

  // Visual Pipelines & Executors
  if (process.env.MAESTRO_PIPELINES_ENABLED !== 'false') {
    app.use('/api/maestro/v1', otelRoute('pipelines'), pipelinesRouter);
    app.use('/api/maestro/v1', otelRoute('executors'), executorsRouter);
  app.use('/api/maestro/v1', otelRoute('runs'), runsRouter);
  app.use('/api/conductor', conductorApi);
  app.use('/', slackRouter);
    app.use('/api/maestro/v1', otelRoute('dashboard'), dashboardRouter);
  }

  return app;
};
