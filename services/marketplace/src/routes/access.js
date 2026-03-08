"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRoutes = void 0;
const express_1 = require("express");
const accessGrantService_js_1 = require("../services/accessGrantService.js");
exports.accessRoutes = (0, express_1.Router)();
// Get my access grants
exports.accessRoutes.get('/my', async (req, res, next) => {
    try {
        const grants = await accessGrantService_js_1.accessGrantService.findByGrantee(req.user.id);
        res.json(grants);
    }
    catch (err) {
        next(err);
    }
});
// Get access grant by ID
exports.accessRoutes.get('/:id', async (req, res, next) => {
    try {
        const grant = await accessGrantService_js_1.accessGrantService.findById(req.params.id);
        if (!grant) {
            return res.status(404).json({ error: 'Access grant not found' });
        }
        // Verify ownership
        if (grant.granteeId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(grant);
    }
    catch (err) {
        next(err);
    }
});
// Revoke access grant (self-revoke)
exports.accessRoutes.delete('/:id', async (req, res, next) => {
    try {
        const grant = await accessGrantService_js_1.accessGrantService.findById(req.params.id);
        if (!grant) {
            return res.status(404).json({ error: 'Access grant not found' });
        }
        if (grant.granteeId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const reason = req.body.reason || 'User requested revocation';
        const revoked = await accessGrantService_js_1.accessGrantService.revoke(req.params.id, reason);
        res.json(revoked);
    }
    catch (err) {
        next(err);
    }
});
// Validate API key (used by data delivery service)
exports.accessRoutes.post('/validate', async (req, res, next) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key required' });
        }
        const grant = await accessGrantService_js_1.accessGrantService.validateApiKey(apiKey);
        if (!grant) {
            return res.status(401).json({ valid: false, error: 'Invalid or expired API key' });
        }
        res.json({
            valid: true,
            grantId: grant.id,
            productId: grant.productId,
            permissions: grant.permissions,
            limits: {
                apiCalls: grant.apiCallsLimit,
                apiCallsUsed: grant.apiCallsUsed,
                downloads: grant.downloadsLimit,
                downloadsUsed: grant.downloadsUsed,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Record usage (called by data delivery service)
exports.accessRoutes.post('/:id/usage', async (req, res, next) => {
    try {
        const { apiCalls, downloads, bytes } = req.body;
        const result = await accessGrantService_js_1.accessGrantService.recordUsage(req.params.id, {
            apiCalls,
            downloads,
            bytes,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
