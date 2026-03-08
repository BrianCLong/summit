"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const logger_js_1 = require("./utils/logger.js");
const products_js_1 = require("./routes/products.js");
const transactions_js_1 = require("./routes/transactions.js");
const consent_js_1 = require("./routes/consent.js");
const providers_js_1 = require("./routes/providers.js");
const risk_js_1 = require("./routes/risk.js");
const health_js_1 = require("./routes/health.js");
const reviews_js_1 = require("./routes/reviews.js");
const access_js_1 = require("./routes/access.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const auth_js_1 = require("./middleware/auth.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const metrics_js_1 = require("./utils/metrics.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4100;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Metrics and request logging
app.use((0, metrics_js_1.metricsMiddleware)());
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_js_1.logger.info('Request completed', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
        });
    });
    next();
});
// Health check (no auth, no rate limit)
app.use('/health', health_js_1.healthRoutes);
// API routes with auth and rate limiting
app.use('/api/v1/products', rateLimit_js_1.rateLimiters.api, auth_js_1.authMiddleware, products_js_1.productRoutes);
app.use('/api/v1/transactions', rateLimit_js_1.rateLimiters.transactions, auth_js_1.authMiddleware, transactions_js_1.transactionRoutes);
app.use('/api/v1/consent', rateLimit_js_1.rateLimiters.api, auth_js_1.authMiddleware, consent_js_1.consentRoutes);
app.use('/api/v1/providers', rateLimit_js_1.rateLimiters.api, auth_js_1.authMiddleware, providers_js_1.providerRoutes);
app.use('/api/v1/risk', rateLimit_js_1.rateLimiters.api, auth_js_1.authMiddleware, risk_js_1.riskRoutes);
app.use('/api/v1/reviews', rateLimit_js_1.rateLimiters.api, auth_js_1.authMiddleware, reviews_js_1.reviewRoutes);
app.use('/api/v1/access', rateLimit_js_1.rateLimiters.api, auth_js_1.authMiddleware, access_js_1.accessRoutes);
// Error handling
app.use(errorHandler_js_1.errorHandler);
// Graceful shutdown
const server = app.listen(PORT, () => {
    logger_js_1.logger.info(`Marketplace service running on port ${PORT}`);
});
process.on('SIGTERM', () => {
    logger_js_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_js_1.logger.info('Server closed');
        process.exit(0);
    });
});
exports.default = app;
