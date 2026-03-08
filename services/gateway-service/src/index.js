"use strict";
/**
 * Summit API Gateway Service
 *
 * Main orchestration service that combines all gateway components
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const api_gateway_1 = require("@intelgraph/api-gateway");
const authentication_1 = require("@intelgraph/authentication");
const rate_limiting_1 = require("@intelgraph/rate-limiting");
const api_analytics_1 = require("@intelgraph/api-analytics");
const pino_1 = __importDefault(require("pino"));
const ioredis_1 = __importDefault(require("ioredis"));
(0, dotenv_1.config)();
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
});
async function startGatewayService() {
    logger.info('Starting Summit API Gateway Service...');
    // Initialize Redis
    const redis = new ioredis_1.default({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    });
    // Initialize JWT Manager
    const jwtManager = new authentication_1.JWTManager({
        secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
        issuer: 'summit-api-gateway',
        audience: 'summit-users',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
    });
    // Initialize RBAC
    const rbacManager = new authentication_1.RBACManager();
    rbacManager.initializeDefaultRoles();
    // Initialize Auth Middleware
    const authMiddleware = new authentication_1.AuthMiddleware({
        jwtManager,
        rbacManager,
    });
    // Initialize Rate Limiter
    const rateLimiter = new rate_limiting_1.RedisRateLimiter({
        redis,
        windowMs: 60 * 1000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    });
    // Initialize Metrics Collector
    const metrics = new api_analytics_1.MetricsCollector();
    // Initialize Express App
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    // Metrics endpoint
    app.get('/metrics', (req, res) => {
        const aggregated = metrics.getAggregatedMetrics();
        res.json(aggregated);
    });
    // Apply rate limiting middleware
    app.use((0, rate_limiting_1.createRateLimitMiddleware)({
        limiter: rateLimiter,
        keyGenerator: (req) => {
            // Use API key, JWT subject, or IP address
            const apiKey = req.headers['x-api-key'];
            if (apiKey) {
                return `apikey:${apiKey}`;
            }
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    const payload = jwtManager.decodeToken(token);
                    if (payload?.sub) {
                        return `user:${payload.sub}`;
                    }
                }
                catch { }
            }
            return `ip:${req.ip}`;
        },
    }));
    // Request logging and metrics
    app.use((req, res, next) => {
        const start = Date.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        res.on('finish', () => {
            const duration = Date.now() - start;
            metrics.recordRequest(duration, res.statusCode, {
                method: req.method,
                path: req.path,
            });
            logger.info('Request completed', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                userAgent: req.headers['user-agent'],
            });
        });
        next();
    });
    // API Gateway routes
    const gateway = new api_gateway_1.APIGateway({
        routes: [
            {
                path: '/api/v1/investigations*',
                backends: [
                    { url: process.env.INVESTIGATIONS_SERVICE_URL || 'http://localhost:3001' },
                ],
            },
            {
                path: '/api/v1/entities*',
                backends: [
                    { url: process.env.ENTITIES_SERVICE_URL || 'http://localhost:3002' },
                ],
            },
            {
                path: '/api/v1/relationships*',
                backends: [
                    { url: process.env.RELATIONSHIPS_SERVICE_URL || 'http://localhost:3003' },
                ],
            },
        ],
        loadBalancing: {
            strategy: 'round-robin',
            healthCheckInterval: 30000,
        },
        circuitBreaker: {
            threshold: 5,
            timeout: 60000,
            resetTimeout: 30000,
        },
    });
    // Protected API routes
    app.use('/api/*', authMiddleware.authenticate());
    // Error handling
    app.use((err, req, res, next) => {
        logger.error('Request error', {
            error: err.message,
            stack: err.stack,
            path: req.path,
        });
        metrics.recordError(500, err.message, {
            path: req.path,
            method: req.method,
        });
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    });
    // Start server
    const PORT = parseInt(process.env.PORT || '8080');
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
        logger.info(`🚀 Summit API Gateway running on http://${HOST}:${PORT}`);
        logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
        logger.info(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully...');
        await redis.quit();
        process.exit(0);
    });
}
startGatewayService().catch((error) => {
    logger.error('Failed to start gateway service', { error });
    process.exit(1);
});
