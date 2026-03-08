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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startService = startService;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
const translation_service_js_1 = require("./lib/translation-service.js");
const routes_js_1 = __importDefault(require("./api/routes.js"));
const logger = (0, pino_1.default)({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});
/**
 * Create and configure Express app
 */
function createApp(config) {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    // CORS
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    }));
    // Body parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Request logging
    app.use((req, res, next) => {
        logger.info({ method: req.method, url: req.url }, 'Incoming request');
        next();
    });
    // API routes
    app.use('/api', routes_js_1.default);
    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            service: 'i18n-service',
            version: '1.0.0',
            status: 'running',
            endpoints: {
                translate: 'POST /api/translate',
                translateBatch: 'POST /api/translate/batch',
                detect: 'POST /api/detect',
                metrics: 'GET /api/metrics',
                health: 'GET /api/health',
            },
        });
    });
    return app;
}
/**
 * Start the i18n service
 */
async function startService(config) {
    const serviceConfig = {
        defaultProvider: process.env.TRANSLATION_PROVIDER || 'mock',
        googleApiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
        supportedLanguages: [
            'en',
            'fr',
            'de',
            'es',
            'it',
            'pt',
            'nl',
            'da',
            'no',
            'sv',
            'fi',
            'pl',
            'cs',
            'ar',
            'he',
            'zh',
            'ja',
            'ko',
        ],
        enableCache: process.env.ENABLE_CACHE === 'true',
        cacheTTL: parseInt(process.env.CACHE_TTL || '3600', 10),
        maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH || '10000', 10),
        ...config,
    };
    // Initialize translation service
    await (0, translation_service_js_1.getTranslationService)(serviceConfig);
    // Create app
    const app = createApp(serviceConfig);
    // Start server
    const port = parseInt(process.env.PORT || '3100', 10);
    const server = app.listen(port, () => {
        logger.info(`i18n-service listening on port ${port}`);
        logger.info(`Provider: ${serviceConfig.defaultProvider}`);
        logger.info(`Cache enabled: ${serviceConfig.enableCache}`);
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, closing server...');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });
    return { app, server };
}
// Export all modules
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./lib/language-detector.js"), exports);
__exportStar(require("./lib/translation-service.js"), exports);
__exportStar(require("./lib/translation-provider.js"), exports);
__exportStar(require("./lib/metrics.js"), exports);
__exportStar(require("./config/supported-languages.js"), exports);
__exportStar(require("./config/translation-policies.js"), exports);
// Start service if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startService().catch((error) => {
        logger.error(error, 'Failed to start service');
        process.exit(1);
    });
}
