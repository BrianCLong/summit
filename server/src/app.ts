import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
// import { applyMiddleware } from 'graphql-middleware';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import pino from 'pino';
import pinoHttpModule from 'pino-http';
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;
import { logger as appLogger } from './config/logger.ts';
import { telemetry } from './lib/telemetry/comprehensive-telemetry.ts';
import { snapshotter } from './lib/telemetry/diagnostic-snapshotter.ts';
import { anomalyDetector } from './lib/telemetry/anomaly-detector.ts';
import { auditLogger } from './middleware/audit-logger.ts';
import { auditFirstMiddleware } from './middleware/audit-first.ts';
import { correlationIdMiddleware } from './middleware/correlation-id.ts';
import { featureFlagContextMiddleware } from './middleware/feature-flag-context.ts';
import { sanitizeInput } from './middleware/sanitization.ts';
import { piiGuardMiddleware } from './middleware/pii-guard.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { publicRateLimit, authenticatedRateLimit } from './middleware/rateLimiter.ts';
import { advancedRateLimiter } from './middleware/TieredRateLimitMiddleware.ts';
import { circuitBreakerMiddleware } from './middleware/circuitBreakerMiddleware.ts';
import { overloadProtection } from './middleware/overloadProtection.ts';
import { admissionControl } from './runtime/backpressure/AdmissionControl.ts';
import { httpCacheMiddleware } from './middleware/httpCache.ts';
import { safetyModeMiddleware, resolveSafetyState } from './middleware/safety-mode.ts';
import { residencyEnforcement } from './middleware/residency.ts';
import { requestProfilingMiddleware } from './middleware/request-profiling.ts';
import { securityHeaders } from './middleware/securityHeaders.ts';
import exceptionRouter from './data-residency/exceptions/routes.ts';
import monitoringRouter from './routes/monitoring.ts';
import billingRouter from './routes/billing.ts';
import entityResolutionRouter from './routes/entity-resolution.ts';
import workspaceRouter from './routes/workspaces.ts';
import gaCoreMetricsRouter from './routes/ga-core-metrics.ts';
import nlGraphQueryRouter from './routes/nl-graph-query.ts';
import disclosuresRouter from './routes/disclosures.ts';
import narrativeSimulationRouter from './routes/narrative-sim.ts';
import receiptsRouter from './routes/receipts.ts';
import predictiveRouter from './routes/predictive.ts';
import { policyRouter } from './routes/policy.ts';
import policyManagementRouter from './routes/policies/policy-management.ts';
import { metricsRoute } from './http/metricsRoute.ts';
import monitoringBackpressureRouter from './routes/monitoring-backpressure.ts';
import rbacRouter from './routes/rbacRoutes.ts';
// import { licenseRuleValidationMiddleware } from './graphql/middleware/licenseRuleValidationMiddleware.ts';
import { getContext } from './lib/auth.ts';
import { getNeo4jDriver } from './db/neo4j.ts';
import { initializeTracing, getTracer } from './observability/tracer.ts';
import { Request, Response, NextFunction } from 'express'; // Import types for middleware
import { startTrustWorker } from './workers/trustScoreWorker.ts';
import { startRetentionWorker } from './workers/retentionWorker.ts';
import { cfg } from './config.ts';
import supportTicketsRouter from './routes/support-tickets.ts';
import ticketLinksRouter from './routes/ticket-links.ts';
import tenantContextMiddleware from './middleware/tenantContext.ts';
import sharingRouter from './routes/sharing.ts';
import { auroraRouter } from './routes/aurora.ts';
import { oracleRouter } from './routes/oracle.ts';
import { phantomLimbRouter } from './routes/phantom_limb.ts';
import { actionsRouter } from './routes/actions.ts';
import { echelon2Router } from './routes/echelon2.ts';
import { mnemosyneRouter } from './routes/mnemosyne.ts';
import { necromancerRouter } from './routes/necromancer.ts';
import { zeroDayRouter } from './routes/zero_day.ts';
import { abyssRouter } from './routes/abyss.ts';
import authRouter from './routes/authRoutes.ts';
import ssoRouter from './routes/sso.ts';
import qafRouter from './routes/qaf.ts';
import siemPlatformRouter from './routes/siem-platform.ts';
import maestroRouter from './routes/maestro.ts';
import mcpAppsRouter from './routes/mcp-apps.ts';
import caseRouter from './routes/cases.ts';
import entityCommentsRouter from './routes/entity-comments.ts';
import tenantsRouter from './routes/tenants.ts';
import { SummitInvestigate } from './services/SummitInvestigate.ts';
import { streamIngest } from './ingest/stream.ts';
import osintRouter from './routes/osint.ts';
import palettesRouter from './routes/palettes.ts';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.ts';
import metaOrchestratorRouter from './routes/meta-orchestrator.ts';
import adminSmokeRouter from './routes/admin-smoke.ts';
import lineageRouter from './routes/lineage.ts';
import scenarioRouter from './routes/scenarios.ts';
import resourceCostsRouter from './routes/resource-costs.ts';

