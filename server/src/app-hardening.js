"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const logger_js_1 = require("./config/logger.js");
const hsm_enforcement_js_1 = require("./federal/hsm-enforcement.js");
const createApp = async () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Basic logging
    app.use((req, res, next) => {
        req.log = logger_js_1.logger;
        next();
    });
    // Health endpoints
    app.get('/health', (req, res) => res.json({ status: 'ok', source: 'hardening-mock' }));
    app.get('/health/ready', (req, res) => res.json({ status: 'ready', hsm: 'probed' }));
    app.get('/health/live', (req, res) => res.json({ status: 'live' }));
    // HSM Enforcement Middleware (The core of what we want to verify)
    app.use('/api', hsm_enforcement_js_1.hsmEnforcement.middleware());
    // Test endpoint for HSM protection
    app.get('/api/hsm-check', (req, res) => {
        res.json({
            success: true,
            message: 'HSM enforcement passed',
            timestamp: new Date().toISOString()
        });
    });
    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'internal_error', message: err.message });
    });
    return app;
};
exports.createApp = createApp;
