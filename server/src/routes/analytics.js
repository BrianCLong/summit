"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AnalyticsService_js_1 = require("../services/AnalyticsService.js");
const DifferentialPrivacyEngine_js_1 = require("../privacy/dp/DifferentialPrivacyEngine.js");
const TelemetryController_js_1 = require("../analytics/telemetry/TelemetryController.js");
const router = (0, express_1.Router)();
const analyticsService = AnalyticsService_js_1.AnalyticsService.getInstance();
// Helper to handle async route errors
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
/**
 * @route GET /analytics/path
 * @desc Calculate paths (shortest, k-paths)
 */
router.get('/path', asyncHandler(async (req, res) => {
    const { sourceId, targetId, algorithm, k, maxDepth } = req.query;
    if (!sourceId || !targetId) {
        return res.status(400).json({ error: 'sourceId and targetId are required' });
    }
    const result = await analyticsService.findPaths(sourceId, targetId, algorithm || 'shortest', { k, maxDepth });
    res.json(result);
}));
/**
 * @route GET /analytics/community
 * @desc Detect communities (Privacy-Preserving)
 */
router.get('/community', asyncHandler(async (req, res) => {
    const { algorithm, dp = 'true' } = req.query;
    const result = await analyticsService.detectCommunities(algorithm || 'lpa');
    // Apply Differential Privacy to community sizes if enabled
    if (dp === 'true' && result.communities) {
        result.communities = result.communities.map((c) => ({
            ...c,
            size: DifferentialPrivacyEngine_js_1.dpEngine.privatizeAggregate(c.size, { epsilon: 0.5 }),
            isPrivatized: true
        }));
    }
    res.json(result);
}));
/**
 * @route GET /analytics/centrality
 * @desc Calculate centrality metrics
 */
router.get('/centrality', asyncHandler(async (req, res) => {
    const { algorithm, limit } = req.query;
    const result = await analyticsService.calculateCentrality(algorithm || 'betweenness', { limit: limit ? parseInt(limit) : 20 });
    res.json(result);
}));
/**
 * @route GET /analytics/patterns
 * @desc Mine graph patterns
 */
router.get('/patterns', asyncHandler(async (req, res) => {
    const { type } = req.query;
    if (!type) {
        return res.status(400).json({ error: 'Pattern type is required (temporal-motifs, co-travel, financial-structuring)' });
    }
    const result = await analyticsService.minePatterns(type);
    res.json(result);
}));
/**
 * @route GET /analytics/anomaly
 * @desc Detect anomalies (Graph-based)
 */
router.get('/anomaly', asyncHandler(async (req, res) => {
    const { type } = req.query;
    if (!type) {
        return res.status(400).json({ error: 'Anomaly type is required (degree, temporal-spike, selector-misuse)' });
    }
    const result = await analyticsService.detectAnomalies(type);
    res.json(result);
}));
/**
 * @route POST /analytics/event
 * @desc Ingest internal telemetry events
 */
router.post('/event', TelemetryController_js_1.handleTelemetryEvent);
exports.default = router;
