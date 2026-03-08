"use strict";
/**
 * Health check routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', (req, res) => {
    res.json({ status: 'ok' });
});
exports.healthRouter.get('/ready', (req, res) => {
    // Check if service dependencies are ready
    // For now, always return ready
    res.json({
        status: 'ready',
        checks: {
            oidc: 'ok',
            policyEnforcer: 'ok'
        }
    });
});
exports.healthRouter.get('/live', (req, res) => {
    res.json({ status: 'alive' });
});
