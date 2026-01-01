import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
// import { applyMiddleware } from 'graphql-middleware';
import cors from 'cors';
import pino from 'pino';
import pinoHttpModule from 'pino-http';
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;
import { logger as appLogger } from './config/logger.js';
import { telemetry } from './lib/telemetry/comprehensive-telemetry.js';
import { snapshotter } from './lib/telemetry/diagnostic-snapshotter.js';
import { anomalyDetector } from './lib/telemetry/anomaly-detector.js';
import { auditLogger } from './middleware/audit-logger.js';
import { auditFirstMiddleware } from './middleware/audit-first.js';
import { correlationIdMiddleware } from './middleware/correlation-id.js';
import { featureFlagContextMiddleware } from './middleware/feature-flag-context.js';
import { sanitizeInput } from './middleware/sanitization.js';
import { piiGuardMiddleware } from './middleware/pii-guard.js';
import { errorHandler } from './middleware/errorHandler.js';
import { advancedRateLimiter } from './middleware/TieredRateLimitMiddleware.js';
import { circuitBreakerMiddleware } from './middleware/circuitBreakerMiddleware.js';
import { overloadProtection } from './middleware/overloadProtection.js';
import { httpCacheMiddleware } from './middleware/httpCache.js';
import { safetyModeMiddleware, resolveSafetyState } from './middleware/safety-mode.js';
import { residencyEnforcement } from './middleware/residency.js';
import { requestProfilingMiddleware } from './middleware/request-profiling.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import exceptionRouter from './data-residency/exceptions/routes.js';
import monitoringRouter from './routes/monitoring.js';
import billingRouter from './routes/billing.js';
import entityResolutionRouter from './routes/entity-resolution.js';
import workspaceRouter from './routes/workspaces.js';
import aiRouter from './routes/ai.js';
import gaCoreMetricsRouter from './routes/ga-core-metrics.js';
import nlGraphQueryRouter from './routes/nl-graph-query.js';
import disclosuresRouter from './routes/disclosures.js';
import narrativeSimulationRouter from './routes/narrative-sim.js';
import receiptsRouter from './routes/receipts.js';
import predictiveRouter from './routes/predictive.js';
import { policyRouter } from './routes/policy.js';
import { metricsRoute } from './http/metricsRoute.js';
const rbacRouter = require('./routes/rbacRoutes.js');
import { typeDefs } from './graphql/schema.js';
import resolvers from './graphql/resolvers/index.js';
// import { licenseRuleValidationMiddleware } from './graphql/middleware/licenseRuleValidationMiddleware.js';
import { getContext } from './lib/auth.js';
import { getNeo4jDriver } from './db/neo4j.js';
import { initializeTracing, getTracer } from './observability/tracer.js';
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import { startTrustWorker } from './workers/trustScoreWorker.js';
import { startRetentionWorker } from './workers/retentionWorker.js';
import { cfg } from './config.js';
import webhookRouter from './routes/webhooks.js';
import { webhookWorker } from './webhooks/webhook.worker.js';
import supportTicketsRouter from './routes/support-tickets.js';
import ticketLinksRouter from './routes/ticket-links.js';
import tenantContextMiddleware from './middleware/tenantContext.js';
import sharingRouter from './routes/sharing.js';
import { auroraRouter } from './routes/aurora.js';
import { oracleRouter } from './routes/oracle.js';
import { phantomLimbRouter } from './routes/phantom_limb.js';
import { actionsRouter } from './routes/actions.js';
import { echelon2Router } from './routes/echelon2.js';
import { mnemosyneRouter } from './routes/mnemosyne.js';
import { necromancerRouter } from './routes/necromancer.js';
import { zeroDayRouter } from './routes/zero_day.js';
import { abyssRouter } from './routes/abyss.js';
import authRouter from './routes/authRoutes.js';
import ssoRouter from './routes/sso.js';
import qafRouter from './routes/qaf.js';
import siemPlatformRouter from './routes/siem-platform.js';
import maestroRouter from './routes/maestro.js';
import caseRouter from './routes/cases.js';
import entityCommentsRouter from './routes/entity-comments.js';
import tenantsRouter from './routes/tenants.js';
import { SummitInvestigate } from './services/SummitInvestigate.js';
import { streamIngest } from './ingest/stream.js';
import osintRouter from './routes/osint.js';
import palettesRouter from './routes/palettes.js';
import edgeOpsRouter from './routes/edge-ops.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import metaOrchestratorRouter from './routes/meta-orchestrator.js';
import adminSmokeRouter from './routes/admin-smoke.js';
import lineageRouter from './routes/lineage.js';
import scenarioRouter from './routes/scenarios.js';
import resourceCostsRouter from './routes/resource-costs.js';
import queryReplayRouter from './routes/query-replay.js';
import streamRouter from './routes/stream.js'; // Added import
import queryPreviewStreamRouter from './routes/query-preview-stream.js';
import correctnessProgramRouter from './routes/correctness-program.js';
import commandConsoleRouter from './routes/internal/command-console.js';
import searchV1Router from './routes/search-v1.js';
import ontologyRouter from './routes/ontology.js';
import searchIndexRouter from './routes/search-index.js'; // New search-index route
import dataGovernanceRouter from './routes/data-governance-routes.js';
import tenantBillingRouter from './routes/tenants/billing.js';
import { gtmRouter } from './routes/gtm-messaging.js';
import { airgapRouter } from './routes/airgap.js';
import analyticsRouter from './routes/analytics.js';
import experimentRouter from './routes/experiments.js';
import cohortRouter from './routes/cohorts.js';
import funnelRouter from './routes/funnels.js';
import anomaliesRouter from './routes/anomalies.js';
import exportsRouter from './routes/exports.js';
import retentionRouter from './routes/retention.js';
import drRouter from './routes/dr.js';
import reportingRouter from './routes/reporting.js';
import policyProfilesRouter from './routes/policy-profiles.js';
import evidenceRouter from './routes/evidence.js';
import masteryRouter from './routes/mastery.js';
import cryptoIntelligenceRouter from './routes/crypto-intelligence.js';
import demoRouter from './routes/demo.js';
import claimsRouter from './routes/claims.js';
import opsRouter from './routes/ops.js';
import featureFlagsRouter from './routes/feature-flags.js';
import mlReviewRouter from './routes/ml_review.js';
import adminFlagsRouter from './routes/admin-flags.js';
import auditEventsRouter from './routes/audit-events.js';
import { centralizedErrorHandler } from './middleware/error-handling-middleware.js';
import pluginAdminRouter from './routes/plugins/plugin-admin.js';
import integrationAdminRouter from './routes/integrations/integration-admin.js';
import securityAdminRouter from './routes/security/security-admin.js';
import complianceAdminRouter from './routes/compliance/compliance-admin.js';
import sandboxAdminRouter from './routes/sandbox/sandbox-admin.js';
import onboardingRouter from './routes/onboarding.js';
import supportCenterRouter from './routes/support-center.js';
import i18nRouter from './routes/i18n.js';
import experimentationRouter from './routes/experimentation.js';
import { v4Router } from './routes/v4/index.js';
import vectorStoreRouter from './routes/vector-store.js';
import intelGraphRouter from './routes/intel-graph.js';
import graphragRouter from './routes/graphrag.js';

