"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const opa_client_js_1 = require("../services/opa-client.js");
const provenance_client_js_1 = require("../services/provenance-client.js");
const router = (0, express_1.Router)();
/**
 * GET /health - Basic health check
 */
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /health/ready - Readiness check (all dependencies)
 */
router.get('/ready', async (req, res) => {
    const checks = {
        database: await database_js_1.db.isHealthy(),
        opa: await opa_client_js_1.opaClient.isHealthy(),
        provenance: await provenance_client_js_1.provenanceClient.isHealthy(),
    };
    const allHealthy = Object.values(checks).every(Boolean);
    res.status(allHealthy ? 200 : 503).json({
        ready: allHealthy,
        checks,
    });
});
/**
 * GET /health/live - Liveness check
 */
router.get('/live', (req, res) => {
    res.json({ live: true });
});
exports.default = router;
