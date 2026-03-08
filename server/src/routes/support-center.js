"use strict";
/**
 * Support Center API Routes
 *
 * REST API for knowledge base, FAQs, and support tickets.
 *
 * @module routes/support-center
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../support/index.js");
const auth_js_1 = require("../middleware/auth.js");
const featureFlags_js_1 = require("../lib/featureFlags.js");
const index_js_2 = require("../services/support/index.js");
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
// Optional auth middleware - allows unauthenticated access
const optionalAuth = async (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
        ? auth.slice('Bearer '.length)
        : req.headers['x-access-token'] || null;
    if (!token) {
        // Allow unauthenticated access
        next();
        return;
    }
    // If token is provided, validate it
    try {
        const AuthService = (await Promise.resolve().then(() => __importStar(require('../services/AuthService.js')))).default;
        const authService = new AuthService();
        const user = await authService.verifyToken(token);
        if (user) {
            // Map User to Express request user shape
            req.user = {
                id: user.id,
                tenantId: user.defaultTenantId || 'default',
                role: user.role,
                email: user.email,
            };
        }
    }
    catch {
        // Invalid token - continue without auth
    }
    next();
};
// Validation schemas
const SearchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(200),
    category: zod_1.z.string().optional(),
    locale: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(50).optional(),
});
const CreateTicketSchema = zod_1.z.object({
    subject: zod_1.z.string().min(5).max(200),
    description: zod_1.z.string().min(10).max(10000),
    type: zod_1.z.enum(['question', 'bug', 'feature_request', 'incident', 'compliance', 'security']),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    category: zod_1.z.string().optional(),
});
const AddMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(10000),
    isInternal: zod_1.z.boolean().optional(),
});
const VoteSchema = zod_1.z.object({
    helpful: zod_1.z.boolean(),
});
const ImpersonationStartSchema = zod_1.z.object({
    targetUserId: zod_1.z.string().min(1),
    targetTenantId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(5).max(2000),
    ticketId: zod_1.z.string().optional(),
});
const ImpersonationStopSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(5).max(2000),
});
const TenantHealthBundleSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(5).max(2000),
});
/**
 * Search knowledge base and FAQs
 * GET /api/v1/support/search
 */
