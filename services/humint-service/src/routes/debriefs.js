"use strict";
/**
 * Debrief Routes
 *
 * REST API endpoints for debrief workflow management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDebriefRoutes = createDebriefRoutes;
const express_1 = require("express");
const DebriefService_js_1 = require("../services/DebriefService.js");
const auth_js_1 = require("../middleware/auth.js");
const humint_types_1 = require("@intelgraph/humint-types");
function createDebriefRoutes(ctx) {
    const router = (0, express_1.Router)();
    const debriefService = new DebriefService_js_1.DebriefService(ctx);
    /**
     * Schedule a new debrief
     * POST /api/v1/debriefs
     */
    router.post('/', (0, auth_js_1.requireRoles)('handler', 'admin'), (0, auth_js_1.requireClearance)('SECRET'), async (req, res, next) => {
        try {
            const debrief = await debriefService.scheduleDebrief(req.body, req.user.id, req.tenantId);
            res.status(201).json(debrief);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get debrief by ID
     * GET /api/v1/debriefs/:id
     */
    router.get('/:id', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const debrief = await debriefService.getDebrief(req.params.id, req.tenantId);
            res.json(debrief);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Search debriefs
     * GET /api/v1/debriefs
     */
    router.get('/', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const criteria = humint_types_1.DebriefSearchCriteriaSchema.parse({
                sourceId: req.query.sourceId,
                handlerId: req.query.handlerId,
                debriefTypes: req.query.debriefTypes
                    ? req.query.debriefTypes.split(',')
                    : undefined,
                statuses: req.query.statuses
                    ? req.query.statuses.split(',')
                    : undefined,
                scheduledAfter: req.query.scheduledAfter
                    ? new Date(req.query.scheduledAfter)
                    : undefined,
                scheduledBefore: req.query.scheduledBefore
                    ? new Date(req.query.scheduledBefore)
                    : undefined,
                limit: req.query.limit ? Number(req.query.limit) : 20,
                offset: req.query.offset ? Number(req.query.offset) : 0,
            });
            const result = await debriefService.searchDebriefs(criteria, req.tenantId);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Start debrief session
     * POST /api/v1/debriefs/:id/start
     */
    router.post('/:id/start', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const debrief = await debriefService.startDebrief({ id: req.params.id, startedAt: new Date() }, req.user.id, req.tenantId);
            res.json(debrief);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Update debrief in progress
     * PATCH /api/v1/debriefs/:id
     */
    router.patch('/:id', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const debrief = await debriefService.updateDebrief({ id: req.params.id, ...req.body }, req.user.id, req.tenantId);
            res.json(debrief);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Complete debrief session
     * POST /api/v1/debriefs/:id/complete
     */
    router.post('/:id/complete', (0, auth_js_1.requireRoles)('handler', 'admin'), async (req, res, next) => {
        try {
            const debrief = await debriefService.completeDebrief({ id: req.params.id, ...req.body, endedAt: new Date() }, req.user.id, req.tenantId);
            res.json(debrief);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Review/approve debrief
     * POST /api/v1/debriefs/:id/review
     */
    router.post('/:id/review', (0, auth_js_1.requireRoles)('supervisor', 'admin'), (0, auth_js_1.requireClearance)('TOP_SECRET'), async (req, res, next) => {
        try {
            const debrief = await debriefService.reviewDebrief({ id: req.params.id, ...req.body }, req.user.id, req.tenantId);
            res.json(debrief);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Generate debrief report
     * GET /api/v1/debriefs/:id/report
     */
    router.get('/:id/report', (0, auth_js_1.requireRoles)('handler', 'analyst', 'admin'), async (req, res, next) => {
        try {
            const report = await debriefService.generateReport(req.params.id, req.tenantId);
            res.json(report);
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
