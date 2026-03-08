"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AutomationExecutor_js_1 = require("../src/autonomous/AutomationExecutor.js");
const GuardrailService_js_1 = require("../src/autonomous/GuardrailService.js");
const ApprovalService_js_1 = require("../src/autonomous/ApprovalService.js");
// Mocks
const mockLogger = {
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
    child: globals_1.jest.fn().mockReturnThis(),
};
const mockDb = {
    query: globals_1.jest.fn(() => Promise.resolve({ rowCount: 1 })),
};
const mockPolicyEngine = {
    evaluate: globals_1.jest.fn(() => Promise.resolve({ allowed: true })),
};
(0, globals_1.describe)('Autonomous Operations Flow', () => {
    let executor;
    let guardrailService;
    let approvalService;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockPolicyEngine.evaluate.mockImplementation(() => Promise.resolve({ allowed: true }));
        mockDb.query.mockImplementation(() => Promise.resolve({ rowCount: 1 }));
        guardrailService = new GuardrailService_js_1.GuardrailService(mockPolicyEngine, mockLogger);
        approvalService = new ApprovalService_js_1.ApprovalService(mockDb, mockLogger);
        executor = new AutomationExecutor_js_1.AutomationExecutor(guardrailService, approvalService, mockLogger);
    });
    (0, globals_1.describe)('GuardrailService', () => {
        (0, globals_1.it)('should block cross-tenant actions', async () => {
            const result = await guardrailService.checkGuardrails({
                actionType: 'test_action',
                tenantId: 'global',
            });
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.reason).toContain('Cross-tenant actions are strictly prohibited');
        });
        (0, globals_1.it)('should block policy changes', async () => {
            const result = await guardrailService.checkGuardrails({
                actionType: 'update_policy',
                tenantId: 'tenant-1',
            });
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.reason).toContain('Autonomous policy changes are strictly prohibited');
        });
        (0, globals_1.it)('should allow valid operational actions', async () => {
            const result = await guardrailService.checkGuardrails({
                actionType: 'throttle_tenant',
                tenantId: 'tenant-1',
            });
            // Since throttle_tenant is in the whitelist for data mutation check,
            // it proceeds to policy engine check.
            (0, globals_1.expect)(mockPolicyEngine.evaluate).toHaveBeenCalled();
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('AutomationExecutor', () => {
        (0, globals_1.it)('should require approval for scaling actions', async () => {
            // Setup: Allow via guardrails
            const result = await executor.executeAction({
                type: 'suggest_scale_up',
                tenantId: 'tenant-1',
                payload: { amount: 2 },
                reason: 'High load'
            });
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.approvalId).toBeDefined();
            (0, globals_1.expect)(mockDb.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO autonomous_approvals'), globals_1.expect.any(Array));
        });
        (0, globals_1.it)('should execute safe actions immediately', async () => {
            // Setup: Allow via guardrails
            const result = await executor.executeAction({
                type: 'auto_retry',
                tenantId: 'tenant-1',
                payload: { jobId: 'job-123' },
                reason: 'Transient failure'
            });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(mockDb.query).not.toHaveBeenCalled(); // No approval needed
        });
        (0, globals_1.it)('should block unsafe actions via guardrails', async () => {
            const result = await executor.executeAction({
                type: 'delete_user_data', // Should be caught by "Data Mutation" guardrail
                tenantId: 'tenant-1',
                payload: {},
                reason: 'Cleanup'
            });
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.error).toContain('Autonomous business data mutation is strictly prohibited');
        });
    });
});
