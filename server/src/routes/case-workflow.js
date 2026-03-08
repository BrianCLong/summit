"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCaseWorkflowRouter = createCaseWorkflowRouter;
const express_1 = require("express");
const index_js_1 = require("../cases/workflow/index.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const http_param_js_1 = require("../utils/http-param.js");
const routeLogger = logger_js_1.default.child({ name: 'CaseWorkflowRoutes' });
/**
 * Helper to extract user ID and tenant ID from authenticated request
 */
function extractAuthContext(req) {
    if (!req.user?.id) {
        return null;
    }
    const userId = req.user.id;
    const tenantId = req.user.tenantId ||
        (req.tenant && 'id' in req.tenant && typeof req.tenant.id === 'string'
            ? req.tenant.id
            : req.tenant?.tenantId);
    if (!tenantId) {
        return null;
    }
    return { userId, tenantId };
}
function createCaseWorkflowRouter(pg) {
    const router = (0, express_1.Router)();
    router.use((0, rateLimit_js_1.createRouteRateLimitMiddleware)('caseWorkflow'));
    const workflowService = new index_js_1.CaseWorkflowService(pg);
    // ==================== WORKFLOW TRANSITIONS ====================
    /**
     * POST /api/cases/:id/transition
     * Transition case to a new stage
     */
    router.post('/cases/:id/transition', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { toStage, reason, legalBasis, metadata } = req.body;
            // Extract userId and tenantId from authenticated request
            if (!req.user?.id) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const userId = req.user.id;
            const tenantId = req.user.tenantId ||
                (req.tenant && 'id' in req.tenant && typeof req.tenant.id === 'string'
                    ? req.tenant.id
                    : req.tenant?.tenantId);
            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant ID is required' });
            }
            if (!toStage || !reason) {
                return res.status(400).json({
                    error: 'toStage and reason are required',
                });
            }
            const result = await workflowService.transitionStage({
                caseId,
                toStage,
                userId,
                reason,
                legalBasis,
                metadata,
            }, {
                legalBasis: legalBasis || 'investigation',
                tenantId,
            });
            if (!result.success) {
                return res.status(400).json({
                    error: 'Transition failed',
                    errors: result.errors,
                });
            }
            res.json({
                success: true,
                newStage: result.newStage,
                newStatus: result.newStatus,
                warnings: result.warnings,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Stage transition failed');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * GET /api/cases/:id/available-transitions
     * Get available transitions for a case
     */
    router.get('/cases/:id/available-transitions', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            if (!req.user?.id) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const userId = req.user.id;
            const tenantId = req.user.tenantId ||
                (req.tenant && 'id' in req.tenant && typeof req.tenant.id === 'string'
                    ? req.tenant.id
                    : req.tenant?.tenantId);
            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant ID is required' });
            }
            const transitions = await workflowService.getAvailableTransitions(caseId, userId, tenantId);
            res.json({ transitions });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to get available transitions');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // ==================== TASK MANAGEMENT ====================
    /**
     * POST /api/cases/:id/tasks
     * Create a task
     */
    router.post('/cases/:id/tasks', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { title, description, taskType, priority, assignedTo, dueDate, requiredRoleId, metadata, } = req.body;
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            if (!title) {
                return res.status(400).json({ error: 'title is required' });
            }
            const task = await workflowService.createTask({
                caseId,
                title,
                description,
                taskType,
                priority,
                assignedTo,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                requiredRoleId,
                metadata,
                createdBy: authContext.userId,
            }, {
                legalBasis: 'investigation',
                reason: `Task created: ${title}`,
                tenantId: authContext.tenantId,
            });
            res.status(201).json(task);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Task creation failed');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * GET /api/cases/:id/tasks
     * List tasks for a case
     */
    router.get('/cases/:id/tasks', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const status = (0, http_param_js_1.firstString)(req.query.status);
            const priority = (0, http_param_js_1.firstString)(req.query.priority);
            const assignedTo = (0, http_param_js_1.firstString)(req.query.assignedTo);
            const tasks = await workflowService.listTasks({
                caseId,
                status: status,
                priority: priority,
                assignedTo,
            });
            res.json(tasks);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to list tasks');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * PUT /api/tasks/:id/assign
     * Assign task to user
     */
    router.put('/tasks/:id/assign', async (req, res) => {
        try {
            const taskId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { userId: assignedTo } = req.body;
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            if (!assignedTo) {
                return res.status(400).json({ error: 'userId is required' });
            }
            const task = await workflowService.assignTask(taskId, assignedTo, authContext.userId, authContext.tenantId);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.json(task);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Task assignment failed');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * PUT /api/tasks/:id/complete
     * Complete a task
     */
    router.put('/tasks/:id/complete', async (req, res) => {
        try {
            const taskId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { resultData } = req.body;
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            const task = await workflowService.completeTask(taskId, authContext.userId, authContext.tenantId, resultData);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.json(task);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Task completion failed');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * GET /api/cases/:id/tasks/overdue
     * Get overdue tasks for a case
     */
    router.get('/cases/:id/tasks/overdue', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const overdueTasks = await workflowService.getOverdueTasks(caseId);
            res.json(overdueTasks);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to get overdue tasks');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // ==================== PARTICIPANT MANAGEMENT ====================
    /**
     * POST /api/cases/:id/participants
     * Add participant to case
     */
    router.post('/cases/:id/participants', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { userId, roleId, metadata } = req.body;
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            if (!userId || !roleId) {
                return res.status(400).json({ error: 'userId and roleId are required' });
            }
            const participant = await workflowService.addParticipant({
                caseId,
                userId,
                roleId,
                assignedBy: authContext.userId,
                metadata,
            }, authContext.tenantId);
            res.status(201).json(participant);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to add participant');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * GET /api/cases/:id/participants
     * Get case participants
     */
    router.get('/cases/:id/participants', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const participants = await workflowService.getCaseParticipants(caseId);
            res.json(participants);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to get participants');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * DELETE /api/cases/:caseId/participants/:userId/:roleId
     * Remove participant from case
     */
    router.delete('/cases/:caseId/participants/:userId/:roleId', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.caseId, '');
            const userId = (0, http_param_js_1.firstStringOr)(req.params.userId, '');
            const roleId = (0, http_param_js_1.firstStringOr)(req.params.roleId, '');
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            const participant = await workflowService.removeParticipant(caseId, userId, roleId, authContext.userId, authContext.tenantId);
            if (!participant) {
                return res.status(404).json({ error: 'Participant not found' });
            }
            res.json(participant);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to remove participant');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // ==================== APPROVAL MANAGEMENT ====================
    /**
     * POST /api/cases/:id/approvals
     * Request approval
     */
    router.post('/cases/:id/approvals', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { taskId, approvalType, requiredApprovers, requiredRoleId, reason, metadata, } = req.body;
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            if (!approvalType || !reason) {
                return res.status(400).json({
                    error: 'approvalType and reason are required',
                });
            }
            const approval = await workflowService.requestApproval({
                caseId,
                taskId,
                approvalType,
                requiredApprovers,
                requiredRoleId,
                requestedBy: authContext.userId,
                reason,
                metadata,
            }, authContext.tenantId);
            res.status(201).json(approval);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Approval request failed');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * POST /api/approvals/:id/vote
     * Submit approval vote
     */
    router.post('/approvals/:id/vote', async (req, res) => {
        try {
            const approvalId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const { decision, reason, metadata } = req.body;
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            if (!decision) {
                return res.status(400).json({ error: 'decision is required' });
            }
            const vote = await workflowService.submitApprovalVote({
                approvalId,
                approverUserId: authContext.userId,
                decision,
                reason,
                metadata,
            }, authContext.tenantId);
            res.status(201).json(vote);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Approval vote failed');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * GET /api/approvals/pending
     * Get pending approvals for current user
     */
    router.get('/approvals/pending', async (req, res) => {
        try {
            const authContext = extractAuthContext(req);
            if (!authContext) {
                return res.status(401).json({ error: 'Authentication and tenant context required' });
            }
            const approvals = await workflowService.getPendingApprovalsForUser(authContext.userId);
            res.json(approvals);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to get pending approvals');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // ==================== SLA MANAGEMENT ====================
    /**
     * GET /api/cases/:id/slas
     * Get SLAs for a case
     */
    router.get('/cases/:id/slas', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const slas = await workflowService.getCaseSLAs(caseId);
            res.json(slas);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to get SLAs');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /**
     * GET /api/cases/:id/slas/summary
     * Get SLA summary for a case
     */
    router.get('/cases/:id/slas/summary', async (req, res) => {
        try {
            const caseId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
            const summary = await workflowService.getCaseSLASummary(caseId);
            res.json(summary);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to get SLA summary');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // ==================== ROLE MANAGEMENT ====================
    /**
     * GET /api/roles
     * List all roles
     */
    router.get('/roles', async (req, res) => {
        try {
            const systemOnly = (0, http_param_js_1.firstString)(req.query.systemOnly);
            const roles = await workflowService.listRoles(systemOnly === 'true');
            res.json(roles);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            routeLogger.error({ error: errorMessage }, 'Failed to list roles');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    return router;
}
