"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const operations_js_1 = require("./routes/operations.js");
const agents_js_1 = require("./routes/agents.js");
const analytics_js_1 = require("./routes/analytics.js");
const counterintel_js_1 = require("./routes/counterintel.js");
/**
 * Espionage Intelligence Service
 *
 * Comprehensive API for espionage operations, agent tracking,
 * and counterintelligence management.
 */
async function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
            },
        },
    }));
    // Performance middleware
    app.use((0, compression_1.default)());
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
    }));
    // Body parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'espionage-service',
            timestamp: new Date().toISOString(),
            version: '0.1.0',
        });
    });
    // API routes
    app.use('/api/operations', operations_js_1.operationsRouter);
    app.use('/api/agents', agents_js_1.agentsRouter);
    app.use('/api/analytics', analytics_js_1.analyticsRouter);
    app.use('/api/counterintel', counterintel_js_1.ciRouter);
    // Error handling
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(err.status || 500).json({
            error: err.message || 'Internal server error',
            code: err.code || 'INTERNAL_ERROR',
        });
    });
    return app;
}
// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 4100;
    createApp().then(app => {
        app.listen(port, () => {
            console.log(`Espionage Service listening on port ${port}`);
        });
    }).catch(err => {
        console.error('Failed to start service:', err);
        process.exit(1);
    });
}
