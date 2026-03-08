"use strict";
/**
 * Source Routes
 *
 * REST API endpoints for HUMINT source management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSourceRoutes = createSourceRoutes;
const express_1 = require("express");
const SourceService_js_1 = require("../services/SourceService.js");
const auth_js_1 = require("../middleware/auth.js");
const humint_types_1 = require("@intelgraph/humint-types");
function createSourceRoutes(ctx) {
    const router = (0, express_1.Router)();
    const sourceService = new SourceService_js_1.SourceService(ctx);
    /**
     * Create a new source
     * POST /api/v1/sources
     */
    router.post('/', (0, auth_js_1.requireRoles)('handler', 'admin'), (0, auth_js_1.requireClearance)('SECRET'), async (req, res, next) => {
        try {
            const source = await sourceService.createSource(req.body, req.user.id, req.tenantId);
            res.status(201).json(source);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get source by ID
     * GET /api/v1/sources/:id
     */
    router.get('/:id', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const source = await sourceService.getSource(req.params.id, req.tenantId);
            res.json(source);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Update source
     * PATCH /api/v1/sources/:id
     */
    router.patch('/:id', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const source = await sourceService.updateSource({ id: req.params.id, ...req.body }, req.user.id, req.tenantId);
            res.json(source);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Search sources
     * GET /api/v1/sources
     */
    router.get('/', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const criteria = humint_types_1.SourceSearchCriteriaSchema.parse({
                cryptonym: req.query.cryptonym,
                sourceTypes: req.query.sourceTypes
                    ? req.query.sourceTypes.split(',')
                    : undefined,
                statuses: req.query.statuses
                    ? req.query.statuses.split(',')
                    : undefined,
                handlerId: req.query.handlerId,
                minCredibilityScore: req.query.minCredibilityScore
                    ? Number(req.query.minCredibilityScore)
                    : undefined,
                maxCredibilityScore: req.query.maxCredibilityScore
                    ? Number(req.query.maxCredibilityScore)
                    : undefined,
                riskLevels: req.query.riskLevels
                    ? req.query.riskLevels.split(',')
                    : undefined,
                limit: req.query.limit ? Number(req.query.limit) : 20,
                offset: req.query.offset ? Number(req.query.offset) : 0,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
            });
            const result = await sourceService.searchSources(criteria, req.tenantId);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get source statistics
     * GET /api/v1/sources/stats
     */
    router.get('/stats/summary', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const stats = await sourceService.getStatistics(req.tenantId);
            res.json(stats);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Record contact with source
     * POST /api/v1/sources/:id/contact
     */
    router.post('/:id/contact', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            await sourceService.recordContact(req.params.id, req.user.id, req.tenantId);
            res.json({ success: true, message: 'Contact recorded' });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Terminate source
     * POST /api/v1/sources/:id/terminate
     */
    router.post('/:id/terminate', (0, auth_js_1.requireRoles)('admin'), (0, auth_js_1.requireClearance)('TOP_SECRET'), async (req, res, next) => {
        try {
            const { reason } = req.body;
            if (!reason) {
                res.status(400).json({ error: 'Termination reason required' });
                return;
            }
            const source = await sourceService.terminateSource(req.params.id, reason, req.user.id, req.tenantId);
            res.json(source);
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
