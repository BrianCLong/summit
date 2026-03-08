"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMaestroOPAEnforcer = createMaestroOPAEnforcer;
exports.buildMaestroRouter = buildMaestroRouter;
const crypto_1 = require("crypto");
const express_1 = require("express");
const opa_client_js_1 = require("../services/opa-client.js");
const correlation_id_js_1 = require("../middleware/correlation-id.js");
const logger_js_1 = require("../utils/logger.js");
const policy_action_gate_js_1 = require("../middleware/policy-action-gate.js");
const http_param_js_1 = require("../utils/http-param.js");
const budget_js_1 = require("../maestro/budget.js");
const DEFAULT_POLICY_PATH = 'maestro/authz/allow';
const DEFAULT_RESOURCE_TYPE = 'maestro/run';
function normalizeDecision(result) {
    if (typeof result === 'boolean') {
        return { allow: result };
    }
    if (result && typeof result === 'object') {
        if (typeof result.allow === 'boolean') {
            return { allow: result.allow, reason: result.reason || result.message };
        }
        if (typeof result.result === 'boolean') {
            return { allow: result.result, reason: result.reason || result.message };
        }
    }
    return { allow: false, reason: 'invalid_decision' };
}
function createMaestroOPAEnforcer(opa = opa_client_js_1.opaClient, policyPath = DEFAULT_POLICY_PATH, options = {}) {
    return async (req, res, next) => {
        const correlation = (0, correlation_id_js_1.getCorrelationContext)(req);
        const traceId = correlation.traceId ||
            req.traceId ||
            correlation.correlationId ||
            req.headers['x-trace-id'] ||
            (0, crypto_1.randomUUID)();
        const principal = {
            id: req.user?.id || req.body?.userId || 'anonymous',
            role: req.user?.role,
            tenantId: req.user?.tenantId ||
                req.user?.tenant_id ||
                req.headers['x-tenant-id'] ||
                'unknown',
        };
        const resourceType = typeof options.resourceType === 'function'
            ? options.resourceType(req)
            : options.resourceType || DEFAULT_RESOURCE_TYPE;
        const resourceId = options.resolveResourceId?.(req) ||
            req.params.runId ||
            req.params.taskId ||
            req.body?.pipeline_id;
        const resourceAttributes = {
            method: req.method.toLowerCase(),
            path: req.path,
            runId: req.params.runId,
            pipelineId: req.body?.pipeline_id,
            taskId: req.params.taskId,
            ...(options.buildResourceAttributes ? options.buildResourceAttributes(req) : {}),
        };
        const opaInput = {
            action: typeof options.action === 'function'
                ? options.action(req)
                : options.action || 'maestro.run.create',
            principal,
            resource: {
                type: resourceType,
                id: resourceId,
                attributes: resourceAttributes,
            },
            traceId,
            correlationId: correlation.correlationId,
        };
        try {
            const rawDecision = await opa.evaluateQuery(policyPath, opaInput);
            const decision = normalizeDecision(rawDecision);
            const decisionLog = {
                event: 'maestro_opa_decision',
                traceId,
                correlationId: correlation.correlationId,
                principalId: principal.id,
                principalRole: principal.role,
                tenantId: principal.tenantId,
                resourceType,
                resourceId: opaInput.resource.id,
                action: opaInput.action,
                decision: decision.allow ? 'allow' : 'deny',
                allow: decision.allow,
                reason: decision.reason,
                resourceAttributes,
            };
            const logMessage = 'Maestro OPA decision evaluated';
            if (!decision.allow) {
                logger_js_1.logger.warn(decisionLog, logMessage);
                return res.status(403).json({
                    error: 'Forbidden',
                    reason: decision.reason || 'Access denied by policy',
                });
            }
            logger_js_1.logger.info(decisionLog, logMessage);
            req.opaDecision = decision;
            return next();
        }
        catch (error) {
            logger_js_1.logger.error({
                event: 'maestro_opa_error',
                traceId,
                correlationId: correlation.correlationId,
                principalId: principal.id,
                tenantId: principal.tenantId,
                resourceType,
                error: error instanceof Error ? error.message : 'Unknown OPA evaluation error',
            }, 'Failed to evaluate Maestro OPA policy');
            return res
                .status(500)
                .json({ error: 'Policy evaluation failed', code: 'opa_error' });
        }
    };
}
function buildMaestroRouter(maestro, queries, opa = opa_client_js_1.opaClient) {
    const router = (0, express_1.Router)();
    const enforceStartRunPolicy = (0, policy_action_gate_js_1.policyActionGate)({
        action: 'start_run',
        resource: 'maestro_run',
        resolveResourceId: (req) => req.body?.pipeline_id,
        buildResourceAttributes: (req) => ({
            pipelineId: req.body?.pipeline_id,
            requestText: req.body?.requestText,
            reasoningBudget: (0, budget_js_1.summarizeBudgetForPolicy)((0, budget_js_1.normalizeReasoningBudget)(req.body?.reasoningBudget)),
        }),
    });
    const enforceRunReadPolicy = createMaestroOPAEnforcer(opa, DEFAULT_POLICY_PATH, {
        action: 'maestro.run.read',
        resourceType: 'maestro/run',
        resolveResourceId: (req) => (0, http_param_js_1.firstString)(req.params.runId),
    });
    const enforceTaskReadPolicy = createMaestroOPAEnforcer(opa, DEFAULT_POLICY_PATH, {
        action: 'maestro.task.read',
        resourceType: 'maestro/task',
        resolveResourceId: (req) => (0, http_param_js_1.firstString)(req.params.taskId) || (0, http_param_js_1.firstString)(req.params.runId),
        buildResourceAttributes: (req) => ({
            taskId: req.params.taskId,
            runId: req.params.runId,
        }),
    });
    // POST /api/maestro/runs – fire-and-return (current v0.1)
    router.post('/runs', enforceStartRunPolicy, async (req, res, next) => {
        try {
            const { userId, requestText } = req.body ?? {};
            if (!userId || !requestText) {
                return res.status(400).json({
                    error: 'Missing userId or requestText',
                });
            }
            const reasoningBudget = (0, budget_js_1.normalizeReasoningBudget)(req.body?.reasoningBudget);
            const tenantId = req.user?.tenantId ||
                req.user?.tenant_id ||
                req.body?.tenantId;
            const result = await maestro.runPipeline(userId, requestText, {
                tenantId,
                reasoningBudget,
            });
            return res.json(result);
        }
        catch (e) {
            next(e);
        }
    });
    // GET /api/maestro/runs/:runId – reconstruct current state (for polling)
    router.get('/runs/:runId', enforceRunReadPolicy, async (req, res, next) => {
        try {
            const runId = (0, http_param_js_1.firstString)(req.params.runId);
            if (!runId)
                return res.status(400).json({ error: 'runId is required' });
            const response = await queries.getRunResponse(runId);
            if (!response) {
                return res.status(404).json({ error: 'Run not found' });
            }
            return res.json(response);
        }
        catch (e) {
            next(e);
        }
    });
    // GET /api/maestro/runs/:runId/tasks – list tasks only
    router.get('/runs/:runId/tasks', enforceRunReadPolicy, async (req, res, next) => {
        try {
            const runId = (0, http_param_js_1.firstString)(req.params.runId);
            if (!runId)
                return res.status(400).json({ error: 'runId is required' });
            const run = await queries.getRunResponse(runId);
            if (!run)
                return res.status(404).json({ error: 'Run not found' });
            return res.json(run.tasks);
        }
        catch (e) {
            next(e);
        }
    });
    // GET /api/maestro/tasks/:taskId – detailed task + artifacts
    router.get('/tasks/:taskId', enforceTaskReadPolicy, async (req, res, next) => {
        try {
            const taskId = (0, http_param_js_1.firstString)(req.params.taskId);
            if (!taskId)
                return res.status(400).json({ error: 'taskId is required' });
            const result = await queries.getTaskWithArtifacts(taskId);
            if (!result)
                return res.status(404).json({ error: 'Task not found' });
            return res.json(result);
        }
        catch (e) {
            next(e);
        }
    });
    return router;
}
