"use strict";
// @ts-nocheck
/**
 * AI Service Deployment Platform
 *
 * Instant rollout platform for AI services with built-in compliance
 * and performance analytics. Deploy in hours, not months.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const service_registry_js_1 = require("./core/service-registry.js");
const deployment_orchestrator_js_1 = require("./core/deployment-orchestrator.js");
const compliance_engine_js_1 = require("./compliance/compliance-engine.js");
const analytics_collector_js_1 = require("./analytics/analytics-collector.js");
const template_library_js_1 = require("./templates/template-library.js");
const health_js_1 = require("./routes/health.js");
const services_js_1 = require("./routes/services.js");
const deployments_js_1 = require("./routes/deployments.js");
const analytics_js_1 = require("./routes/analytics.js");
const templates_js_1 = require("./routes/templates.js");
const prometheus_js_1 = require("./metrics/prometheus.js");
const config_js_1 = require("./config.js");
const server = (0, fastify_1.default)({
    logger: {
        level: config_js_1.config.logLevel,
        transport: config_js_1.config.nodeEnv === 'development'
            ? { target: 'pino-pretty' }
            : undefined,
    },
});
exports.server = server;
// Core platform components
const serviceRegistry = new service_registry_js_1.ServiceRegistry();
const complianceEngine = new compliance_engine_js_1.ComplianceEngine();
const analyticsCollector = new analytics_collector_js_1.AnalyticsCollector();
const templateLibrary = new template_library_js_1.TemplateLibrary();
const deploymentOrchestrator = new deployment_orchestrator_js_1.DeploymentOrchestrator(serviceRegistry, complianceEngine, analyticsCollector);
async function start() {
    // Security middleware
    await server.register(cors_1.default, { origin: config_js_1.config.corsOrigins });
    await server.register(helmet_1.default);
    // Decorate with platform components
    server.decorate('serviceRegistry', serviceRegistry);
    server.decorate('deploymentOrchestrator', deploymentOrchestrator);
    server.decorate('complianceEngine', complianceEngine);
    server.decorate('analyticsCollector', analyticsCollector);
    server.decorate('templateLibrary', templateLibrary);
    // Register routes
    await server.register(health_js_1.healthRoutes);
    await server.register(services_js_1.serviceRoutes, { prefix: '/api/v1/services' });
    await server.register(deployments_js_1.deploymentRoutes, { prefix: '/api/v1/deployments' });
    await server.register(analytics_js_1.analyticsRoutes, { prefix: '/api/v1/analytics' });
    await server.register(templates_js_1.templateRoutes, { prefix: '/api/v1/templates' });
    // Prometheus metrics
    (0, prometheus_js_1.setupMetrics)(server);
    // Initialize components
    await serviceRegistry.initialize();
    await complianceEngine.initialize();
    await analyticsCollector.initialize();
    await templateLibrary.loadBuiltInTemplates();
    await server.listen({ port: config_js_1.config.port, host: '0.0.0.0' });
    server.log.info(`AI Service Platform running on http://0.0.0.0:${config_js_1.config.port}`);
    server.log.info('Ready to deploy AI services in hours, not months!');
}
start().catch((err) => {
    console.error('Failed to start AI Service Platform:', err);
    process.exit(1);
});