import streamRouter from './routes/stream.ts'; // Added import
import queryPreviewStreamRouter from './routes/query-preview-stream.ts';
import correctnessProgramRouter from './routes/correctness-program.ts';
import commandConsoleRouter from './routes/internal/command-console.ts';
import searchV1Router from './routes/search-v1.ts';
import ontologyRouter from './routes/ontology.ts';
import searchIndexRouter from './routes/search-index.ts'; // New search-index route
import dataGovernanceRouter from './routes/data-governance-routes.ts';
import tenantBillingRouter from './routes/tenants/billing.ts';
import tenantUsageRouter from './routes/tenants/usage.ts';
import { gtmRouter } from './routes/gtm-messaging.ts';
import { airgapRouter } from './routes/airgap.ts';
import analyticsRouter from './routes/analytics.ts';
import experimentRouter from './routes/experiments.ts';
import cohortRouter from './routes/cohorts.ts';
import funnelRouter from './routes/funnels.ts';
import anomaliesRouter from './routes/anomalies.ts';
import exportsRouter from './routes/exports.ts';
import retentionRouter from './routes/retention.ts';
import drRouter from './routes/dr.ts';
import reportingRouter from './routes/reporting.ts';
import policyProfilesRouter from './routes/policy-profiles.ts';
import policyProposalsRouter from './routes/policy-proposals.ts';
import evidenceRouter from './routes/evidence.ts';
import masteryRouter from './routes/mastery.ts';
import cryptoIntelligenceRouter from './routes/crypto-intelligence.ts';
import demoRouter from './routes/demo.ts';
import claimsRouter from './routes/claims.ts';
import opsRouter from './routes/ops.ts';
import featureFlagsRouter from './routes/feature-flags.ts';
import mlReviewRouter from './routes/ml_review.ts';
import adminFlagsRouter from './routes/admin-flags.ts';
import auditEventsRouter from './routes/audit-events.ts';
import brandPackRouter from './services/brand-packs/brand-pack.routes.ts';
import { centralizedErrorHandler } from './middleware/error-handling-middleware.ts';
import pluginAdminRouter from './routes/plugins/plugin-admin.ts';
import integrationAdminRouter from './routes/integrations/integration-admin.ts';
import securityAdminRouter from './routes/security/security-admin.ts';
import complianceAdminRouter from './routes/compliance/compliance-admin.ts';
import sandboxAdminRouter from './routes/sandbox/sandbox-admin.ts';
import adminTenantsRouter from './routes/admin/tenants.ts';
import onboardingRouter from './routes/onboarding.ts';
import supportCenterRouter from './routes/support-center.ts';
import i18nRouter from './routes/i18n.ts';
import experimentationRouter from './routes/experimentation.ts';
import { v4Router } from './routes/v4/index.ts';
import vectorStoreRouter from './routes/vector-store.ts';
import intelGraphRouter from './routes/intel-graph.ts';
import graphragRouter from './routes/graphrag.ts';
import intentRouter from './routes/intent.ts';

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
    .map((origin: string) => origin.trim())
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
  app.use(compression());

  app.use(hpp());

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

  // Rate limiting - applied early to prevent abuse
  // Public rate limit applies to all routes as baseline protection
  app.use(publicRateLimit);

  // Enhanced Pino HTTP logger with correlation and trace context
  const pinoHttpInstance = typeof pinoHttp === 'function' ? pinoHttp : (pinoHttp as any).pinoHttp;
  if (process.env.NODE_ENV === 'test') {
    console.log('DEBUG: appLogger type:', typeof appLogger);
    console.log('DEBUG: appLogger has levels:', !!(appLogger as any).levels);
    if ((appLogger as any).levels) {
      console.log('DEBUG: appLogger.levels.values:', (appLogger as any).levels.values);
    }
  }
  // Skip pino-http in test environment to avoid mock issues
  if (cfg.NODE_ENV !== 'test') {
    app.use(
      pinoHttpInstance({
        logger: appLogger,
        customProps: (req: any) => ({
          correlationId: req.correlationId,
          traceId: req.traceId,
          spanId: req.spanId,
          userId: req.user?.sub || req.user?.id,
          tenantId: req.user?.tenant_id || req.user?.tenantId,
        }),
      }),
    );
  }
  app.use(requestProfilingMiddleware);

  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res: any, buf: Buffer) => {
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
  } = await import('./config/production-security.ts');

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

        if (token) {
          return next();
        }

        // SEC-2025-001: Fail Closed by default.
        // Only allow bypass if explicitly enabled via env var.
        if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true') {
          console.warn('Development: No token provided, allowing request (ENABLE_INSECURE_DEV_AUTH=true)');
          (req as any).user = {
            sub: 'dev-user',
            email: 'dev@intelgraph.local',
            role: 'admin',
          };
          return next();
        }

        // Default: Reject unauthenticated requests even in dev/test if bypass not enabled
        res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
      };

  // Helper to bypass public webhooks from strict tenant/auth enforcement
  const isPublicWebhook = (req: any) => {
    // req.path is relative to the mount point (/api or /graphql)
    return (
      req.path.startsWith('/webhooks/github') ||
      req.path.startsWith('/webhooks/jira') ||
      req.path.startsWith('/webhooks/lifecycle')
    );
  };

  // Resolve and enforce tenant context for API and GraphQL surfaces
  app.use(['/api', '/graphql'], (req, res, next) => {
    if (isPublicWebhook(req)) return next();
    return tenantContextMiddleware()(req, res, next);
  });

  app.use(['/api', '/graphql'], admissionControl);

  // Authenticated rate limiting for API and GraphQL routes
  app.use(['/api', '/graphql'], (req, res, next) => {
    if (isPublicWebhook(req)) return next();
    return authenticatedRateLimit(req, res, next);
  });

  // Enforce Data Residency
  app.use(['/api', '/graphql'], (req, res, next) => {
    // Webhooks might process data, but residency checks typically require tenant context
    if (isPublicWebhook(req)) return next();
    return residencyEnforcement(req, res, next);
  });

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
  const healthRouter = (await import('./routes/health.ts')).default;
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
    } catch (err: any) {
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
  app.use('/api/policies', policyManagementRouter);
  app.use('/policies', policyManagementRouter);
  app.use('/api/receipts', receiptsRouter);
  app.use('/api/brand-packs', brandPackRouter);
  app.use(['/monitoring', '/api/monitoring'], monitoringRouter);
  app.use('/api', monitoringBackpressureRouter);
  app.use('/api/ga-core-metrics', gaCoreMetricsRouter);
  if (process.env.SKIP_AI_ROUTES !== 'true') {
    const { default: aiRouter } = await import('./routes/ai.ts');
    app.use('/api/ai', aiRouter);
  }
  app.use('/api/ai/nl-graph-query', nlGraphQueryRouter);
  app.use('/api/narrative-sim', narrativeSimulationRouter);
  app.use('/api/predictive', predictiveRouter);
  app.use('/api/export', disclosuresRouter); // Mount export under /api/export as per spec
  app.use('/disclosures', disclosuresRouter); // Keep old mount for compat
  app.use('/rbac', rbacRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/er', entityResolutionRouter);
  app.use('/api/workspaces', workspaceRouter);
  if (process.env.SKIP_WEBHOOKS !== 'true') {
    const { default: webhookRouter } = await import('./routes/webhooks.ts');
    app.use('/api/webhooks', webhookRouter);
  }
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
  app.use('/api/mcp-apps', mcpAppsRouter);
  app.use('/api/tenants', tenantsRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/osint', osintRouter);

  app.use('/api/meta-orchestrator', metaOrchestratorRouter);
  app.use('/api', adminSmokeRouter);
  app.use('/api/scenarios', scenarioRouter);
  app.use('/api/costs', resourceCostsRouter);
  app.use('/api/tenants/:tenantId/billing', tenantBillingRouter);
  app.use('/api/tenants/:tenantId/usage', tenantUsageRouter);
  app.use('/api/internal/command-console', commandConsoleRouter);

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
  app.use('/api/policy-proposals', authenticateToken, policyProposalsRouter);
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
  app.use('/api/admin', adminTenantsRouter);
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
  app.use('/api/intent', intentRouter);
  app.get('/metrics', metricsRoute);

  // Initialize SummitInvestigate Platform Routes
  SummitInvestigate.initialize(app);
  process.stdout.write('[DEBUG] SummitInvestigate initialized\n');
  // Maestro
  const { buildMaestroRouter } = await import('./routes/maestro_routes.ts');
  const { Maestro } = await import('./maestro/core.ts');
  const { MaestroQueries } = await import('./maestro/queries.ts');
  const { IntelGraphClientImpl } = await import('./intelgraph/client-impl.ts');
  const { CostMeter } = await import('./maestro/cost_meter.ts');

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
  process.stdout.write('[DEBUG] Maestro router built\n');

  // Initialize Maestro V2 Engine & Handlers (Stable-DiffCoder Integration)
  try {
    const { MaestroEngine } = await import('./maestro/engine.ts');
    const { MaestroHandlers } = await import('./maestro/handlers.ts');
    const { MaestroAgentService } = await import('./maestro/agent_service.ts');
    const { DiffusionCoderAdapter } = await import('./maestro/adapters/diffusion_coder.ts');
    const { getPostgresPool } = await import('./db/postgres.ts');
    const { getRedisClient } = await import('./db/redis.ts');

    const pool = getPostgresPool();
    const redis = getRedisClient();

    const engineV2 = new MaestroEngine({
      db: pool as any,
      redisConnection: redis
    });

    const agentService = new MaestroAgentService(pool as any);

    // Adapt LLM for V2 Handlers
    const llmServiceV2 = {
      callCompletion: async (runId: string, taskId: string, payload: any) => {
         const result = await llmClient.callCompletion(payload.messages[payload.messages.length-1].content, payload.model);
         return {
           content: typeof result === 'string' ? result : (result as any).content || JSON.stringify(result),
           usage: { total_tokens: 0 }
         };
      }
    };

    const diffusionCoder = new DiffusionCoderAdapter(llmServiceV2 as any);

    const handlersV2 = new MaestroHandlers(
      engineV2,
      agentService,
      llmServiceV2 as any,
      { executeAlgorithm: async () => ({}) } as any,
      diffusionCoder
    );

    handlersV2.registerAll();
    process.stdout.write('[DEBUG] Maestro V2 Engine & Handlers initialized\n');
  } catch (err) {
    appLogger.error({ err }, 'Failed to initialize Maestro V2 Engine');
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

      const evidence = searchResult.records.map((record: any) => ({
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
    } catch (error: any) {
      appLogger.error(
        `Error in search/evidence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      res.status(500).send({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  });

  if (process.env.SKIP_GRAPHQL !== 'true') {
    const { typeDefs } = await import('./graphql/schema.ts');
    const { default: resolvers } = await import('./graphql/resolvers/index.ts');
    process.stdout.write('[DEBUG] GraphQL resolvers imported\n');

    const executableSchema = makeExecutableSchema({
      typeDefs: typeDefs as any,
      resolvers: resolvers as any,
    });

    const schema = executableSchema; // applyMiddleware(executableSchema, licenseRuleValidationMiddleware);

    // GraphQL over HTTP
    const { persistedQueriesPlugin } = await import(
      './graphql/plugins/persistedQueries.ts'
    );
    const { default: pbacPlugin } = await import('./graphql/plugins/pbac.ts');
    const { default: resolverMetricsPlugin } = await import(
      './graphql/plugins/resolverMetrics.ts'
    );
    const { default: auditLoggerPlugin } = await import(
      './graphql/plugins/auditLogger.ts'
    );
    const { depthLimit } = await import('./graphql/validation/depthLimit.ts');
    const { rateLimitAndCachePlugin } = await import('./graphql/plugins/rateLimitAndCache.ts');
    const { httpStatusCodePlugin } = await import('./graphql/plugins/httpStatusCodePlugin.ts');

    const apollo = new ApolloServer({
      schema,
      // Security plugins - Order matters for execution lifecycle
      plugins: [
        httpStatusCodePlugin(), // Must be first to set HTTP status codes
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
    process.stdout.write('[DEBUG] Apollo Server created, starting...\n');
    await apollo.start();
    process.stdout.write('[DEBUG] Apollo Server started\n');

    app.use(
      '/graphql',
      express.json(),
      authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
      advancedRateLimiter.middleware(), // Applied AFTER authentication to enable per-user limits
      // Note: Type assertion needed due to duplicate @apollo/server in monorepo node_modules
      expressMiddleware(apollo as any, {
        context: async ({ req }) => getContext({ req: req as any })
      }) as unknown as express.RequestHandler,
    );
  } else {
    appLogger.warn('GraphQL disabled via SKIP_GRAPHQL');
  }

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

  if (process.env.SKIP_WEBHOOKS !== 'true') {
    // Ensure webhook worker is running (it's an auto-starting worker, but importing it ensures it's registered)
    // In a real production setup, this might be in a separate process/container.
    // For MVP/Monolith, we keep it here.
    const { webhookWorker } = await import('./webhooks/webhook.worker.ts');
    if (webhookWorker) {
      // Just referencing it to prevent tree-shaking/unused variable lint errors if any,
      // though import side-effects usually suffice.
    }
  }

  appLogger.info('Anomaly detector activated.');

  // Global Error Handler - must be last
  app.use(centralizedErrorHandler);

  return app;
};
