"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TimeSeriesIntelligenceService_js_1 = require("../services/TimeSeriesIntelligenceService.js");
const errors_js_1 = require("../lib/errors.js");
const router = (0, express_1.Router)();
/**
 * @route GET /api/intelligence/forecast/:entityId/activity
 * @desc Forecast activity volume for an entity
 * @access Private
 */
router.get('/forecast/:entityId/activity', async (req, res, next) => {
    try {
        const { entityId } = req.params;
        const { horizon = '7', lookback = '90' } = req.query;
        // Ensure tenant context (assuming middleware populates req.user.tenant_id)
        const tenantId = req.user?.tenant_id || req.user?.tenantId;
        if (!tenantId) {
            throw new errors_js_1.AppError('Tenant ID required', 401);
        }
        const result = await TimeSeriesIntelligenceService_js_1.timeSeriesIntelligence.forecastActivity(entityId, tenantId, parseInt(horizon), parseInt(lookback));
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/intelligence/forecast/:entityId/metric
 * @desc Forecast a specific metric for an entity
 * @access Private
 */
router.get('/forecast/:entityId/metric', async (req, res, next) => {
    try {
        const { entityId } = req.params;
        const { path, horizon = '7', lookback = '90' } = req.query;
        if (!path || typeof path !== 'string') {
            throw new errors_js_1.AppError('Metric path is required', 400);
        }
        const tenantId = req.user?.tenant_id || req.user?.tenantId;
        if (!tenantId) {
            throw new errors_js_1.AppError('Tenant ID required', 401);
        }
        const result = await TimeSeriesIntelligenceService_js_1.timeSeriesIntelligence.forecastMetric(entityId, tenantId, path, parseInt(horizon), parseInt(lookback));
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
