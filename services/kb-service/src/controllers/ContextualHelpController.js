"use strict";
/**
 * Contextual Help Controller
 * Handles in-product help and Copilot integration endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextualHelpController = exports.ContextualHelpController = void 0;
const zod_1 = require("zod");
const index_js_1 = require("../services/index.js");
const index_js_2 = require("../types/index.js");
const SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(1).max(500),
    role: zod_1.z.nativeEnum(index_js_2.AudienceRole).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
});
class ContextualHelpController {
    /**
     * Get contextual help for a UI route
     * POST /kb/context
     */
    async getContextualHelp(req, res, next) {
        try {
            const request = index_js_2.ContextualHelpRequestSchema.parse(req.body);
            const result = await index_js_1.contextualHelpService.getContextualHelp(request);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get help for a specific anchor
     * GET /kb/anchor/:anchorKey
     */
    async getAnchorHelp(req, res, next) {
        try {
            const { anchorKey } = req.params;
            const uiRoute = req.query.route;
            const userRole = req.headers['x-user-role'];
            if (!uiRoute) {
                res.status(400).json({ error: 'Route parameter required' });
                return;
            }
            const articles = await index_js_1.contextualHelpService.getAnchorHelp(anchorKey, uiRoute, userRole);
            res.json({ articles });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Search KB for help content
     * GET /kb/search
     */
    async search(req, res, next) {
        try {
            const query = SearchQuerySchema.parse(req.query);
            const userRole = req.headers['x-user-role'];
            const articles = await index_js_1.contextualHelpService.searchHelp(query.q, userRole || query.role, query.limit);
            res.json({ articles, total: articles.length });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get help anchors for a route
     * GET /kb/anchors
     */
    async getRouteAnchors(req, res, next) {
        try {
            const uiRoute = req.query.route;
            if (!uiRoute) {
                res.status(400).json({ error: 'Route parameter required' });
                return;
            }
            const anchors = await index_js_1.contextualHelpService.getRouteAnchors(uiRoute);
            res.json({ anchors });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Check if help exists for a route
     * GET /kb/has-help
     */
    async hasHelpContent(req, res, next) {
        try {
            const uiRoute = req.query.route;
            if (!uiRoute) {
                res.status(400).json({ error: 'Route parameter required' });
                return;
            }
            const hasHelp = await index_js_1.contextualHelpService.hasHelpContent(uiRoute);
            res.json({ hasHelp });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get onboarding content
     * GET /kb/onboarding
     */
    async getOnboarding(req, res, next) {
        try {
            const userRole = req.headers['x-user-role'];
            const articles = await index_js_1.contextualHelpService.getOnboardingContent(userRole);
            res.json({ articles });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Query KB for Copilot
     * POST /kb/copilot/query
     */
    async copilotQuery(req, res, next) {
        try {
            const query = index_js_2.CopilotKBQuerySchema.parse(req.body);
            const result = await index_js_1.copilotIntegrationService.queryForCopilot(query);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get single document for Copilot
     * GET /kb/copilot/document/:id
     */
    async getCopilotDocument(req, res, next) {
        try {
            const { id } = req.params;
            const userRole = req.headers['x-user-role'];
            const document = await index_js_1.copilotIntegrationService.getDocumentForCopilot(id, userRole);
            if (!document) {
                res.status(404).json({ error: 'Document not found or not published' });
                return;
            }
            res.json(document);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get recently updated documents for Copilot sync
     * GET /kb/copilot/updates
     */
    async getCopilotUpdates(req, res, next) {
        try {
            const since = req.query.since;
            if (!since) {
                res.status(400).json({ error: 'Since parameter required (ISO date)' });
                return;
            }
            const sinceDate = new Date(since);
            if (isNaN(sinceDate.getTime())) {
                res.status(400).json({ error: 'Invalid date format' });
                return;
            }
            const userRole = req.headers['x-user-role'];
            const documents = await index_js_1.copilotIntegrationService.getRecentlyUpdated(sinceDate, userRole);
            res.json({ documents, count: documents.length });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ContextualHelpController = ContextualHelpController;
exports.contextualHelpController = new ContextualHelpController();
