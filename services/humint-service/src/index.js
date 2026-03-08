"use strict";
/**
 * HUMINT Source Management Service
 *
 * Main entry point for the HUMINT service providing:
 * - Source registration and management
 * - Debrief workflow orchestration
 * - Asset tracking and graph integration
 * - Validation and compliance checking
 */
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
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const sources_js_1 = require("./routes/sources.js");
const debriefs_js_1 = require("./routes/debriefs.js");
const asset_tracking_js_1 = require("./routes/asset-tracking.js");
const validation_js_1 = require("./routes/validation.js");
const health_js_1 = require("./routes/health.js");
const error_handler_js_1 = require("./middleware/error-handler.js");
const auth_js_1 = require("./middleware/auth.js");
const context_js_1 = require("./context.js");
const logger = (0, pino_1.default)({
    name: 'humint-service',
    level: process.env.LOG_LEVEL || 'info',
});
async function createApp(context) {
    const app = (0, express_1.default)();
    const ctx = context || (await (0, context_js_1.createServiceContext)());
    // Middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use((0, pino_http_1.default)({ logger }));
    // Health routes (no auth required)
    app.use('/health', (0, health_js_1.createHealthRoutes)(ctx));
    // Auth middleware for protected routes
    app.use((0, auth_js_1.authMiddleware)(ctx));
    // API routes
    app.use('/api/v1/sources', (0, sources_js_1.createSourceRoutes)(ctx));
    app.use('/api/v1/debriefs', (0, debriefs_js_1.createDebriefRoutes)(ctx));
    app.use('/api/v1/asset-tracking', (0, asset_tracking_js_1.createAssetTrackingRoutes)(ctx));
    app.use('/api/v1/validation', (0, validation_js_1.createValidationRoutes)(ctx));
    // Error handling
    app.use((0, error_handler_js_1.errorHandler)(logger));
    return app;
}
async function main() {
    const port = parseInt(process.env.PORT || '4020', 10);
    try {
        const app = await createApp();
        app.listen(port, () => {
            logger.info({ port }, 'HUMINT service started');
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info({ signal }, 'Shutting down HUMINT service');
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger.fatal({ error }, 'Failed to start HUMINT service');
        process.exit(1);
    }
}
// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
__exportStar(require("./services/SourceService.js"), exports);
__exportStar(require("./services/DebriefService.js"), exports);
__exportStar(require("./services/AssetTrackingService.js"), exports);
__exportStar(require("./services/ValidationService.js"), exports);
