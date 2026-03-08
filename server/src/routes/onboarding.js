"use strict";
/**
 * Onboarding API Routes
 *
 * REST API for the enhanced onboarding system.
 *
 * @module routes/onboarding
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../onboarding/index.js");
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
const StartOnboardingSchema = zod_1.z.object({
    persona: zod_1.z.enum(['admin', 'analyst', 'developer', 'compliance_officer', 'viewer']).optional(),
    locale: zod_1.z.string().optional(),
});
const CompleteStepSchema = zod_1.z.object({
    quizScore: zod_1.z.number().min(0).max(100).optional(),
    feedbackRating: zod_1.z.number().min(1).max(5).optional(),
    feedbackComment: zod_1.z.string().max(1000).optional(),
    actionsCompleted: zod_1.z.array(zod_1.z.string()).optional(),
});
const SkipStepSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
const InstallSampleSchema = zod_1.z.object({
    sampleId: zod_1.z.string(),
});
const HelpRequestSchema = zod_1.z.object({
    stepId: zod_1.z.string().optional(),
    topic: zod_1.z.string().optional(),
});
/**
 * Start or resume onboarding
 * POST /api/v1/onboarding/start
 */
router.post('/start', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.enhancedFlow'), async (req, res, next) => {
    try {
        const { persona, locale } = StartOnboardingSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.enhancedOnboardingService.startOnboarding(tenantId, userId, persona, locale);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get current onboarding step
 * GET /api/v1/onboarding/current-step
 */
router.get('/current-step', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.enhancedFlow'), async (req, res, next) => {
    try {
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.enhancedOnboardingService.getCurrentStep(tenantId, userId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Complete current step
 * POST /api/v1/onboarding/steps/:stepId/complete
 */
router.post('/steps/:stepId/complete', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.enhancedFlow'), async (req, res, next) => {
    try {
        const stepId = (0, http_param_js_1.firstStringOr)(req.params.stepId, '');
        const data = CompleteStepSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.enhancedOnboardingService.completeStep(tenantId, userId, stepId, data);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Skip current step
 * POST /api/v1/onboarding/steps/:stepId/skip
 */
router.post('/steps/:stepId/skip', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.enhancedFlow'), async (req, res, next) => {
    try {
        const stepId = (0, http_param_js_1.firstStringOr)(req.params.stepId, '');
        const { reason } = SkipStepSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.enhancedOnboardingService.skipStep(tenantId, userId, stepId, reason);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get sample content for persona
 * GET /api/v1/onboarding/samples
 */
router.get('/samples', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.sampleContent'), async (req, res, next) => {
    try {
        const persona = (0, http_param_js_1.firstString)(req.query.persona) || 'analyst';
        const type = (0, http_param_js_1.firstString)(req.query.type);
        const result = await index_js_1.enhancedOnboardingService.getSampleContent(persona, type);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Install sample content
 * POST /api/v1/onboarding/samples/install
 */
router.post('/samples/install', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.sampleContent'), async (req, res, next) => {
    try {
        const { sampleId } = InstallSampleSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.enhancedOnboardingService.installSampleContent(tenantId, userId, sampleId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get contextual help
 * GET /api/v1/onboarding/help
 */
router.get('/help', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.contextualHelp'), async (req, res, next) => {
    try {
        const route = (0, http_param_js_1.firstString)(req.query.route) || '/';
        const { id: userId } = req.user;
        const result = await index_js_1.enhancedOnboardingService.getContextualHelp(route, userId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Record help request
 * POST /api/v1/onboarding/help/request
 */
router.post('/help/request', auth_js_1.ensureAuthenticated, requireFeatureFlag('onboarding.contextualHelp'), async (req, res, next) => {
    try {
        const { stepId, topic } = HelpRequestSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        await index_js_1.enhancedOnboardingService.recordHelpRequest(tenantId, userId, stepId, topic);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get onboarding analytics (admin only)
 * GET /api/v1/onboarding/analytics
 */
router.get('/analytics', auth_js_1.ensureAuthenticated, requireFeatureFlag('analytics.productDashboard'), async (req, res, next) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        const period = (0, http_param_js_1.firstString)(req.query.period) || 'weekly';
        const startDate = (0, http_param_js_1.firstString)(req.query.startDate)
            ? new Date((0, http_param_js_1.firstStringOr)(req.query.startDate, ''))
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = (0, http_param_js_1.firstString)(req.query.endDate)
            ? new Date((0, http_param_js_1.firstStringOr)(req.query.endDate, ''))
            : new Date();
        const result = await index_js_1.enhancedOnboardingService.getAnalyticsSummary(period, startDate, endDate);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
