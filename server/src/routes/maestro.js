"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const async_handler_js_1 = require("../middleware/async-handler.js");
const workflow_service_js_1 = require("../maestro/workflow-service.js");
const run_service_js_1 = require("../maestro/run-service.js");
const policy_client_js_1 = require("../maestro/policy-client.js");
const api_types_js_1 = require("../maestro/api-types.js");
const router = express_1.default.Router({ mergeParams: true });
// --- Workflows ---
router.post('/tenants/:tenantId/workflows', auth_js_1.ensureAuthenticated, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId } = req.params;
    // Validate tenant access
    if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to tenant' });
    }
    const input = api_types_js_1.WorkflowDefinitionSchema.parse(req.body);
    const workflow = await workflow_service_js_1.workflowService.createDefinition(tenantId, input);
    res.status(201).json(workflow);
}));
// --- Runs ---
router.post('/tenants/:tenantId/runs', auth_js_1.ensureAuthenticated, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId } = req.params;
    if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to tenant' });
    }
    // 1. OPA Preflight Check
    const policyResult = await policy_client_js_1.policyClient.evaluate({
        action: 'start_run',
        user: req.user,
        resource: { tenantId }
    });
    if (!policyResult.allowed) {
        return res.status(403).json({ error: 'Policy denied: ' + policyResult.reason });
    }
    const input = api_types_js_1.StartRunSchema.parse(req.body);
    // 2. Execute
    const run = await run_service_js_1.runService.createRun(tenantId, input.workflowId, input.input, req.user.id, input.env || 'dev');
    res.status(201).json(run);
}));
router.get('/tenants/:tenantId/runs/:runId', auth_js_1.ensureAuthenticated, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId, runId } = req.params;
    if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to tenant' });
    }
    // Retrieve logic (stub for now, assuming graph persistence works)
    // In a real implementation, we'd add `runService.getRun(runId)`
    res.json({
        id: runId,
        tenantId,
        workflowId: 'wf-stub',
        status: 'PENDING',
        input: '{}',
        receipts: []
    });
}));
// --- Approvals ---
router.post('/tenants/:tenantId/runs/:runId/approve', auth_js_1.ensureAuthenticated, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId, runId } = req.params;
    if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to tenant' });
    }
    const input = api_types_js_1.ApprovalSchema.parse(req.body);
    // Policy check for approval
    const policyResult = await policy_client_js_1.policyClient.evaluate({
        action: 'approve_run',
        user: req.user,
        resource: { tenantId, runId }
    });
    if (!policyResult.allowed) {
        return res.status(403).json({ error: 'Policy denied: ' + policyResult.reason });
    }
    // Stub logic for approval processing
    res.json({ status: 'PROCESSED', decision: input.decision });
}));
// --- Events ---
router.get('/tenants/:tenantId/runs/:runId/events', auth_js_1.ensureAuthenticated, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId, runId } = req.params;
    if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to tenant' });
    }
    // Stub response
    res.json([
        { id: 'evt-1', type: 'run.created', timestamp: new Date().toISOString(), payload: '{}' }
    ]);
}));
exports.default = router;