export const createApp = async () => {
  // Initialize OpenTelemetry tracing
  // Tracer is already initialized in index.ts, but we ensure it's available here
  // Verified usage for comprehensive observability
  const tracer = initializeTracing();
  // Ensure initialized if this entry point is used standalone (e.g. tests)
  if (!tracer.isInitialized()) {
    await tracer.initialize();
  }

  const app = express();
  const logger = (pino as any)();

  const isProduction = cfg.NODE_ENV === 'production';
  const allowedOrigins = cfg.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const securityHeadersEnabled = process.env.SECURITY_HEADERS_ENABLED !== 'false';
  const cspReportOnly = process.env.SECURITY_HEADERS_CSP_REPORT_ONLY === 'true';
  const cspEnabledFlag = process.env.SECURITY_HEADERS_CSP_ENABLED === 'true';

  const safetyState = await resolveSafetyState();
  if (safetyState.killSwitch || safetyState.safeMode) {
    appLogger.warn({ safetyState }, 'Safety gates enabled');
  }

  // Add correlation ID middleware FIRST (before other middleware)
  app.use(correlationIdMiddleware);
  app.use(featureFlagContextMiddleware);

  // Load Shedding / Overload Protection (Second, to reject early)
  app.use(overloadProtection);

  app.use(
    securityHeaders({
      enabled: securityHeadersEnabled,
      allowedOrigins,
      enableCsp: cspEnabledFlag || isProduction,
      cspReportOnly,
    }),
  );
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
      logger: appLogger,
      // Redaction is handled by the logger config itself, but we keep this consistent if needed
      // logger config already has redact paths, so we can omit here or merge.
      // We rely on logger's internal redaction, but pino-http might need specific config
      // to redact req.headers if not using standard serializers.
      // appLogger uses standard req/res serializers which respect redact.
      customProps: (req: any) => ({
        correlationId: req.correlationId,
        traceId: req.traceId,
        spanId: req.spanId,
        userId: req.user?.sub || req.user?.id,
        tenantId: req.user?.tenant_id,
      }),
    }),
  );
  app.use(requestProfilingMiddleware);

  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(sanitizeInput);
  app.use(piiGuardMiddleware);
  app.use(safetyModeMiddleware);

  // Circuit Breaker Middleware - Fail fast if system is unstable
  app.use(circuitBreakerMiddleware);

  // Standard audit logger for basic request tracking
  app.use(auditLogger);
  // Audit-First middleware for cryptographic stamping of sensitive operations
  app.use(auditFirstMiddleware);
  app.use(httpCacheMiddleware);

  // API Versioning Middleware (Epic 2: API v1.1 Default)
  app.use((req, res, next) => {
    const version = req.headers['x-ig-api-version'];
    if (!version) {
      // Default to v1.1 if not specified
      req.headers['x-ig-api-version'] = '1.1';
    }
    // Attach to request for downstream consumption
    (req as any).apiVersion = req.headers['x-ig-api-version'];

    // Compat guard: If legacy client detected (v1.0), we might want to log or adjust behavior
    if ((req as any).apiVersion === '1.0') {
      // Logic for v1.0 compatibility if needed
    }
    next();
  });

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

  // Resolve and enforce tenant context for API and GraphQL surfaces
  app.use(['/api', '/graphql'], tenantContextMiddleware());

  // Enforce Data Residency
  app.use(['/api', '/graphql'], residencyEnforcement);

  // Residency Exception Routes
  app.use('/api/residency/exceptions', authenticateToken, exceptionRouter);

  // Telemetry middleware
  app.use((req, res, next) => {
    snapshotter.trackRequest(req);
    const start = process.hrtime();
    telemetry.incrementActiveConnections();
    telemetry.subsystems.api.requests.add();

    res.on('finish', () => {
      snapshotter.untrackRequest(req);
      const diff = process.hrtime(start);
      const duration = diff[0] * 1e3 + diff[1] * 1e-6;
      telemetry.recordRequest(duration, {
        method: req.method,
        route: req.route?.path ?? req.path,
        status: res.statusCode,
      });
      telemetry.decrementActiveConnections();

      if (res.statusCode >= 500) {
        telemetry.subsystems.api.errors.add();
      }
    });

    next();
  });

  // Health endpoints (exempt from rate limiting)
  const healthRouter = (await import('./routes/health.js')).default;
  app.use(healthRouter);

  // Swagger UI
  app.use('/api-docs', ...(swaggerUi.serve as any), swaggerUi.setup(swaggerSpec) as any);



  // Global Rate Limiting (fallback for unauthenticated or non-specific routes)
  // Note: /graphql has its own rate limiting chain above
  app.use((req, res, next) => {
    if (req.path === '/graphql') return next(); // Skip global limiter for graphql, handled in route
    return advancedRateLimiter.middleware()(req, res, next);
  });

  // Admin Rate Limit Dashboard Endpoint
  // Requires authentication and admin role (simplified check for now)
  app.get('/api/admin/rate-limits/:userId', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const status = await advancedRateLimiter.getStatus(req.params.userId);
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch rate limit status' });
    }
  });

  // Authentication routes (exempt from global auth middleware)
  app.use('/auth', authRouter);
  app.use('/auth/sso', ssoRouter);
  app.use('/api/auth', authRouter); // Alternative path
  app.use('/sso', ssoRouter);

  // Other routes
  // app.use('/api/policy', policyRouter);
  app.use('/api/receipts', receiptsRouter);
  app.use(['/monitoring', '/api/monitoring'], monitoringRouter);
  app.use('/api/ga-core-metrics', gaCoreMetricsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/ai/nl-graph-query', nlGraphQueryRouter);
  app.use('/api/narrative-sim', narrativeSimulationRouter);
  app.use('/api/predictive', predictiveRouter);
  app.use('/api/export', disclosuresRouter); // Mount export under /api/export as per spec
  app.use('/disclosures', disclosuresRouter); // Keep old mount for compat
  app.use('/rbac', rbacRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/er', entityResolutionRouter);
  app.use('/api/workspaces', workspaceRouter);
  app.use('/api/webhooks', webhookRouter);
  app.use('/api/support', supportTicketsRouter);
  app.use('/api', ticketLinksRouter);
  app.use('/api/cases', caseRouter);
  app.use('/api/entities', entityCommentsRouter);
  app.use('/api/aurora', auroraRouter);
  app.use('/api/oracle', oracleRouter);
  app.use('/api/phantom-limb', phantomLimbRouter);
  app.use('/api/echelon2', echelon2Router);
  app.use('/api/mnemosyne', mnemosyneRouter);
  app.use('/api/necromancer', necromancerRouter);
  app.use('/api/zero-day', zeroDayRouter);
  app.use('/api/abyss', abyssRouter);
  app.use('/api/qaf', qafRouter);
  app.use('/api/siem-platform', siemPlatformRouter);
  app.use('/api/maestro', maestroRouter);
  app.use('/api/tenants', tenantsRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/osint', osintRouter);
  app.use('/api/edge', edgeOpsRouter);
  app.use('/api/meta-orchestrator', metaOrchestratorRouter);
  app.use('/api', adminSmokeRouter);
  app.use('/api/scenarios', scenarioRouter);
  app.use('/api/costs', resourceCostsRouter);
  app.use('/api/tenants/:tenantId/billing', tenantBillingRouter);
  app.use('/api/internal/command-console', commandConsoleRouter);
  app.use('/api/query-replay', queryReplayRouter);
  app.use('/api/correctness', correctnessProgramRouter);
  app.use('/api', queryPreviewStreamRouter);
  app.use('/api/stream', streamRouter); // Register stream route
  app.use('/api/v1/search', searchV1Router); // Register Unified Search API
  app.use('/api/ontology', ontologyRouter);
  app.use('/search', searchIndexRouter); // Register Search Index API
  app.use('/api', dataGovernanceRouter); // Register Data Governance API
  app.use('/api', sharingRouter);
  app.use('/api/gtm', gtmRouter);
  app.use('/airgap', airgapRouter);
  app.use('/analytics', analyticsRouter);
  app.use('/api', experimentRouter); // Mounts /api/experiments...
  app.use('/api', cohortRouter); // Mounts /api/cohorts...
  app.use('/api', funnelRouter); // Mounts /api/funnels...
  app.use('/api', anomaliesRouter);
  app.use('/api', exportsRouter);
  app.use('/api', retentionRouter);
  app.use('/api/policy-profiles', policyProfilesRouter);
  app.use('/api/evidence', evidenceRouter);
  app.use('/dr', drRouter);
  app.use('/', opsRouter);
  app.use('/api/reporting', reportingRouter);
  app.use('/api/mastery', masteryRouter);
  app.use('/api/crypto-intelligence', cryptoIntelligenceRouter);
  app.use('/api/demo', demoRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/feature-flags', featureFlagsRouter);
  app.use('/api/ml-reviews', mlReviewRouter);
  app.use('/api/admin/flags', adminFlagsRouter);
  app.use('/api', auditEventsRouter);
  app.use('/api/plugins', pluginAdminRouter);
  app.use('/api/integrations', integrationAdminRouter);
  app.use('/api/security', securityAdminRouter);
  app.use('/api/compliance', complianceAdminRouter);
  app.use('/api/sandbox', sandboxAdminRouter);
  app.use('/api/v1/onboarding', onboardingRouter);
  app.use('/api/v1/support', supportCenterRouter);
  app.use('/api/v1/i18n', i18nRouter);
  app.use('/api/v1/experiments', experimentationRouter);
  app.use('/api/v1/palettes', palettesRouter);

  // Summit v4 API Routes (AI Governance, Compliance, Zero-Trust)
  app.use('/api/v4', v4Router);

  // Vector Store Routes
  app.use('/api/vector-store', vectorStoreRouter);

  app.use('/api/intel-graph', intelGraphRouter);
  app.use('/api/graphrag', graphragRouter);
  app.get('/metrics', metricsRoute);

  // Initialize SummitInvestigate Platform Routes
  SummitInvestigate.initialize(app);
  // Maestro
  const { buildMaestroRouter } = await import('./routes/maestro_routes.js');
  const { Maestro } = await import('./maestro/core.js');
  const { MaestroQueries } = await import('./maestro/queries.js');
  const { IntelGraphClientImpl } = await import('./intelgraph/client-impl.js');
  const { CostMeter } = await import('./maestro/cost_meter.js');

  const igClient = new IntelGraphClientImpl();
  const costMeter = new CostMeter(igClient, {
    'openai:gpt-4.1': { inputPer1K: 0.01, outputPer1K: 0.03 },
  });
  // Simple LLM stub
  const llmClient = {
    apiKey: 'stub-key',
    costMeter,
    fakeOpenAIChatCompletion: async () => 'stub',
    callCompletion: async (prompt: string, model: string) => `[Stub LLM Response] for: ${prompt}`
  };

  const maestro = new Maestro(igClient, costMeter, llmClient as any, {
    defaultPlannerAgent: 'openai:gpt-4.1',
    defaultActionAgent: 'openai:gpt-4.1',
  });
  const maestroQueries = new MaestroQueries(igClient);

  app.use('/api/maestro', buildMaestroRouter(maestro, maestroQueries));

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
      appLogger.error(
        `Error in search/evidence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      res.status(500).send({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  });

  const executableSchema = makeExecutableSchema({
    typeDefs: typeDefs as any,
    resolvers: resolvers as any,
  });

  const schema = executableSchema; // applyMiddleware(executableSchema, licenseRuleValidationMiddleware);

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
  const { rateLimitAndCachePlugin } = await import('./graphql/plugins/rateLimitAndCache.js');

  const apollo = new ApolloServer({
    schema,
    // Security plugins - Order matters for execution lifecycle
    plugins: [
      persistedQueriesPlugin as any,
      resolverMetricsPlugin as any,
      auditLoggerPlugin as any,
      rateLimitAndCachePlugin(schema) as any,
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
    formatError: (formattedError, error) => {
      // Always allow introspection errors (dev) or client-side validation errors
      if (
        formattedError.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' ||
        formattedError.extensions?.code === 'BAD_USER_INPUT' ||
        formattedError.extensions?.code === 'UNAUTHENTICATED' ||
        formattedError.extensions?.code === 'FORBIDDEN'
      ) {
        return formattedError;
      }

      // In production, mask everything else as Internal Server Error
      if (cfg.NODE_ENV === 'production') {
        appLogger.error(
          { err: error, stack: (error as any)?.stack },
          `GraphQL Error: ${formattedError.message}`,
        );
        return new GraphQLError('Internal server error', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            http: { status: 500 }
          }
        });
      }

      // In development, return the full error
      return formattedError;
    },
  });
  await apollo.start();

  app.use(
    '/graphql',
    express.json(),
    authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
    advancedRateLimiter.middleware(), // Applied AFTER authentication to enable per-user limits
    expressMiddleware(apollo, {
      context: async ({ req }) => getContext({ req: req as any })
    }),
  );

  if (!safetyState.killSwitch && !safetyState.safeMode) {
    // Start background trust worker if enabled
    startTrustWorker();
    // Start retention worker if enabled
    startRetentionWorker();
    // Start streaming ingestion (Epic B)
    streamIngest.start(['ingest-events']).catch(err => {
      appLogger.error({ err }, 'Failed to start streaming ingestion');
    });
  } else {
    appLogger.warn(
      { safetyState },
      'Skipping background workers because safety mode or kill switch is enabled',
    );
  }

  // Ensure webhook worker is running (it's an auto-starting worker, but importing it ensures it's registered)
  // In a real production setup, this might be in a separate process/container.
  // For MVP/Monolith, we keep it here.
  if (webhookWorker) {
    // Just referencing it to prevent tree-shaking/unused variable lint errors if any,
    // though import side-effects usually suffice.
  }

  appLogger.info('Anomaly detector activated.');

  // Global Error Handler - must be last
  app.use(centralizedErrorHandler);

  return app;
};