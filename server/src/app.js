"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const graphql_1 = require("graphql");
const express4_1 = require("@as-integrations/express4");
const schema_1 = require("@graphql-tools/schema");
// import { applyMiddleware } from 'graphql-middleware';
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const hpp_1 = __importDefault(require("hpp"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const pinoHttp = pino_http_1.default.default || pino_http_1.default;
const logger_js_1 = require("./config/logger.js");
const comprehensive_telemetry_js_1 = require("./lib/telemetry/comprehensive-telemetry.js");
const diagnostic_snapshotter_js_1 = require("./lib/telemetry/diagnostic-snapshotter.js");
const audit_logger_js_1 = require("./middleware/audit-logger.js");
const audit_first_js_1 = require("./middleware/audit-first.js");
const correlation_id_js_1 = require("./middleware/correlation-id.js");
const tracing_js_1 = require("./monitoring/tracing.js");
const feature_flag_context_js_1 = require("./middleware/feature-flag-context.js");
const sanitization_js_1 = require("./middleware/sanitization.js");
const pii_guard_js_1 = require("./middleware/pii-guard.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const auth_js_1 = require("./middleware/auth.js");
const TieredRateLimitMiddleware_js_1 = require("./middleware/TieredRateLimitMiddleware.js");
const circuitBreakerMiddleware_js_1 = require("./middleware/circuitBreakerMiddleware.js");
const overloadProtection_js_1 = require("./middleware/overloadProtection.js");
const AdmissionControl_js_1 = require("./runtime/backpressure/AdmissionControl.js");
const httpCache_js_1 = require("./middleware/httpCache.js");
const safety_mode_js_1 = require("./middleware/safety-mode.js");
const residency_js_1 = require("./middleware/residency.js");
const request_profiling_js_1 = require("./middleware/request-profiling.js");
const securityHeaders_js_1 = require("./middleware/securityHeaders.js");
const security_hardening_js_1 = require("./middleware/security-hardening.js");
const abuseGuard_js_1 = require("./middleware/abuseGuard.js");
const routes_js_1 = __importDefault(require("./data-residency/exceptions/routes.js"));
const monitoring_js_1 = __importDefault(require("./routes/monitoring.js"));
const billing_js_1 = __importDefault(require("./routes/billing.js"));
const entity_resolution_js_1 = __importDefault(require("./routes/entity-resolution.js"));
const workspaces_js_1 = __importDefault(require("./routes/workspaces.js"));
const ga_core_metrics_js_1 = __importDefault(require("./routes/ga-core-metrics.js"));
const nl_graph_query_js_1 = __importDefault(require("./routes/nl-graph-query.js"));
const disclosures_js_1 = __importDefault(require("./routes/disclosures.js"));
const narrative_sim_js_1 = __importDefault(require("./routes/narrative-sim.js"));
const narrative_routes_js_1 = __importDefault(require("./routes/narrative-routes.js"));
const receipts_js_1 = __importDefault(require("./routes/receipts.js"));
const predictive_js_1 = __importDefault(require("./routes/predictive.js"));
const policy_management_js_1 = __importDefault(require("./routes/policies/policy-management.js"));
const metricsRoute_js_1 = require("./http/metricsRoute.js");
const monitoring_backpressure_js_1 = __importDefault(require("./routes/monitoring-backpressure.js"));
const rbacRoutes_js_1 = __importDefault(require("./routes/rbacRoutes.js"));
// import { licenseRuleValidationMiddleware } from './graphql/middleware/licenseRuleValidationMiddleware.js';
const auth_js_2 = require("./lib/auth.js");
const neo4j_js_1 = require("./db/neo4j.js");
const tracer_js_1 = require("./observability/tracer.js");
const trustScoreWorker_js_1 = require("./workers/trustScoreWorker.js");
const retentionWorker_js_1 = require("./workers/retentionWorker.js");
const config_js_1 = require("./config.js");
const support_tickets_js_1 = __importDefault(require("./routes/support-tickets.js"));
const ticket_links_js_1 = __importDefault(require("./routes/ticket-links.js"));
const tenantContext_js_1 = __importDefault(require("./middleware/tenantContext.js"));
const sharing_js_1 = __importDefault(require("./routes/sharing.js"));
const aurora_js_1 = require("./routes/aurora.js");
const oracle_js_1 = require("./routes/oracle.js");
const phantom_limb_js_1 = require("./routes/phantom_limb.js");
const actions_js_1 = require("./routes/actions.js");
const echelon2_js_1 = require("./routes/echelon2.js");
const mnemosyne_js_1 = require("./routes/mnemosyne.js");
const necromancer_js_1 = require("./routes/necromancer.js");
const zero_day_js_1 = require("./routes/zero_day.js");
const abyss_js_1 = require("./routes/abyss.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const sso_js_1 = __importDefault(require("./routes/sso.js"));
const qaf_js_1 = __importDefault(require("./routes/qaf.js"));
const siem_platform_js_1 = __importDefault(require("./routes/siem-platform.js"));
const maestro_js_1 = __importDefault(require("./routes/maestro.js"));
const mcp_apps_js_1 = __importDefault(require("./routes/mcp-apps.js"));
const cases_js_1 = __importDefault(require("./routes/cases.js"));
const entity_comments_js_1 = __importDefault(require("./routes/entity-comments.js"));
const tenants_js_1 = __importDefault(require("./routes/tenants.js"));
const SummitInvestigate_js_1 = require("./services/SummitInvestigate.js");
const stream_js_1 = require("./ingest/stream.js");
const osint_js_1 = __importDefault(require("./routes/osint.js"));
const palettes_js_1 = __importDefault(require("./routes/palettes.js"));
const outreach_js_1 = __importDefault(require("./routes/outreach.js"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_js_1 = require("./config/swagger.js");
const meta_orchestrator_js_1 = __importDefault(require("./routes/meta-orchestrator.js"));
const admin_smoke_js_1 = __importDefault(require("./routes/admin-smoke.js"));
const scenarios_js_1 = __importDefault(require("./routes/scenarios.js"));
const resource_costs_js_1 = __importDefault(require("./routes/resource-costs.js"));
const stream_js_2 = __importDefault(require("./routes/stream.js")); // Added import
const query_preview_stream_js_1 = __importDefault(require("./routes/query-preview-stream.js"));
const correctness_program_js_1 = __importDefault(require("./routes/correctness-program.js"));
const command_console_js_1 = __importDefault(require("./routes/internal/command-console.js"));
const search_v1_js_1 = __importDefault(require("./routes/search-v1.js"));
const ontology_js_1 = __importDefault(require("./routes/ontology.js"));
const search_index_js_1 = __importDefault(require("./routes/search-index.js")); // New search-index route
const data_governance_routes_js_1 = __importDefault(require("./routes/data-governance-routes.js"));
const billing_js_2 = __importDefault(require("./routes/tenants/billing.js"));
const usage_js_1 = __importDefault(require("./routes/tenants/usage.js"));
const gtm_messaging_js_1 = require("./routes/gtm-messaging.js");
const airgap_js_1 = require("./routes/airgap.js");
const analytics_js_1 = __importDefault(require("./routes/analytics.js"));
const experiments_js_1 = __importDefault(require("./routes/experiments.js"));
const cohorts_js_1 = __importDefault(require("./routes/cohorts.js"));
const funnels_js_1 = __importDefault(require("./routes/funnels.js"));
const anomalies_js_1 = __importDefault(require("./routes/anomalies.js"));
const exports_js_1 = __importDefault(require("./routes/exports.js"));
const retention_js_1 = __importDefault(require("./routes/retention.js"));
const dr_js_1 = __importDefault(require("./routes/dr.js"));
const reporting_js_1 = __importDefault(require("./routes/reporting.js"));
const policy_profiles_js_1 = __importDefault(require("./routes/policy-profiles.js"));
const policy_proposals_js_1 = __importDefault(require("./routes/policy-proposals.js"));
const evidence_js_1 = __importDefault(require("./routes/evidence.js"));
const mastery_js_1 = __importDefault(require("./routes/mastery.js"));
const crypto_intelligence_js_1 = __importDefault(require("./routes/crypto-intelligence.js"));
const demo_js_1 = __importDefault(require("./routes/demo.js"));
const claims_js_1 = __importDefault(require("./routes/claims.js"));
const ops_js_1 = __importDefault(require("./routes/ops.js"));
const feature_flags_js_1 = __importDefault(require("./routes/feature-flags.js"));
const ml_review_js_1 = __importDefault(require("./routes/ml_review.js"));
const admin_flags_js_1 = __importDefault(require("./routes/admin-flags.js"));
const audit_events_js_1 = __importDefault(require("./routes/audit-events.js"));
const brand_pack_routes_js_1 = __importDefault(require("./services/brand-packs/brand-pack.routes.js"));
const federated_campaign_radar_js_1 = __importDefault(require("./routes/federated-campaign-radar.js"));
const error_handling_middleware_js_1 = require("./middleware/error-handling-middleware.js");
const plugin_admin_js_1 = __importDefault(require("./routes/plugins/plugin-admin.js"));
const integration_admin_js_1 = __importDefault(require("./routes/integrations/integration-admin.js"));
const security_admin_js_1 = __importDefault(require("./routes/security/security-admin.js"));
const compliance_admin_js_1 = __importDefault(require("./routes/compliance/compliance-admin.js"));
const sandbox_admin_js_1 = __importDefault(require("./routes/sandbox/sandbox-admin.js"));
const gateway_js_1 = __importDefault(require("./routes/admin/gateway.js"));
const onboarding_js_1 = __importDefault(require("./routes/onboarding.js"));
const support_center_js_1 = __importDefault(require("./routes/support-center.js"));
const i18n_js_1 = __importDefault(require("./routes/i18n.js"));
const experimentation_js_1 = __importDefault(require("./routes/experimentation.js"));
const index_js_1 = require("./routes/v4/index.js");
const vector_store_js_1 = __importDefault(require("./routes/vector-store.js"));
const intel_graph_js_1 = __importDefault(require("./routes/intel-graph.js"));
const graphrag_js_1 = __importDefault(require("./routes/graphrag.js"));
const intent_js_1 = __importDefault(require("./routes/intent.js"));
const routes_js_2 = __importDefault(require("./factflow/routes.js"));
const FailoverOrchestrator_js_1 = require("./runtime/global/FailoverOrchestrator.js");
const approvals_js_1 = require("./routes/approvals.js");
const ShadowTrafficMiddleware_js_1 = require("./middleware/ShadowTrafficMiddleware.js");
const createApp = async () => {
    // Initialize OpenTelemetry tracing
    // Tracer is already initialized in index.ts, but we ensure it's available here
    // Verified usage for comprehensive observability
    const tracer = (0, tracer_js_1.initializeTracing)();
    // Ensure initialized if this entry point is used standalone (e.g. tests)
    if (!tracer.isInitialized()) {
        await tracer.initialize();
    }
    const app = (0, express_1.default)();
    const logger = pino_1.default();
    const isProduction = config_js_1.cfg.NODE_ENV === 'production';
    const allowedOrigins = config_js_1.cfg.CORS_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    const securityHeadersEnabled = process.env.SECURITY_HEADERS_ENABLED !== 'false';
    const cspReportOnly = process.env.SECURITY_HEADERS_CSP_REPORT_ONLY === 'true';
    const cspEnabledFlag = process.env.SECURITY_HEADERS_CSP_ENABLED === 'true';
    const safetyState = await (0, safety_mode_js_1.resolveSafetyState)();
    if (safetyState.killSwitch || safetyState.safeMode) {
        logger_js_1.logger.warn({ safetyState }, 'Safety gates enabled');
    }
    // Add correlation ID middleware FIRST (before other middleware)
    app.use(correlation_id_js_1.correlationIdMiddleware);
    app.use(tracing_js_1.tracingService.expressMiddleware());
    app.use(feature_flag_context_js_1.featureFlagContextMiddleware);
    // SEC: Stripe webhook requires raw body for signature verification.
    // Mount it BEFORE express.json() to avoid consuming the stream.
    app.use('/api/stripe/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
        const { handleStripeWebhook } = await Promise.resolve().then(() => __importStar(require('./webhooks/stripe.js')));
        const { stripe } = await Promise.resolve().then(() => __importStar(require('@summit/billing')));
        const sig = req.headers['stripe-signature'];
        try {
            const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
            await handleStripeWebhook(event);
            res.json({ received: true });
        }
        catch (err) {
            console.error(`Stripe webhook error: ${err.message}`);
            res.status(400).send(`Webhook Error: ${err.message}`);
        }
    });
    // Load Shedding / Overload Protection (Second, to reject early)
    app.use(overloadProtection_js_1.overloadProtection);
    app.use((0, compression_1.default)());
    app.use((0, hpp_1.default)());
    app.use((0, securityHeaders_js_1.securityHeaders)({
        enabled: securityHeadersEnabled,
        allowedOrigins,
        enableCsp: cspEnabledFlag || isProduction,
        cspReportOnly,
    }));
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || config_js_1.cfg.NODE_ENV !== 'production') {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} not allowed by Summit CORS policy`));
        },
        credentials: true,
    }));
    // Rate limiting - applied early to prevent abuse
    // Public rate limit applies to all routes as baseline protection
    app.use(rateLimiter_js_1.publicRateLimit);
    app.use(abuseGuard_js_1.abuseGuard.middleware());
    // Enhanced Pino HTTP logger disabled due to symbol issues
    // app.use(pinoHttpInstance({ ... }));
    app.use((req, res, next) => {
        req.log = logger_js_1.logger;
        next();
    });
    app.use(request_profiling_js_1.requestProfilingMiddleware);
    app.use(express_1.default.json({
        limit: '1mb',
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use(sanitization_js_1.sanitizeInput);
    app.use(security_hardening_js_1.securityHardening);
    app.use(pii_guard_js_1.piiGuardMiddleware);
    app.use(safety_mode_js_1.safetyModeMiddleware);
    // Circuit Breaker Middleware - Fail fast if system is unstable
    app.use(circuitBreakerMiddleware_js_1.circuitBreakerMiddleware);
    // Standard audit logger for basic request tracking
    app.use(audit_logger_js_1.auditLogger);
    // Audit-First middleware for cryptographic stamping of sensitive operations
    app.use(audit_first_js_1.auditFirstMiddleware);
    app.use(httpCache_js_1.httpCacheMiddleware);
    // API Versioning Middleware (Epic 2: API v1.1 Default)
    app.use((req, res, next) => {
        const version = req.headers['x-ig-api-version'];
        if (!version) {
            // Default to v1.1 if not specified
            req.headers['x-ig-api-version'] = '1.1';
        }
        // Attach to request for downstream consumption
        req.apiVersion = req.headers['x-ig-api-version'];
        // Compat guard: If legacy client detected (v1.0), we might want to log or adjust behavior
        if (req.apiVersion === '1.0') {
            // Logic for v1.0 compatibility if needed
        }
        next();
    });
    // Production Authentication - Use proper JWT validation
    const { productionAuthMiddleware, applyProductionSecurity, } = await Promise.resolve().then(() => __importStar(require('./config/production-security.js')));
    // Apply security middleware based on environment
    if (config_js_1.cfg.NODE_ENV === 'production') {
        applyProductionSecurity(app);
    }
    const authenticateToken = config_js_1.cfg.NODE_ENV === 'production'
        ? productionAuthMiddleware
        : (req, res, next) => {
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
                req.user = {
                    sub: 'dev-user',
                    email: 'dev@intelgraph.local',
                    role: 'admin',
                    tenantId: 'global',
                    id: 'dev-user', // SEC-2025-002: Ensure downstream helpers rely on user object, not headers
                };
                return next();
            }
            // Default: Reject unauthenticated requests even in dev/test if bypass not enabled
            res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        };
    // Helper to bypass public webhooks from strict tenant/auth enforcement
    const isPublicWebhook = (req) => {
        // req.path is relative to the mount point (/api or /graphql)
        return (req.path.startsWith('/webhooks/github') ||
            req.path.startsWith('/webhooks/jira') ||
            req.path.startsWith('/webhooks/lifecycle'));
    };
    app.use(['/api', '/graphql'], (req, res, next) => {
        if (isPublicWebhook(req))
            return next();
        return (0, tenantContext_js_1.default)()(req, res, next);
    });
    app.use(['/api', '/graphql'], ShadowTrafficMiddleware_js_1.shadowTrafficMiddleware);
    app.use(['/api', '/graphql'], AdmissionControl_js_1.admissionControl);
    // Authenticated rate limiting for API and GraphQL routes
    app.use(['/api', '/graphql'], (req, res, next) => {
        if (isPublicWebhook(req))
            return next();
        return (0, rateLimiter_js_1.authenticatedRateLimit)(req, res, next);
    });
    // Enforce Data Residency
    app.use(['/api', '/graphql'], (req, res, next) => {
        // Webhooks might process data, but residency checks typically require tenant context
        if (isPublicWebhook(req))
            return next();
        return (0, residency_js_1.residencyEnforcement)(req, res, next);
    });
    // Residency Exception Routes
    app.use('/api/residency/exceptions', authenticateToken, routes_js_1.default);
    // Telemetry middleware
    app.use((req, res, next) => {
        diagnostic_snapshotter_js_1.snapshotter.trackRequest(req);
        const start = process.hrtime();
        comprehensive_telemetry_js_1.telemetry.incrementActiveConnections();
        comprehensive_telemetry_js_1.telemetry.subsystems.api.requests.add();
        res.on('finish', () => {
            diagnostic_snapshotter_js_1.snapshotter.untrackRequest(req);
            const diff = process.hrtime(start);
            const duration = diff[0] * 1e3 + diff[1] * 1e-6;
            comprehensive_telemetry_js_1.telemetry.recordRequest(duration, {
                method: req.method,
                route: req.route?.path ?? req.path,
                status: res.statusCode,
            });
            comprehensive_telemetry_js_1.telemetry.decrementActiveConnections();
            if (res.statusCode >= 500) {
                comprehensive_telemetry_js_1.telemetry.subsystems.api.errors.add();
            }
        });
        next();
    });
    // Health endpoints (exempt from rate limiting)
    const healthRouter = (await Promise.resolve().then(() => __importStar(require('./routes/health.js')))).default;
    app.use(healthRouter);
    // Swagger UI
    app.use('/api-docs', ...swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_js_1.swaggerSpec));
    // Global Rate Limiting (fallback for unauthenticated or non-specific routes)
    // Note: /graphql has its own rate limiting chain above
    app.use((req, res, next) => {
        if (req.path === '/graphql')
            return next(); // Skip global limiter for graphql, handled in route
        return TieredRateLimitMiddleware_js_1.advancedRateLimiter.middleware()(req, res, next);
    });
    // Admin Rate Limit Dashboard Endpoint
    // Requires authentication and admin role
    app.get('/api/admin/rate-limits/:userId', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
        try {
            const status = await TieredRateLimitMiddleware_js_1.advancedRateLimiter.getStatus(req.params.userId);
            res.json(status);
        }
        catch (err) {
            res.status(500).json({ error: 'Failed to fetch rate limit status' });
        }
    });
    // Authentication routes (exempt from global auth middleware)
    app.use('/auth', authRoutes_js_1.default);
    app.use('/auth/sso', sso_js_1.default);
    app.use('/api/auth', authRoutes_js_1.default); // Alternative path
    app.use('/sso', sso_js_1.default);
    // SEC-2025-002: Enforce authentication globally for /api routes
    // This mitigates the risk of missing authentication checks in individual routers.
    app.use('/api', (req, res, next) => {
        // Exempt known public paths (must be robust against mount point logic)
        // Note: req.path is relative to the mount point (/api)
        // Public Webhooks (e.g., GitHub, Jira)
        if (isPublicWebhook(req))
            return next();
        // Auth routes (redundant as they are mounted before, but good for safety)
        if (req.path.startsWith('/auth'))
            return next();
        // Health checks if exposed under /api
        if (req.path.startsWith('/health'))
            return next();
        return authenticateToken(req, res, next);
    });
    // Other routes
    // app.use('/api/policy', policyRouter);
    app.use('/api/policies', policy_management_js_1.default);
    app.use('/policies', policy_management_js_1.default);
    app.use('/api/receipts', receipts_js_1.default);
    app.use('/api/brand-packs', brand_pack_routes_js_1.default);
    app.use(['/monitoring', '/api/monitoring'], authenticateToken, monitoring_js_1.default);
    app.use('/api', monitoring_backpressure_js_1.default);
    app.use('/api/ga-core-metrics', ga_core_metrics_js_1.default);
    if (process.env.SKIP_AI_ROUTES !== 'true') {
        const { default: aiRouter } = await Promise.resolve().then(() => __importStar(require('./routes/ai.js')));
        app.use('/api/ai', aiRouter);
    }
    app.use('/api/ai/nl-graph-query', nl_graph_query_js_1.default);
    app.use('/api/narrative-sim', narrative_sim_js_1.default);
    app.use('/api/narrative', narrative_routes_js_1.default); // Visualization endpoints
    app.use('/api/predictive', predictive_js_1.default);
    app.use('/api/export', disclosures_js_1.default); // Mount export under /api/export as per spec
    app.use('/disclosures', disclosures_js_1.default); // Keep old mount for compat
    app.use('/rbac', rbacRoutes_js_1.default);
    app.use('/api/billing', billing_js_1.default);
    app.use('/api/er', entity_resolution_js_1.default);
    app.use('/api/workspaces', workspaces_js_1.default);
    if (process.env.SKIP_WEBHOOKS !== 'true') {
        const { default: webhookRouter } = await Promise.resolve().then(() => __importStar(require('./routes/webhooks.js')));
        app.use('/api/webhooks', webhookRouter);
    }
    app.use('/api/support', support_tickets_js_1.default);
    app.use('/api', ticket_links_js_1.default);
    app.use('/api/cases', cases_js_1.default);
    app.use('/api/entities', entity_comments_js_1.default);
    app.use('/api/aurora', aurora_js_1.auroraRouter);
    app.use('/api/oracle', oracle_js_1.oracleRouter);
    app.use('/api/phantom-limb', phantom_limb_js_1.phantomLimbRouter);
    app.use('/api/echelon2', echelon2_js_1.echelon2Router);
    app.use('/api/mnemosyne', mnemosyne_js_1.mnemosyneRouter);
    app.use('/api/necromancer', necromancer_js_1.necromancerRouter);
    app.use('/api/zero-day', zero_day_js_1.zeroDayRouter);
    app.use('/api/abyss', abyss_js_1.abyssRouter);
    app.use('/api/qaf', qaf_js_1.default);
    app.use('/api/siem-platform', siem_platform_js_1.default);
    app.use('/api/maestro', maestro_js_1.default);
    app.use('/api/mcp-apps', mcp_apps_js_1.default);
    app.use('/api/tenants', tenants_js_1.default);
    app.use('/api/actions', actions_js_1.actionsRouter);
    app.use('/api/osint', osint_js_1.default);
    app.use('/api/outreach', outreach_js_1.default);
    app.use('/api/meta-orchestrator', meta_orchestrator_js_1.default);
    app.use('/api', admin_smoke_js_1.default);
    app.use('/api/scenarios', scenarios_js_1.default);
    app.use('/api/costs', resource_costs_js_1.default);
    app.use('/api/tenants/:tenantId/billing', billing_js_2.default);
    app.use('/api/tenants/:tenantId/usage', usage_js_1.default);
    app.use('/api/internal/command-console', command_console_js_1.default);
    app.use('/api/correctness', correctness_program_js_1.default);
    app.use('/api', query_preview_stream_js_1.default);
    app.use('/api/stream', stream_js_2.default); // Register stream route
    app.use('/api/v1/search', search_v1_js_1.default); // Register Unified Search API
    app.use('/api/ontology', ontology_js_1.default);
    app.use('/search', search_index_js_1.default); // Register Search Index API
    app.use('/api', data_governance_routes_js_1.default); // Register Data Governance API
    app.use('/api', sharing_js_1.default);
    app.use('/api/gtm', gtm_messaging_js_1.gtmRouter);
    app.use('/airgap', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN']), airgap_js_1.airgapRouter);
    app.use('/analytics', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'ANALYST']), analytics_js_1.default);
    app.use('/api', experiments_js_1.default); // Mounts /api/experiments...
    app.use('/api', cohorts_js_1.default); // Mounts /api/cohorts...
    app.use('/api', funnels_js_1.default); // Mounts /api/funnels...
    app.use('/api', anomalies_js_1.default);
    app.use('/api', exports_js_1.default);
    app.use('/api', retention_js_1.default);
    app.use('/api/policy-profiles', policy_profiles_js_1.default);
    app.use('/api/policy-proposals', authenticateToken, policy_proposals_js_1.default);
    app.use('/api/evidence', evidence_js_1.default);
    app.use('/dr', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN']), dr_js_1.default);
    app.use('/', ops_js_1.default);
    app.use('/api/reporting', reporting_js_1.default);
    app.use('/api/mastery', mastery_js_1.default);
    app.use('/api/crypto-intelligence', crypto_intelligence_js_1.default);
    app.use('/api/demo', demo_js_1.default);
    app.use('/api/claims', claims_js_1.default);
    app.use('/api/feature-flags', feature_flags_js_1.default);
    app.use('/api/ml-reviews', ml_review_js_1.default);
    app.use('/api/admin/flags', admin_flags_js_1.default);
    app.use('/api', audit_events_js_1.default);
    app.use('/api', federated_campaign_radar_js_1.default);
    app.use('/api/admin', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), gateway_js_1.default);
    app.use('/api/plugins', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), plugin_admin_js_1.default);
    app.use('/api/integrations', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), integration_admin_js_1.default);
    app.use('/api/security', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), security_admin_js_1.default);
    app.use('/api/compliance', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), compliance_admin_js_1.default);
    app.use('/api/sandbox', authenticateToken, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), sandbox_admin_js_1.default);
    app.use('/api/v1/onboarding', onboarding_js_1.default);
    app.use('/api/v1/support', support_center_js_1.default);
    app.use('/api/v1/i18n', i18n_js_1.default);
    app.use('/api/v1/experiments', experimentation_js_1.default);
    app.use('/api/v1/palettes', palettes_js_1.default);
    // Summit v4 API Routes (AI Governance, Compliance, Zero-Trust)
    app.use('/api/v4', index_js_1.v4Router);
    // Vector Store Routes
    app.use('/api/vector-store', vector_store_js_1.default);
    app.use('/api/intel-graph', intel_graph_js_1.default);
    app.use('/api/graphrag', graphrag_js_1.default);
    app.use('/api/intent', intent_js_1.default);
    if (config_js_1.cfg.FACTFLOW_ENABLED) {
        app.use('/api/factflow', routes_js_2.default);
    }
    app.get('/metrics', metricsRoute_js_1.metricsRoute);
    // Re-added Approvals Router with Maestro context
    app.use('/api/approvals', authenticateToken, (0, approvals_js_1.buildApprovalsRouter)());
    // Initialize SummitInvestigate Platform Routes
    SummitInvestigate_js_1.SummitInvestigate.initialize(app);
    process.stdout.write('[DEBUG] SummitInvestigate initialized\n');
    // Maestro
    const { buildMaestroRouter } = await Promise.resolve().then(() => __importStar(require('./routes/maestro_routes.js')));
    const { Maestro } = await Promise.resolve().then(() => __importStar(require('./maestro/core.js')));
    const { MaestroQueries } = await Promise.resolve().then(() => __importStar(require('./maestro/queries.js')));
    const { IntelGraphClientImpl } = await Promise.resolve().then(() => __importStar(require('./intelgraph/client-impl.js')));
    const { CostMeter } = await Promise.resolve().then(() => __importStar(require('./maestro/cost_meter.js')));
    const igClient = new IntelGraphClientImpl();
    const costMeter = new CostMeter(igClient, {
        'openai:gpt-4.1': { inputPer1K: 0.01, outputPer1K: 0.03 },
    });
    // Simple LLM stub
    const llmClient = {
        apiKey: 'stub-key',
        costMeter,
        fakeOpenAIChatCompletion: async () => 'stub',
        callCompletion: async (prompt, model) => `[Stub LLM Response] for: ${prompt}`
    };
    const maestro = new Maestro(igClient, costMeter, llmClient, {
        defaultPlannerAgent: 'openai:gpt-4.1',
        defaultActionAgent: 'openai:gpt-4.1',
    });
    const maestroQueries = new MaestroQueries(igClient);
    app.use('/api/maestro', buildMaestroRouter(maestro, maestroQueries));
    app.use('/api/approvals', authenticateToken, (0, approvals_js_1.buildApprovalsRouter)(maestro)); // Re-mount with maestro context
    process.stdout.write('[DEBUG] Maestro router built\n');
    // Initialize Maestro V2 Engine & Handlers (Stable-DiffCoder Integration)
    try {
        const { MaestroEngine } = await Promise.resolve().then(() => __importStar(require('./maestro/engine.js')));
        const { MaestroHandlers } = await Promise.resolve().then(() => __importStar(require('./maestro/handlers.js')));
        const { MaestroAgentService } = await Promise.resolve().then(() => __importStar(require('./maestro/agent_service.js')));
        const { DiffusionCoderAdapter } = await Promise.resolve().then(() => __importStar(require('./maestro/adapters/diffusion_coder.js')));
        const { getPostgresPool } = await Promise.resolve().then(() => __importStar(require('./db/postgres.js')));
        const { getRedisClient } = await Promise.resolve().then(() => __importStar(require('./db/redis.js')));
        const pool = getPostgresPool();
        const redis = getRedisClient();
        const engineV2 = new MaestroEngine({
            db: pool,
            redisConnection: redis
        });
        const agentService = new MaestroAgentService(pool);
        // Adapt LLM for V2 Handlers
        const llmServiceV2 = {
            callCompletion: async (runId, taskId, payload) => {
                const result = await llmClient.callCompletion(payload.messages[payload.messages.length - 1].content, payload.model);
                return {
                    content: typeof result === 'string' ? result : result.content || JSON.stringify(result),
                    usage: { total_tokens: 0 }
                };
            }
        };
        const diffusionCoder = new DiffusionCoderAdapter(llmServiceV2);
        const handlersV2 = new MaestroHandlers(engineV2, agentService, llmServiceV2, { executeAlgorithm: async () => ({}) }, diffusionCoder);
        handlersV2.registerAll();
        process.stdout.write('[DEBUG] Maestro V2 Engine & Handlers initialized\n');
    }
    catch (err) {
        logger_js_1.logger.error({ err }, 'Failed to initialize Maestro V2 Engine');
    }
    app.get('/search/evidence', authenticateToken, (0, auth_js_1.ensureRole)(['admin', 'analyst']), async (req, res) => {
        const { q } = req.query;
        // SEC-DoS: Enforce pagination and offset limits
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
        const skip = Math.max(Number(req.query.skip) || 0, 0);
        if (!q) {
            return res.status(400).send({ error: "Query parameter 'q' is required" });
        }
        const tenantId = req.user?.tenantId || req.user?.tenant_id;
        if (!tenantId) {
            return res.status(403).send({ error: "Tenant context is required" });
        }
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            // SEC-TENANCY: Filter results by tenantId/tenant to prevent cross-tenant data leakage
            const searchQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node, score
        WHERE node.tenantId = $tenantId OR node.tenant = $tenantId
        RETURN node, score
        SKIP $skip
        LIMIT $limit
      `;
            const countQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node
        WHERE node.tenantId = $tenantId OR node.tenant = $tenantId
        RETURN count(node) as total
      `;
            const [searchResult, countResult] = await Promise.all([
                session.run(searchQuery, {
                    query: q,
                    tenantId,
                    skip: Number(skip),
                    limit,
                }),
                session.run(countQuery, { query: q, tenantId }),
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
        }
        catch (error) {
            logger_js_1.logger.error(`Error in search/evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).send({ error: 'Internal server error' });
        }
        finally {
            await session.close();
        }
    });
    if (process.env.SKIP_GRAPHQL !== 'true') {
        const { typeDefs } = await Promise.resolve().then(() => __importStar(require('./graphql/schema.js')));
        const { default: resolvers } = await Promise.resolve().then(() => __importStar(require('./graphql/resolvers/index.js')));
        process.stdout.write('[DEBUG] GraphQL resolvers imported\n');
        const executableSchema = (0, schema_1.makeExecutableSchema)({
            typeDefs: typeDefs,
            resolvers: resolvers,
        });
        const schema = executableSchema; // applyMiddleware(executableSchema, licenseRuleValidationMiddleware);
        // GraphQL over HTTP
        const { persistedQueriesPlugin } = await Promise.resolve().then(() => __importStar(require('./graphql/plugins/persistedQueries.js')));
        const { default: pbacPlugin } = await Promise.resolve().then(() => __importStar(require('./graphql/plugins/pbac.js')));
        const { default: resolverMetricsPlugin } = await Promise.resolve().then(() => __importStar(require('./graphql/plugins/resolverMetrics.js')));
        const { default: auditLoggerPlugin } = await Promise.resolve().then(() => __importStar(require('./graphql/plugins/auditLogger.js')));
        const { depthLimit } = await Promise.resolve().then(() => __importStar(require('./graphql/validation/depthLimit.js')));
        const { rateLimitAndCachePlugin } = await Promise.resolve().then(() => __importStar(require('./graphql/plugins/rateLimitAndCache.js')));
        const { httpStatusCodePlugin } = await Promise.resolve().then(() => __importStar(require('./graphql/plugins/httpStatusCodePlugin.js')));
        const apollo = new server_1.ApolloServer({
            schema,
            // Security plugins - Order matters for execution lifecycle
            plugins: [
                httpStatusCodePlugin(), // Must be first to set HTTP status codes
                persistedQueriesPlugin,
                resolverMetricsPlugin,
                auditLoggerPlugin,
                // rateLimitAndCachePlugin(schema) as any,
                // Enable PBAC in production
                ...(config_js_1.cfg.NODE_ENV === 'production' ? [pbacPlugin()] : []),
            ],
            // Security configuration based on environment
            introspection: config_js_1.cfg.NODE_ENV !== 'production',
            // Enhanced query validation rules
            validationRules: [
                depthLimit(config_js_1.cfg.NODE_ENV === 'production' ? 6 : 8), // Stricter in prod
            ],
            // Security context
            formatError: (formattedError, error) => {
                // Always allow introspection errors (dev) or client-side validation errors
                if (formattedError.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' ||
                    formattedError.extensions?.code === 'BAD_USER_INPUT' ||
                    formattedError.extensions?.code === 'UNAUTHENTICATED' ||
                    formattedError.extensions?.code === 'FORBIDDEN') {
                    return formattedError;
                }
                // In production, mask everything else as Internal Server Error
                if (config_js_1.cfg.NODE_ENV === 'production') {
                    logger_js_1.logger.error({ err: error, stack: error?.stack }, `GraphQL Error: ${formattedError.message}`);
                    return new graphql_1.GraphQLError('Internal server error', {
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
        app.use('/graphql', express_1.default.json(), authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
        ...(process.env.SKIP_RATE_LIMITS === 'true' ? [] : [TieredRateLimitMiddleware_js_1.advancedRateLimiter.middleware()]), // Applied AFTER authentication to enable per-user limits
        (0, express4_1.expressMiddleware)(apollo, {
            context: async ({ req }) => (0, auth_js_2.getContext)({ req: req })
        }));
    }
    else {
        logger_js_1.logger.warn('GraphQL disabled via SKIP_GRAPHQL');
    }
    if (!safetyState.killSwitch && !safetyState.safeMode && process.env.NODE_ENV !== 'test') {
        // Start background trust worker if enabled
        (0, trustScoreWorker_js_1.startTrustWorker)();
        // Start retention worker if enabled
        (0, retentionWorker_js_1.startRetentionWorker)();
        // Start streaming ingestion if enabled (Epic B)
        if (config_js_1.cfg.KAFKA_ENABLED) {
            stream_js_1.streamIngest.start(['ingest-events']).catch(err => {
                logger_js_1.logger.error({ err }, 'Failed to start streaming ingestion');
            });
        }
        else {
            logger_js_1.logger.info('Streaming ingestion disabled (KAFKA_ENABLED=false)');
        }
    }
    else {
        logger_js_1.logger.warn({ safetyState, env: process.env.NODE_ENV }, 'Skipping background workers because safety mode, kill switch or test environment is enabled');
    }
    if (process.env.SKIP_WEBHOOKS !== 'true') {
        // Ensure webhook worker is running (it's an auto-starting worker, but importing it ensures it's registered)
        // In a real production setup, this might be in a separate process/container.
        // For MVP/Monolith, we keep it here.
        const { webhookWorker } = await Promise.resolve().then(() => __importStar(require('./webhooks/webhook.worker.js')));
        if (webhookWorker) {
            // Just referencing it to prevent tree-shaking/unused variable lint errors if any,
            // though import side-effects usually suffice.
        }
    }
    logger_js_1.logger.info('Anomaly detector activated.');
    if (process.env.NODE_ENV !== 'test') {
        // Start regional failover monitoring
        FailoverOrchestrator_js_1.failoverOrchestrator.start();
    }
    // Global Error Handler - must be last
    app.use(error_handling_middleware_js_1.centralizedErrorHandler);
    return app;
};
exports.createApp = createApp;
