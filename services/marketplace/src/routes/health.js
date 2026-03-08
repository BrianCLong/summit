"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const cache_js_1 = require("../utils/cache.js");
const metrics_js_1 = require("../utils/metrics.js");
exports.healthRoutes = (0, express_1.Router)();
exports.healthRoutes.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'marketplace',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
exports.healthRoutes.get('/ready', async (_req, res) => {
    const checks = {};
    try {
        await db_js_1.db.query('SELECT 1');
        checks.database = 'connected';
    }
    catch {
        checks.database = 'disconnected';
    }
    try {
        await cache_js_1.cache.getClient().ping();
        checks.cache = 'connected';
    }
    catch {
        checks.cache = 'disconnected';
    }
    const allHealthy = Object.values(checks).every((v) => v === 'connected');
    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ready' : 'not ready',
        checks,
    });
});
exports.healthRoutes.get('/live', (_req, res) => {
    res.json({ status: 'live' });
});
exports.healthRoutes.get('/metrics', (_req, res) => {
    res.json(metrics_js_1.metrics.getMetrics());
});
