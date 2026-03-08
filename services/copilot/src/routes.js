"use strict";
/**
 * Copilot API Routes
 *
 * REST API endpoints for the NL to Query copilot:
 * - POST /copilot/preview - Generate a draft query from natural language
 * - POST /copilot/execute - Execute a confirmed draft query
 * - GET /copilot/draft/:id - Get a specific draft
 * - GET /copilot/drafts - Get user's drafts
 * - DELETE /copilot/draft/:id - Delete a draft
 * - GET /copilot/health - Health check
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCopilotRouter = createCopilotRouter;
exports.createDefaultUserContext = createDefaultUserContext;
exports.createDefaultSchemaResolver = createDefaultSchemaResolver;
exports.createDefaultPolicyResolver = createDefaultPolicyResolver;
const express_1 = require("express");
// =============================================================================
// Default Schema and Policy (for development)
// =============================================================================
const DEFAULT_SCHEMA = {
    nodeTypes: [
        {
            name: 'Person',
            labels: ['Entity', 'Person'],
            fields: [
                { name: 'id', type: 'id' },
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' },
                { name: 'confidence', type: 'number' },
                { name: 'createdAt', type: 'datetime' },
            ],
        },
        {
            name: 'Organization',
            labels: ['Entity', 'Organization'],
            fields: [
                { name: 'id', type: 'id' },
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' },
                { name: 'industry', type: 'string' },
            ],
        },
        {
            name: 'Location',
            labels: ['Entity', 'Location'],
            fields: [
                { name: 'id', type: 'id' },
                { name: 'name', type: 'string' },
                { name: 'latitude', type: 'number' },
                { name: 'longitude', type: 'number' },
            ],
        },
    ],
    edgeTypes: [
        {
            name: 'WORKS_FOR',
            from: 'Person',
            to: 'Organization',
            fields: [
                { name: 'role', type: 'string' },
                { name: 'startDate', type: 'datetime' },
            ],
        },
        {
            name: 'COMMUNICATES_WITH',
            from: 'Person',
            to: 'Person',
            fields: [
                { name: 'method', type: 'string' },
                { name: 'frequency', type: 'string' },
            ],
        },
        {
            name: 'LOCATED_AT',
            from: 'Entity',
            to: 'Location',
            fields: [],
        },
    ],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
};
const DEFAULT_POLICY = {
    maxDepth: 6,
    maxRows: 100,
    maxExecutionTimeMs: 30000,
    disallowedLabels: ['SensitivePerson', 'ClassifiedOrg'],
    disallowedNodeTypes: [],
    disallowedEdgeTypes: [],
    restrictedSensitivityLevels: ['TOP_SECRET'],
    allowedOperations: ['READ', 'AGGREGATE', 'PATH_FIND', 'CENTRALITY'],
    deniedOperations: ['CREATE', 'UPDATE', 'DELETE', 'MERGE'],
};
// =============================================================================
// Router Factory
// =============================================================================
function createCopilotRouter(config) {
    const router = (0, express_1.Router)();
    const { copilotService, getUser, getSchema, getPolicy } = config;
    // ---------------------------------------------------------------------------
    // POST /copilot/preview - Generate draft query
    // ---------------------------------------------------------------------------
    router.post('/preview', async (req, res, next) => {
        try {
            const body = req.body;
            // Validate required fields
            if (!body.userText || typeof body.userText !== 'string') {
                const error = {
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'userText is required and must be a string',
                    },
                };
                return res.status(400).json(error);
            }
            // Get user context (from auth middleware in production)
            const user = getUser(req);
            // Get schema and policy contexts
            const schema = getSchema(body.schemaContextId);
            const policy = getPolicy(body.policyContextId, user);
            // Generate draft query
            const draft = await copilotService.nlToQueryDraft({
                userText: body.userText.trim(),
                user,
                schema,
                policy,
                dialect: body.dialect,
                investigationId: body.investigationId,
                conversationId: body.conversationId,
            });
            const response = { draft };
            return res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    });
    // ---------------------------------------------------------------------------
    // POST /copilot/execute - Execute confirmed draft
    // ---------------------------------------------------------------------------
    router.post('/execute', async (req, res, next) => {
        try {
            const body = req.body;
            // Validate required fields
            if (!body.draftId || typeof body.draftId !== 'string') {
                const error = {
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'draftId is required and must be a string',
                    },
                };
                return res.status(400).json(error);
            }
            if (typeof body.confirm !== 'boolean') {
                const error = {
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'confirm is required and must be a boolean',
                    },
                };
                return res.status(400).json(error);
            }
            // Get user context
            const user = getUser(req);
            const policy = getPolicy(undefined, user);
            // Execute the query
            const result = await copilotService.executeQuery({
                draftId: body.draftId,
                confirm: body.confirm,
                overrideSafety: body.overrideSafety,
                reason: body.reason,
            }, user, policy);
            const response = result;
            return res.status(200).json(response);
        }
        catch (error) {
            // Handle specific error types
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    const errorResponse = {
                        error: {
                            code: 'NOT_FOUND',
                            message: error.message,
                        },
                    };
                    return res.status(404).json(errorResponse);
                }
                if (error.message.includes('confirmation required') ||
                    error.message.includes('safety checks') ||
                    error.message.includes('Policy denied') ||
                    error.message.includes('permission')) {
                    const errorResponse = {
                        error: {
                            code: 'FORBIDDEN',
                            message: error.message,
                        },
                    };
                    return res.status(403).json(errorResponse);
                }
                if (error.message.includes('expired')) {
                    const errorResponse = {
                        error: {
                            code: 'EXPIRED',
                            message: error.message,
                        },
                    };
                    return res.status(410).json(errorResponse);
                }
            }
            next(error);
        }
    });
    // ---------------------------------------------------------------------------
    // GET /copilot/draft/:id - Get specific draft
    // ---------------------------------------------------------------------------
    router.get('/draft/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = getUser(req);
            const draft = await copilotService.getDraft(id || '');
            if (!draft) {
                const error = {
                    error: {
                        code: 'NOT_FOUND',
                        message: `Draft not found: ${id}`,
                    },
                };
                return res.status(404).json(error);
            }
            // Check ownership (in production, also check tenant)
            if (draft.createdBy !== user.userId) {
                const error = {
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have access to this draft',
                    },
                };
                return res.status(403).json(error);
            }
            return res.status(200).json({ draft });
        }
        catch (error) {
            next(error);
        }
    });
    // ---------------------------------------------------------------------------
    // GET /copilot/drafts - Get user's drafts
    // ---------------------------------------------------------------------------
    router.get('/drafts', async (req, res, next) => {
        try {
            const user = getUser(req);
            const limit = Math.min(parseInt(typeof req.query.limit === 'string' ? req.query.limit : '10', 10) || 10, 50);
            const drafts = await copilotService.getUserDrafts(user.userId, limit);
            return res.status(200).json({ drafts });
        }
        catch (error) {
            next(error);
        }
    });
    // ---------------------------------------------------------------------------
    // DELETE /copilot/draft/:id - Delete a draft
    // ---------------------------------------------------------------------------
    router.delete('/draft/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = getUser(req);
            // Get draft to check ownership
            const draft = await copilotService.getDraft(id || '');
            if (!draft) {
                const error = {
                    error: {
                        code: 'NOT_FOUND',
                        message: `Draft not found: ${id}`,
                    },
                };
                return res.status(404).json(error);
            }
            // Check ownership
            if (draft.createdBy !== user.userId) {
                const error = {
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to delete this draft',
                    },
                };
                return res.status(403).json(error);
            }
            await copilotService.deleteDraft(id || '');
            return res.status(200).json({ success: true });
        }
        catch (error) {
            next(error);
        }
    });
    // ---------------------------------------------------------------------------
    // GET /copilot/health - Health check
    // ---------------------------------------------------------------------------
    router.get('/health', async (req, res, next) => {
        try {
            const health = await copilotService.healthCheck();
            const statusCode = health.healthy ? 200 : 503;
            return res.status(statusCode).json(health);
        }
        catch (error) {
            next(error);
        }
    });
    // ---------------------------------------------------------------------------
    // Error Handler Middleware
    // ---------------------------------------------------------------------------
    router.use((error, req, res, next) => {
        console.error('Copilot API Error:', error);
        const errorResponse = {
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'An unexpected error occurred',
            },
        };
        return res.status(500).json(errorResponse);
    });
    return router;
}
// =============================================================================
// Helper: Create Default User Context (for development)
// =============================================================================
function createDefaultUserContext(req) {
    // In production, this would extract user from JWT/session
    // For development, use headers or defaults
    const userId = req.headers['x-user-id'] || 'dev-user-001';
    const tenantId = req.headers['x-tenant-id'] || 'dev-tenant';
    const roles = (req.headers['x-user-roles'] || 'ANALYST').split(',');
    const clearances = (req.headers['x-user-clearances'] || 'UNCLASSIFIED,CONFIDENTIAL').split(',');
    return {
        userId,
        tenantId,
        roles,
        clearances,
        sessionId: req.headers['x-session-id'],
    };
}
// =============================================================================
// Helper: Create Default Schema/Policy Context Resolvers
// =============================================================================
function createDefaultSchemaResolver() {
    // In production, this could load from database or configuration
    return (schemaContextId) => {
        // Could load different schemas based on contextId
        return DEFAULT_SCHEMA;
    };
}
function createDefaultPolicyResolver() {
    return (policyContextId, user) => {
        // Could customize policy based on user roles/clearances
        const policy = { ...DEFAULT_POLICY };
        // Example: Increase limits for supervisors
        if (user?.roles.includes('SUPERVISOR') || user?.roles.includes('ADMIN')) {
            policy.maxRows = 500;
            policy.maxDepth = 8;
        }
        // Example: Allow more sensitive data for higher clearances
        if (user?.clearances.includes('SECRET') || user?.clearances.includes('TOP_SECRET')) {
            policy.restrictedSensitivityLevels = [];
        }
        return policy;
    };
}
