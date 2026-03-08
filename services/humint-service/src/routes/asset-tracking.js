"use strict";
/**
 * Asset Tracking Routes
 *
 * REST API endpoints for HUMINT asset tracking and graph integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetTrackingRoutes = createAssetTrackingRoutes;
const express_1 = require("express");
const AssetTrackingService_js_1 = require("../services/AssetTrackingService.js");
const auth_js_1 = require("../middleware/auth.js");
const humint_types_1 = require("@intelgraph/humint-types");
function createAssetTrackingRoutes(ctx) {
    const router = (0, express_1.Router)();
    const assetService = new AssetTrackingService_js_1.AssetTrackingService(ctx);
    /**
     * Record asset activity
     * POST /api/v1/asset-tracking/activities
     */
    router.post('/activities', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const activity = await assetService.recordActivity(req.body, req.user.id, req.tenantId);
            res.status(201).json(activity);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Create risk indicator
     * POST /api/v1/asset-tracking/risk-indicators
     */
    router.post('/risk-indicators', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const indicator = await assetService.createRiskIndicator(req.body, req.user.id, req.tenantId);
            res.status(201).json(indicator);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Create graph link
     * POST /api/v1/asset-tracking/graph-links
     */
    router.post('/graph-links', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const link = await assetService.createGraphLink(req.body, req.user.id, req.tenantId);
            res.status(201).json(link);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get asset dashboard
     * GET /api/v1/asset-tracking/dashboard/:sourceId
     */
    router.get('/dashboard/:sourceId', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const dashboard = await assetService.getAssetDashboard(req.params.sourceId, req.tenantId);
            res.json(dashboard);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Query assets
     * GET /api/v1/asset-tracking
     */
    router.get('/', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const criteria = humint_types_1.AssetTrackingQuerySchema.parse({
                sourceIds: req.query.sourceIds
                    ? req.query.sourceIds.split(',')
                    : undefined,
                statuses: req.query.statuses
                    ? req.query.statuses.split(',')
                    : undefined,
                riskLevels: req.query.riskLevels
                    ? req.query.riskLevels.split(',')
                    : undefined,
                hasActiveIndicators: req.query.hasActiveIndicators === 'true',
                handlerId: req.query.handlerId,
                includeActivities: req.query.includeActivities === 'true',
                includeGraphLinks: req.query.includeGraphLinks === 'true',
                includeRiskIndicators: req.query.includeRiskIndicators === 'true',
                limit: req.query.limit ? Number(req.query.limit) : 20,
                offset: req.query.offset ? Number(req.query.offset) : 0,
            });
            const result = await assetService.queryAssets(criteria, req.tenantId);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Analyze source network
     * GET /api/v1/asset-tracking/network/:sourceId
     */
    router.get('/network/:sourceId', (0, auth_js_1.requireRoles)('analyst', 'admin'), (0, auth_js_1.requireClearance)('SECRET'), async (req, res, next) => {
        try {
            const depth = req.query.depth ? Number(req.query.depth) : 2;
            const analysis = await assetService.analyzeNetwork(req.params.sourceId, depth, req.tenantId);
            res.json(analysis);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Find path between source and entity
     * GET /api/v1/asset-tracking/path/:sourceId/:targetId
     */
    router.get('/path/:sourceId/:targetId', (0, auth_js_1.requireRoles)('analyst', 'admin'), async (req, res, next) => {
        try {
            const maxHops = req.query.maxHops ? Number(req.query.maxHops) : 5;
            const result = await assetService.findPath(req.params.sourceId, req.params.targetId, maxHops, req.tenantId);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
