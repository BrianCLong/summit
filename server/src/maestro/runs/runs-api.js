"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const runs_repo_js_1 = require("./runs-repo.js");
const auth_js_1 = require("../../middleware/auth.js");
const authorization_js_1 = require("../../middleware/authorization.js");
const budget_control_js_1 = require("../../conductor/admission/budget-control.js"); // Import BudgetAdmissionController
const ioredis_1 = __importDefault(require("ioredis")); // Assuming Redis is used for budget control
const Scheduler_js_1 = require("../scheduler/Scheduler.js");
const maestro_authz_js_1 = require("../../middleware/maestro-authz.js");
const reliability_metrics_js_1 = require("../../observability/reliability-metrics.js");
const FlagService_js_1 = require("../../services/FlagService.js");
const maestro_js_1 = require("../../realtime/maestro.js");
const policy_action_gate_js_1 = require("../../middleware/policy-action-gate.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
router.use(auth_js_1.ensureAuthenticated); // Ensure all routes require authentication
router.use((0, maestro_authz_js_1.maestroAuthzMiddleware)({ resource: 'runs' }));
// Initialize BudgetAdmissionController (assuming Redis client is available)
// In a real application, Redis client would be injected or managed globally
const redisClient = new ioredis_1.default(); // This should be a proper Redis client instance
const budgetController = (0, budget_control_js_1.createBudgetController)(redisClient);
const emitRunStatus = async (tenantId, runId, status) => {
    try {
        const { getIO } = await Promise.resolve().then(() => __importStar(require('../../realtime/socket.js')));
        const io = typeof getIO === 'function' ? getIO() : null;
        if (io) {
            maestro_js_1.MaestroEvents.emitStatusChange(io, tenantId, runId, status);
        }
    }
    catch (error) {
        console.warn('Failed to emit maestro status update', error);
    }
};
const RunCreateSchema = zod_1.z.object({
    pipeline_id: zod_1.z.string().uuid(),
    pipeline_name: zod_1.z.string().min(1).max(128),
    input_params: zod_1.z.record(zod_1.z.any()).optional(),
    executor_id: zod_1.z.string().uuid().optional(),
});
const RunUpdateSchema = zod_1.z.object({
    status: zod_1.z
        .enum(['queued', 'running', 'succeeded', 'failed', 'cancelled'])
        .optional(),
    started_at: zod_1.z.coerce.date().optional(),
    completed_at: zod_1.z.coerce.date().optional(),
    duration_ms: zod_1.z.number().int().min(0).optional(),
    cost: zod_1.z.number().min(0).optional(),
    output_data: zod_1.z.record(zod_1.z.any()).optional(),
    error_message: zod_1.z.string().optional(),
});
// GET /runs - List all runs with pagination
router.get('/runs', (0, authorization_js_1.authorize)('run_maestro'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        const tenantId = req.context.tenantId; // Get tenantId from context
        const items = await runs_repo_js_1.runsRepo.list(tenantId, limit, offset); // Pass tenantId
        // Format response to match frontend expectations
        const formattedItems = items.map((run) => ({
            id: run.id,
            pipeline: run.pipeline,
            status: run.status,
            durationMs: run.duration_ms || 0,
            cost: run.cost,
        }));
        res.json({ items: formattedItems });
    }
    catch (error) {
        console.error('Error fetching runs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /runs - Create a new run
router.post('/runs', (0, policy_action_gate_js_1.policyActionGate)({
    action: 'start_run',
    resource: 'maestro_run',
    resolveResourceId: (req) => req.body?.pipeline_id,
    buildResourceAttributes: (req) => ({
        pipelineId: req.body?.pipeline_id,
    }),
}), (0, authorization_js_1.authorize)('run_maestro'), async (req, res) => {
    // Kill Switch Check
    if (FlagService_js_1.flagService.getFlag('DISABLE_MAESTRO_RUNS')) {
        return res.status(503).json({ error: 'Maestro run creation is currently disabled due to maintenance or high load.' });
    }
    const start = process.hrtime();
    const tenantId = req.context.tenantId; // Get tenantId from context
    try {
        const validation = RunCreateSchema.safeParse(req.body);
        if (!validation.success) {
            (0, reliability_metrics_js_1.recordEndpointResult)({
                endpoint: 'maestro_execution',
                statusCode: 400,
                durationSeconds: 0,
                tenantId
            });
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.issues,
            });
        }
        const estimatedCostUsd = 0.01; // Placeholder for estimated cost of a new run
        // Perform budget admission check
        const admissionDecision = await budgetController.admit('LLM_LIGHT', estimatedCostUsd, {
            // Use a default expert type for admission
            tenantId: tenantId,
            userId: req.user?.id, // Assuming user ID is available
        });
        if (!admissionDecision.admit) {
            return res.status(402).json({
                error: 'Budget Exceeded',
                message: admissionDecision.reason,
                code: 'budget_exceeded',
                budgetRemaining: admissionDecision.budgetRemaining,
                retryAfterMs: admissionDecision.retryAfterMs,
            });
        }
        //
        // TODO: This is a placeholder for the quota service
        //
        // await quotaService.assert({
        //   tenantId,
        //   dimension: 'maestro.runs',
        //   quantity: 1,
        // });
        const run = await runs_repo_js_1.runsRepo.create({
            ...validation.data,
            tenant_id: tenantId,
        }); // Pass tenantId
        // Enqueue the run in the scheduler
        await Scheduler_js_1.scheduler.enqueueRun(run.id, tenantId);
        await emitRunStatus(tenantId, run.id, run.status);
        // Format response
        const formattedRun = {
            id: run.id,
            pipeline: run.pipeline,
            status: run.status,
            durationMs: run.duration_ms || 0,
            cost: run.cost,
        };
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds + nanoseconds / 1e9;
        (0, reliability_metrics_js_1.recordEndpointResult)({
            endpoint: 'maestro_execution',
            statusCode: 201,
            durationSeconds: duration,
            tenantId
        });
        res.status(201).json(formattedRun);
    }
    catch (error) {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds + nanoseconds / 1e9;
        (0, reliability_metrics_js_1.recordEndpointResult)({
            endpoint: 'maestro_execution',
            statusCode: 500,
            durationSeconds: duration,
            tenantId
        });
        console.error('Error creating run:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /runs/:id - Get a specific run
router.get('/runs/:id', (0, authorization_js_1.authorize)('run_maestro'), async (req, res) => {
    try {
        const tenantId = req.context.tenantId; // Get tenantId from context
        // Use the explicit tenant helper
        const run = await runs_repo_js_1.runsRepo.getRunForTenant(req.params.id, tenantId);
        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }
        //
        // TODO: This is a placeholder for the usage metering service
        //
        // if (run.status === 'succeeded') {
        //   await usageMeteringService.record({
        //     id: '',
        //     tenantId,
        //     dimension: 'maestro.runs',
        //     quantity: 1,
        //     unit: 'count',
        //     source: 'maestro',
        //     metadata: {
        //       pipeline_id: run.pipeline_id,
        //     },
        //     occurredAt: new Date().toISOString(),
        //     recordedAt: new Date().toISOString(),
        //   });
        // }
        res.json(run);
    }
    catch (error) {
        console.error('Error fetching run:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// PUT /runs/:id - Update a run
router.put('/runs/:id', (0, authorization_js_1.authorize)('run_maestro'), async (req, res) => {
    try {
        const validation = RunUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.issues,
            });
        }
        const tenantId = req.context.tenantId; // Get tenantId from context
        if (validation.data.status === 'cancelled') {
            const decision = await (0, policy_action_gate_js_1.evaluatePolicyAction)({
                action: 'cancel_run',
                resource: 'maestro_run',
                tenantId,
                userId: req.user?.id,
                role: req.user?.role,
                resourceAttributes: {
                    runId: req.params.id,
                    status: validation.data.status,
                },
                subjectAttributes: req.user?.attributes || {},
                sessionContext: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: Date.now(),
                    sessionId: req.sessionID,
                },
            });
            if (!decision.allow) {
                return res.status(403).json({
                    error: 'Forbidden',
                    reason: decision.reason,
                    decision,
                });
            }
        }
        // Calculate duration if both start and end times provided
        if (validation.data.started_at && validation.data.completed_at) {
            validation.data.duration_ms =
                validation.data.completed_at.getTime() -
                    validation.data.started_at.getTime();
        }
        const run = await runs_repo_js_1.runsRepo.update(req.params.id, validation.data, tenantId); // Pass tenantId
        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }
        if (validation.data.status) {
            await emitRunStatus(tenantId, run.id, validation.data.status);
        }
        res.json(run);
    }
    catch (error) {
        console.error('Error updating run:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /runs/:id - Delete a run
router.delete('/runs/:id', (0, policy_action_gate_js_1.policyActionGate)({
    action: 'delete_run',
    resource: 'maestro_run',
    resolveResourceId: (req) => req.params.id,
    buildResourceAttributes: (req) => ({
        runId: req.params.id,
    }),
}), (0, authorization_js_1.authorize)('run_maestro'), async (req, res) => {
    try {
        const tenantId = req.context.tenantId; // Get tenantId from context
        const deleted = await runs_repo_js_1.runsRepo.delete(req.params.id, tenantId); // Pass tenantId
        res.status(deleted ? 204 : 404).send();
    }
    catch (error) {
        console.error('Error deleting run:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /pipelines/:id/runs - Get runs for a specific pipeline
router.get('/pipelines/:id/runs', (0, authorization_js_1.authorize)('run_maestro'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const tenantId = req.context.tenantId; // Get tenantId from context
        const runs = await runs_repo_js_1.runsRepo.getByPipeline(req.params.id, tenantId, limit); // Pass tenantId
        const formattedRuns = runs.map((run) => ({
            id: run.id,
            pipeline: run.pipeline,
            status: run.status,
            durationMs: run.duration_ms || 0,
            cost: run.cost,
        }));
        res.json({ items: formattedRuns });
    }
    catch (error) {
        console.error('Error fetching pipeline runs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
