"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = require("express-rate-limit");
const helmet_1 = __importDefault(require("helmet"));
const winston_1 = require("winston");
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 4006;
const logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
    transports: [
        new winston_1.transports.Console({
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple()),
        }),
        new winston_1.transports.File({
            filename: 'logs/search-engine-error.log',
            level: 'error',
        }),
        new winston_1.transports.File({
            filename: 'logs/search-engine.log',
        }),
    ],
});
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((0, compression_1.default)());
const generalRateLimit = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalRateLimit);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
        });
    });
    next();
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'search-engine',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});
app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`
# HELP search_engine_requests_total Total number of HTTP requests
# TYPE search_engine_requests_total counter
search_engine_requests_total 1

# HELP search_engine_response_time_seconds Response time in seconds
# TYPE search_engine_response_time_seconds histogram
search_engine_response_time_seconds_bucket{le="0.1"} 0
search_engine_response_time_seconds_bucket{le="0.5"} 1
search_engine_response_time_seconds_bucket{le="1.0"} 1
search_engine_response_time_seconds_bucket{le="+Inf"} 1
search_engine_response_time_seconds_sum 0.05
search_engine_response_time_seconds_count 1

# HELP search_engine_uptime_seconds Service uptime in seconds
# TYPE search_engine_uptime_seconds gauge
search_engine_uptime_seconds ${process.uptime()}
  `.trim());
});
app.use('/api/search', searchRoutes_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
    });
});
app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
    });
    if (res.headersSent) {
        return next(error);
    }
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
    });
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
const server = app.listen(port, () => {
    logger.info(`🔍 Search Engine service started`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        elasticsearch: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });
});
exports.default = app;
