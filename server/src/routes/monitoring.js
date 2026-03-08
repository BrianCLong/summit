"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Monitoring and observability endpoints
 */
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const metrics_js_1 = require("../monitoring/metrics.js");
const index_js_1 = require("../observability/index.js");
const health_js_1 = require("../monitoring/health.js");
const businessMetrics_js_1 = require("../monitoring/businessMetrics.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
/**
 * @openapi
 * /monitoring/metrics:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Prometheus metrics endpoint
 *     description: Returns Prometheus metrics for the application.
 *     responses:
 *       200:
 *         description: Metrics data
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.\n# TYPE process_cpu_user_seconds_total counter\nprocess_cpu_user_seconds_total 0.12\n"
 *       500:
 *         description: Failed to collect metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
router.get('/metrics', (0, auth_js_1.requirePermission)('system:metrics'), async (req, res) => {
    try {
        res.set('Content-Type', metrics_js_1.register.contentType);
        const metrics = await metrics_js_1.register.metrics();
        res.end(metrics);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to collect metrics',
            details: error.message,
        });
    }
});
/**
 * @openapi
 * /monitoring/health:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Comprehensive health check
 *     description: Performs a full health check of the system including dependencies.
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *       503:
 *         description: System is unhealthy
 */
router.get('/health', async (req, res) => {
    try {
        const health = await (0, health_js_1.performHealthCheck)();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * @openapi
 * /monitoring/health/quick:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Quick health check (cached)
 *     description: Returns the cached health status of the system.
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *       503:
 *         description: System is unhealthy
 */
router.get('/health/quick', (req, res) => {
    try {
        const health = (0, health_js_1.getCachedHealthStatus)();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * @openapi
 * /monitoring/health/live:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Kubernetes liveness probe
 *     description: Checks if the application is alive.
 *     responses:
 *       200:
 *         description: Application is alive
 *       503:
 *         description: Application is not alive
 */
router.get('/health/live', async (req, res) => {
    try {
        const liveness = await (0, health_js_1.livenessProbe)();
        res.status(200).json(liveness);
    }
    catch (error) {
        res.status(503).json({
            status: 'not_alive',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * @openapi
 * /monitoring/health/ready:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Kubernetes readiness probe
 *     description: Checks if the application is ready to serve traffic.
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/health/ready', async (req, res) => {
    try {
        const readiness = await (0, health_js_1.readinessProbe)();
        const statusCode = readiness.status === 'ready' ? 200 : 503;
        res.status(statusCode).json(readiness);
    }
    catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * @openapi
 * /monitoring/health/info:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: System information endpoint
 *     description: Returns information about the system environment and resources.
 *     responses:
 *       200:
 *         description: System information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 uptime:
 *                   type: number
 */
router.get('/health/info', (req, res) => {
    const info = {
        service: 'intelgraph-server',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
    };
    res.json(info);
});
/**
 * Individual service health checks
 */
// Database health
router.get('/health/database', async (req, res) => {
    try {
        const dbHealth = await (0, health_js_1.checkDatabase)();
        const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(dbHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// Neo4j health
router.get('/health/neo4j', async (req, res) => {
    try {
        const neo4jHealth = await (0, health_js_1.checkNeo4j)();
        const statusCode = neo4jHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(neo4jHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// Redis health
router.get('/health/redis', async (req, res) => {
    try {
        const redisHealth = await (0, health_js_1.checkRedis)();
        const statusCode = redisHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(redisHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// ML service health
router.get('/health/ml', async (req, res) => {
    try {
        const mlHealth = await (0, health_js_1.checkMlService)();
        const statusCode = mlHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(mlHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// System resources health
router.get('/health/system', (req, res) => {
    try {
        const systemHealth = (0, health_js_1.checkSystemResources)();
        const statusCode = systemHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(systemHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
const businessMetricSchema = zod_1.z.object({
    type: zod_1.z.enum(['user_signup', 'api_call', 'revenue']),
    tenant: zod_1.z.string().min(1).optional(),
    plan: zod_1.z.string().min(1).optional(),
    service: zod_1.z.string().min(1).optional(),
    route: zod_1.z.string().min(1).optional(),
    statusCode: zod_1.z.number().int().optional(),
    amount: zod_1.z.number().optional(),
    currency: zod_1.z.string().min(1).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
/**
 * @openapi
 * /monitoring/metrics/business:
 *   post:
 *     tags:
 *       - Monitoring
 *     summary: Record business metrics
 *     description: Records a business-related metric event.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [user_signup, api_call, revenue]
 *               tenant:
 *                 type: string
 *               plan:
 *                 type: string
 *               service:
 *                 type: string
 *               route:
 *                 type: string
 *               statusCode:
 *                 type: number
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       202:
 *         description: Metric recorded
 *       400:
 *         description: Invalid payload
 */
router.post('/metrics/business', (req, res) => {
    try {
        const payload = businessMetricSchema.parse(req.body);
        (0, businessMetrics_js_1.recordBusinessEvent)(payload);
        res.status(202).json({
            status: 'accepted',
            recordedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(400).json({
            error: 'Invalid business metric payload',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
/**
 * @openapi
 * /monitoring/web-vitals:
 *   post:
 *     tags:
 *       - Monitoring
 *     summary: Collect Web Vitals metrics
 *     description: Endpoint for collecting Web Vitals metrics from frontend clients.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: number
 *               id:
 *                 type: string
 *     responses:
 *       204:
 *         description: Metric recorded successfully
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to record metric
 */
router.post('/web-vitals', (req, res) => {
    // Receives LCP, CLS, INP from frontend via reportWebVitals.ts
    const { name, value, id } = req.body || {};
    if (typeof name !== 'string' || typeof value !== 'number') {
        return res.status(400).json({ error: 'Invalid web vitals payload' });
    }
    try {
        metrics_js_1.webVitalValue.set({ metric: name, id: id || 'unknown' }, value);
        // Also observe into histogram. Note: CLS is unitless (0-1), LCP/INP are milliseconds.
        // Convert LCP/INP/FID/TTFB/FCP to seconds.
        let observedValue = value;
        if (['LCP', 'INP', 'FID', 'TTFB', 'FCP'].includes(name)) {
            observedValue = value / 1000;
        }
        metrics_js_1.webVitalDurationSeconds.observe({ metric: name }, observedValue);
        res.status(204).end();
    }
    catch (error) {
        res
            .status(500)
            .json({ error: 'Failed to record web vital', details: error.message });
    }
});
/**
 * @openapi
 * /monitoring/telemetry/events:
 *   post:
 *     tags:
 *       - Monitoring
 *     summary: Record telemetry events
 *     description: Endpoint for recording general telemetry events.
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         schema:
 *           type: string
 *         description: The tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *               labels:
 *                 type: object
 *     responses:
 *       202:
 *         description: Event accepted
 *       400:
 *         description: Event name is required
 *       500:
 *         description: Failed to record event
 */
router.post('/telemetry/events', (req, res) => {
    const { event, labels } = req.body;
    const tenantId = req.headers['x-tenant-id'] || labels?.tenantId || 'unknown';
    if (!event) {
        return res.status(400).json({ error: 'Event name is required' });
    }
    try {
        // Handle golden path events
        if (event === 'golden_path_step') {
            metrics_js_1.goldenPathStepTotal.inc({
                step: labels?.step || 'unknown',
                status: labels?.status || 'success',
                tenant_id: tenantId,
            });
        }
        else if (event === 'ui_error_boundary') {
            metrics_js_1.uiErrorBoundaryCatchTotal.inc({
                component: labels?.component || 'unknown',
                tenant_id: tenantId,
            });
            // Log full error details for debugging (the metric only tracks counts)
            index_js_1.logger.error('UI Error Boundary Caught Exception', {
                component: labels?.component,
                message: labels?.message,
                stack: labels?.stack,
                tenantId,
            });
        }
        res.status(202).json({ status: 'accepted' });
    }
    catch (error) {
        res
            .status(500)
            .json({ error: 'Failed to record event', details: error.message });
    }
});
/**
 * @openapi
 * /monitoring/telemetry/dora:
 *   post:
 *     tags:
 *       - Monitoring
 *     summary: DORA Metrics Webhook
 *     description: Allows external CI/CD systems to push DORA metrics.
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         schema:
 *           type: string
 *         description: The tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metric
 *             properties:
 *               metric:
 *                 type: string
 *                 enum: [deployment, lead_time, change_failure_rate, mttr]
 *               value:
 *                 type: number
 *               labels:
 *                 type: object
 *                 properties:
 *                   environment:
 *                     type: string
 *                   status:
 *                     type: string
 *     responses:
 *       202:
 *         description: Metric accepted
 *       400:
 *         description: Invalid metric or payload
 *       500:
 *         description: Failed to record metric
 */
router.post('/telemetry/dora', (req, res) => {
    const { metric, value, labels } = req.body;
    const _tenantId = req.headers['x-tenant-id'] || 'unknown'; // Reserved for future tenant-scoped metrics
    if (!metric) {
        return res.status(400).json({ error: 'Metric name is required' });
    }
    try {
        switch (metric) {
            case 'deployment':
                metrics_js_1.maestroDeploymentsTotal.inc({
                    environment: labels?.environment || 'production',
                    status: labels?.status || 'success',
                });
                break;
            case 'lead_time':
                if (typeof value === 'number') {
                    metrics_js_1.maestroPrLeadTimeHours.observe(value);
                }
                break;
            case 'change_failure_rate':
                if (typeof value === 'number') {
                    metrics_js_1.maestroChangeFailureRate.set(value);
                }
                break;
            case 'mttr':
                if (typeof value === 'number') {
                    metrics_js_1.maestroMttrHours.observe(value);
                }
                break;
            default:
                return res.status(400).json({ error: 'Unknown DORA metric' });
        }
        res.status(202).json({ status: 'accepted' });
    }
    catch (error) {
        res
            .status(500)
            .json({ error: 'Failed to record DORA metric', details: error.message });
    }
});
exports.default = router;
