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
const agencies_js_1 = require("./routes/agencies.js");
const capabilities_js_1 = require("./routes/capabilities.js");
const cooperation_js_1 = require("./routes/cooperation.js");
/**
 * Foreign Intelligence Service Monitoring
 *
 * API for tracking foreign intelligence agencies, organizational structures,
 * capabilities, and cooperation relationships.
 */
async function createApp() {
    const app = (0, express_1.default)();
    // Security and performance middleware
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
    }));
    // Body parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'foreign-intel-service',
            timestamp: new Date().toISOString(),
            version: '0.1.0',
        });
    });
    // API routes
    app.use('/api/agencies', agencies_js_1.agenciesRouter);
    app.use('/api/capabilities', capabilities_js_1.capabilitiesRouter);
    app.use('/api/cooperation', cooperation_js_1.cooperationRouter);
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
// Start server
if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 4101;
    createApp().then(app => {
        app.listen(port, () => {
            console.log(`Foreign Intel Service listening on port ${port}`);
        });
    }).catch(err => {
        console.error('Failed to start service:', err);
        process.exit(1);
    });
}
