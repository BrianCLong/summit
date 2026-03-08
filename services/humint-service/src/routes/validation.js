"use strict";
/**
 * Validation Routes
 *
 * REST API endpoints for HUMINT validation and compliance checking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationRoutes = createValidationRoutes;
const express_1 = require("express");
const ValidationService_js_1 = require("../services/ValidationService.js");
const auth_js_1 = require("../middleware/auth.js");
function createValidationRoutes(ctx) {
    const router = (0, express_1.Router)();
    const validationService = new ValidationService_js_1.ValidationService(ctx);
    /**
     * Validate source
     * POST /api/v1/validation/source
     */
    router.post('/source', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const result = await validationService.validateSource(req.body);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Validate debrief
     * POST /api/v1/validation/debrief
     */
    router.post('/debrief', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const result = await validationService.validateDebrief(req.body);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Validate intelligence item
     * POST /api/v1/validation/intelligence
     */
    router.post('/intelligence', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const result = validationService.validateIntelligenceItem(req.body);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Assess source credibility
     * GET /api/v1/validation/credibility/:sourceId
     */
    router.get('/credibility/:sourceId', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const assessment = await validationService.assessCredibility(req.params.sourceId, req.tenantId);
            res.json(assessment);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Check source compliance
     * GET /api/v1/validation/compliance/:sourceId
     */
    router.get('/compliance/:sourceId', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const check = await validationService.checkCompliance(req.params.sourceId, req.tenantId);
            res.json(check);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Validate state transition
     * POST /api/v1/validation/transition
     */
    router.post('/transition', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const { currentStatus, targetStatus, entityType } = req.body;
            const result = validationService.validateStateTransition(currentStatus, targetStatus, entityType);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Batch validate sources
     * POST /api/v1/validation/batch/sources
     */
    router.post('/batch/sources', (0, auth_js_1.requireRoles)('analyst', 'admin'), async (req, res, next) => {
        try {
            const { sourceIds } = req.body;
            const results = await validationService.batchValidateSources(sourceIds, req.tenantId);
            res.json(Object.fromEntries(results));
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
