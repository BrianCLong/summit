"use strict";
/**
 * Experimentation API Routes
 *
 * REST API for A/B testing and feature experiments.
 *
 * @module routes/experimentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../experimentation/index.js");
const auth_js_1 = require("../middleware/auth.js");
const featureFlags_js_1 = require("../lib/featureFlags.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
// Feature flag check middleware
const requireFeatureFlag = (flagName) => {
    return (req, res, next) => {
        const context = { userId: req.user?.id, tenantId: req.user?.tenantId };
        if (!(0, featureFlags_js_1.isEnabled)(flagName, context)) {
            res.status(403).json({ error: `Feature '${flagName}' is not enabled` });
            return;
        }
        next();
    };
};
// Validation schemas
const TargetingRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    attribute: zod_1.z.string(),
    operator: zod_1.z.enum(['equals', 'not_equals', 'contains', 'in', 'not_in', 'gt', 'lt']),
    value: zod_1.z.unknown(),
});
const VariantSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    weight: zod_1.z.number().min(0).max(100),
    config: zod_1.z.record(zod_1.z.unknown()),
    isControl: zod_1.z.boolean(),
});
const CreateExperimentSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(200),
    description: zod_1.z.string().max(2000),
    type: zod_1.z.enum(['a_b', 'multivariate', 'feature_rollout']),
    hypothesis: zod_1.z.string().min(10).max(1000),
    primaryMetric: zod_1.z.string(),
    secondaryMetrics: zod_1.z.array(zod_1.z.string()).optional().default([]),
    variants: zod_1.z.array(VariantSchema).min(2),
    targetingRules: zod_1.z.array(TargetingRuleSchema).optional().default([]),
    trafficAllocation: zod_1.z.number().min(0).max(100),
    minSampleSize: zod_1.z.number().min(100),
    confidenceLevel: zod_1.z.number().min(0.8).max(0.99).default(0.95),
    owner: zod_1.z.string(),
});
const GetAssignmentSchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
    attributes: zod_1.z.record(zod_1.z.unknown()).optional().default({}),
    consent: zod_1.z.boolean().default(true),
});
const TrackMetricSchema = zod_1.z.object({
    metricName: zod_1.z.string(),
    metricValue: zod_1.z.number(),
});
const ApproveExperimentSchema = zod_1.z.object({
    role: zod_1.z.string(),
    approved: zod_1.z.boolean(),
    comment: zod_1.z.string().optional(),
});
const CompleteExperimentSchema = zod_1.z.object({
    rolloutWinner: zod_1.z.boolean().optional().default(false),
});
/**
 * Create a new experiment
 * POST /api/v1/experiments
 */
router.post('/', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required to create experiments' });
            return;
        }
        const data = CreateExperimentSchema.parse(req.body);
        const result = await index_js_1.experimentationService.createExperiment({
            name: data.name,
            description: data.description,
            type: data.type,
            hypothesis: data.hypothesis,
            primaryMetric: data.primaryMetric,
            secondaryMetrics: data.secondaryMetrics,
            variants: data.variants,
            targetingRules: data.targetingRules,
            trafficAllocation: data.trafficAllocation,
            minSampleSize: data.minSampleSize,
            confidenceLevel: data.confidenceLevel,
            owner: data.owner,
        });
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Start an experiment
 * POST /api/v1/experiments/:experimentId/start
 */
router.post('/:experimentId/start', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required to start experiments' });
            return;
        }
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const result = await index_js_1.experimentationService.startExperiment(experimentId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get variant assignment for current user
 * GET /api/v1/experiments/:experimentId/assignment
 */
router.get('/:experimentId/assignment', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const { tenantId, id: userId } = req.user;
        // Parse query parameters for additional attributes
        const attributes = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (key.startsWith('attr_')) {
                attributes[key.slice(5)] = value;
            }
        }
        const result = await index_js_1.experimentationService.getAssignment(experimentId, {
            userId,
            tenantId,
            attributes,
            consent: true, // Assume consent if authenticated
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get assignment with explicit context
 * POST /api/v1/experiments/:experimentId/assignment
 */
router.post('/:experimentId/assignment', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const { tenantId, id: userId } = req.user;
        const data = GetAssignmentSchema.parse(req.body);
        const result = await index_js_1.experimentationService.getAssignment(experimentId, {
            userId: data.userId || userId,
            tenantId,
            attributes: data.attributes,
            consent: data.consent,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Track metric event
 * POST /api/v1/experiments/:experimentId/metrics
 */
router.post('/:experimentId/metrics', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const { id: userId } = req.user;
        const { metricName, metricValue } = TrackMetricSchema.parse(req.body);
        await index_js_1.experimentationService.trackMetric(experimentId, userId, metricName, metricValue);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get experiment results
 * GET /api/v1/experiments/:experimentId/results
 */
router.get('/:experimentId/results', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        // Check admin or analyst role
        const userRole = req.user?.role;
        if (userRole !== 'admin' && userRole !== 'analyst') {
            res.status(403).json({ error: 'Admin or analyst access required to view results' });
            return;
        }
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const result = await index_js_1.experimentationService.getResults(experimentId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Approve or reject experiment
 * POST /api/v1/experiments/:experimentId/approve
 */
router.post('/:experimentId/approve', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const { id: userId } = req.user;
        const { role, approved, comment } = ApproveExperimentSchema.parse(req.body);
        // Verify user has the required role
        const userRole = req.user?.role;
        if (userRole !== role && userRole !== 'admin') {
            res.status(403).json({ error: `Role '${role}' required for this approval` });
            return;
        }
        const result = await index_js_1.experimentationService.approveExperiment(experimentId, userId, role, approved, comment);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Complete experiment
 * POST /api/v1/experiments/:experimentId/complete
 */
router.post('/:experimentId/complete', auth_js_1.ensureAuthenticated, requireFeatureFlag('experimentation.abTesting'), async (req, res, next) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required to complete experiments' });
            return;
        }
        const experimentId = (0, http_param_js_1.firstStringOr)(req.params.experimentId, '');
        const { rolloutWinner } = CompleteExperimentSchema.parse(req.body);
        const result = await index_js_1.experimentationService.completeExperiment(experimentId, rolloutWinner);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