router.get('/search', optionalAuth, requireFeatureFlag('support.knowledgeBase'), async (req, res, next) => {
    try {
        const query = (0, http_param_js_1.firstString)(req.query.q);
        const category = (0, http_param_js_1.firstString)(req.query.category);
        const locale = (0, http_param_js_1.firstString)(req.query.locale);
        const limit = (0, http_param_js_1.firstString)(req.query.limit)
            ? parseInt((0, http_param_js_1.firstStringOr)(req.query.limit, '0'))
            : undefined;
        if (!query) {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }
        const result = await index_js_1.supportCenterService.search(query, {
            category: category,
            locale,
            limit,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get knowledge base articles
 * GET /api/v1/support/articles
 */
router.get('/articles', optionalAuth, requireFeatureFlag('support.knowledgeBase'), async (req, res, next) => {
    try {
        const category = (0, http_param_js_1.firstString)(req.query.category);
        const locale = (0, http_param_js_1.firstString)(req.query.locale);
        const limit = (0, http_param_js_1.firstString)(req.query.limit)
            ? parseInt((0, http_param_js_1.firstStringOr)(req.query.limit, '0'))
            : undefined;
        const offset = (0, http_param_js_1.firstString)(req.query.offset)
            ? parseInt((0, http_param_js_1.firstStringOr)(req.query.offset, '0'))
            : undefined;
        const result = await index_js_1.supportCenterService.getArticles({
            category: category,
            locale,
            limit,
            offset,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get article by slug
 * GET /api/v1/support/articles/:slug
 */
router.get('/articles/:slug', optionalAuth, requireFeatureFlag('support.knowledgeBase'), async (req, res, next) => {
    try {
        const slug = (0, http_param_js_1.firstStringOr)(req.params.slug, '');
        const result = await index_js_1.supportCenterService.getArticleBySlug(slug, true);
        if (!result.data) {
            res.status(404).json({ error: 'Article not found' });
            return;
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Vote on article helpfulness
 * POST /api/v1/support/articles/:id/vote
 */
router.post('/articles/:id/vote', optionalAuth, requireFeatureFlag('support.knowledgeBase'), async (req, res, next) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { helpful } = VoteSchema.parse(req.body);
        await index_js_1.supportCenterService.voteArticle(id, helpful);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get FAQs
 * GET /api/v1/support/faqs
 */
router.get('/faqs', optionalAuth, requireFeatureFlag('support.faq'), async (req, res, next) => {
    try {
        const category = (0, http_param_js_1.firstString)(req.query.category);
        const locale = (0, http_param_js_1.firstString)(req.query.locale);
        const result = await index_js_1.supportCenterService.getFAQs({
            category: category,
            locale,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Start support impersonation
 * POST /api/v1/support/impersonation/start
 */
router.post('/impersonation/start', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.impersonation'), async (req, res, next) => {
    try {
        const payload = ImpersonationStartSchema.parse(req.body);
        const user = req.user;
        const actor = {
            id: user?.id,
            role: user?.role,
            tenantId: (user?.tenantId || user?.defaultTenantId),
            email: user?.email,
        };
        const result = await index_js_2.supportImpersonationService.startImpersonation({
            actor,
            targetUserId: payload.targetUserId,
            targetTenantId: payload.targetTenantId,
            reason: payload.reason,
            ticketId: payload.ticketId,
        });
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Stop support impersonation
 * POST /api/v1/support/impersonation/stop
 */
router.post('/impersonation/stop', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.impersonation'), async (req, res, next) => {
    try {
        const payload = ImpersonationStopSchema.parse(req.body);
        const user = req.user;
        const actor = {
            id: user?.id,
            role: user?.role,
            tenantId: (user?.tenantId || user?.defaultTenantId),
            email: user?.email,
        };
        const result = await index_js_2.supportImpersonationService.stopImpersonation({
            actor,
            sessionId: payload.sessionId,
            reason: payload.reason,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Export tenant health bundle
 * POST /api/v1/support/tenant-health-bundle
 */
router.post('/tenant-health-bundle', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.healthBundle'), async (req, res, next) => {
    try {
        const payload = TenantHealthBundleSchema.parse(req.body);
        const user = req.user;
        const actor = {
            id: user?.id,
            role: user?.role,
            tenantId: (user?.tenantId || user?.defaultTenantId),
            email: user?.email,
        };
        const result = await index_js_2.tenantHealthBundleService.exportBundle({
            actor,
            tenantId: payload.tenantId,
            reason: payload.reason,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Create support ticket
 * POST /api/v1/support/tickets
 */
router.post('/tickets', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.tickets'), async (req, res, next) => {
    try {
        const data = CreateTicketSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.supportCenterService.createTicket(tenantId, userId, {
            subject: data.subject,
            description: data.description,
            type: data.type,
            priority: data.priority,
            category: data.category,
        });
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Add message to ticket
 * POST /api/v1/support/tickets/:ticketId/messages
 */
router.post('/tickets/:ticketId/messages', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.tickets'), async (req, res, next) => {
    try {
        const ticketId = (0, http_param_js_1.firstStringOr)(req.params.ticketId, '');
        const { content, isInternal } = AddMessageSchema.parse(req.body);
        const { id: userId } = req.user;
        const result = await index_js_1.supportCenterService.addMessage(ticketId, userId, 'customer', content, isInternal || false);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Escalate ticket
 * POST /api/v1/support/tickets/:ticketId/escalate
 */
router.post('/tickets/:ticketId/escalate', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.escalation'), async (req, res, next) => {
    try {
        const ticketId = (0, http_param_js_1.firstStringOr)(req.params.ticketId, '');
        const { reason } = req.body;
        const result = await index_js_1.supportCenterService.escalateTicket(ticketId, reason || 'User requested escalation');
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get support center configuration
 * GET /api/v1/support/config
 */
router.get('/config', optionalAuth, async (req, res, next) => {
    try {
        const result = index_js_1.supportCenterService.getConfig();
        // Filter out sensitive configuration for non-admin users
        const publicConfig = {
            enabled: result.data.enabled,
            knowledgeBaseEnabled: result.data.knowledgeBaseEnabled,
            faqEnabled: result.data.faqEnabled,
            ticketsEnabled: result.data.ticketsEnabled,
            liveChatEnabled: result.data.liveChatEnabled,
            supportedLocales: result.data.supportedLocales,
        };
        res.json({
            ...result,
            data: publicConfig,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
