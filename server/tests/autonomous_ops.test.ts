import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { AutomationExecutor } from '../src/autonomous/AutomationExecutor.js';
import { GuardrailService } from '../src/autonomous/GuardrailService.js';
import { ApprovalService } from '../src/autonomous/ApprovalService.js';
// import { PolicyEngine } from '../src/autonomous/policy-engine.js';
// import { Logger } from 'pino';
// import { Pool } from 'pg';

// Mocks
const mockLogger = {
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
  debug: mock.fn(),
  child: mock.fn(() => mockLogger),
};

const mockDb = {
    query: mock.fn(),
};

const mockPolicyEngine = {
    evaluate: mock.fn(),
};

describe('Autonomous Operations Flow', () => {
  let executor;
  let guardrailService;
  let approvalService;

  beforeEach(() => {
    mockLogger.info.mock.resetCalls();
    mockLogger.warn.mock.resetCalls();
    mockLogger.error.mock.resetCalls();
    mockLogger.debug.mock.resetCalls();

    mockDb.query.mock.resetCalls();
    mockPolicyEngine.evaluate.mock.resetCalls();

    guardrailService = new GuardrailService(mockPolicyEngine, mockLogger);
    approvalService = new ApprovalService(mockDb, mockLogger);
    executor = new AutomationExecutor(guardrailService, approvalService, mockLogger);
  });

  describe('GuardrailService', () => {
    it('should block cross-tenant actions', async () => {
      const result = await guardrailService.checkGuardrails({
        actionType: 'test_action',
        tenantId: 'global',
      });
      assert.strictEqual(result.allowed, false);
      assert.match(result.reason, /Cross-tenant actions are strictly prohibited/);
    });

    it('should block policy changes', async () => {
        const result = await guardrailService.checkGuardrails({
          actionType: 'update_policy',
          tenantId: 'tenant-1',
        });
        assert.strictEqual(result.allowed, false);
        assert.match(result.reason, /Autonomous policy changes are strictly prohibited/);
    });

    it('should allow valid operational actions', async () => {
        mockPolicyEngine.evaluate.mock.mockImplementation(async () => ({ allowed: true }));

        const result = await guardrailService.checkGuardrails({
            actionType: 'throttle_tenant',
            tenantId: 'tenant-1',
        });

        // Since throttle_tenant is in the whitelist for data mutation check,
        // it proceeds to policy engine check.
        assert.strictEqual(mockPolicyEngine.evaluate.mock.callCount(), 1);
        assert.strictEqual(result.allowed, true);
    });
  });

  describe('AutomationExecutor', () => {
     it('should require approval for scaling actions', async () => {
         // Setup: Allow via guardrails
         mockPolicyEngine.evaluate.mock.mockImplementation(async () => ({ allowed: true }));

         // Setup: Database mock for approval request
         mockDb.query.mock.mockImplementation(async () => ({ rowCount: 1 }));

         const result = await executor.executeAction({
             type: 'suggest_scale_up',
             tenantId: 'tenant-1',
             payload: { amount: 2 },
             reason: 'High load'
         });

         assert.strictEqual(result.success, false);
         assert.ok(result.approvalId);
         assert.strictEqual(mockDb.query.mock.callCount(), 1);
     });

     it('should execute safe actions immediately', async () => {
        // Setup: Allow via guardrails
        mockPolicyEngine.evaluate.mock.mockImplementation(async () => ({ allowed: true }));

        const result = await executor.executeAction({
            type: 'auto_retry',
            tenantId: 'tenant-1',
            payload: { jobId: 'job-123' },
            reason: 'Transient failure'
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(mockDb.query.mock.callCount(), 0); // No approval needed
     });

     it('should block unsafe actions via guardrails', async () => {
        const result = await executor.executeAction({
            type: 'delete_user_data', // Should be caught by "Data Mutation" guardrail
            tenantId: 'tenant-1',
            payload: {},
            reason: 'Cleanup'
        });

        assert.strictEqual(result.success, false);
        assert.match(result.error, /Autonomous business data mutation is strictly prohibited/);
     });
  });
});
