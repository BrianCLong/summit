import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AutomationExecutor } from '../src/autonomous/AutomationExecutor';
import { GuardrailService } from '../src/autonomous/GuardrailService';
import { ApprovalService } from '../src/autonomous/ApprovalService';
import { PolicyDecision, PolicyEngine } from '../src/autonomous/policy-engine';
import { Logger } from 'pino';
import { Pool } from 'pg';

// Mocks
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
} as unknown as Logger;

const mockDb = {
  query: jest.fn(() => Promise.resolve({ rowCount: 1 })),
} as unknown as Pool;

const mockPolicyEngine = {
  evaluate: jest.fn(() => Promise.resolve({ allowed: true } as PolicyDecision)),
} as unknown as PolicyEngine;

describe('Autonomous Operations Flow', () => {
  let executor: AutomationExecutor;
  let guardrailService: GuardrailService;
  let approvalService: ApprovalService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPolicyEngine.evaluate as jest.Mock).mockImplementation(() =>
      Promise.resolve({ allowed: true } as PolicyDecision),
    );
    (mockDb.query as jest.Mock).mockImplementation(() =>
      Promise.resolve({ rowCount: 1 }),
    );
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
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-tenant actions are strictly prohibited');
    });

    it('should block policy changes', async () => {
        const result = await guardrailService.checkGuardrails({
          actionType: 'update_policy',
          tenantId: 'tenant-1',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Autonomous policy changes are strictly prohibited');
    });

    it('should allow valid operational actions', async () => {
        const result = await guardrailService.checkGuardrails({
            actionType: 'throttle_tenant',
            tenantId: 'tenant-1',
        });

        // Since throttle_tenant is in the whitelist for data mutation check,
        // it proceeds to policy engine check.
        expect(mockPolicyEngine.evaluate).toHaveBeenCalled();
        expect(result.allowed).toBe(true);
    });
  });

  describe('AutomationExecutor', () => {
     it('should require approval for scaling actions', async () => {
         // Setup: Allow via guardrails
         const result = await executor.executeAction({
             type: 'suggest_scale_up',
             tenantId: 'tenant-1',
             payload: { amount: 2 },
             reason: 'High load'
         });

         expect(result.success).toBe(false);
         expect(result.approvalId).toBeDefined();
         expect(mockDb.query).toHaveBeenCalledWith(
             expect.stringContaining('INSERT INTO autonomous_approvals'),
             expect.any(Array)
         );
     });

     it('should execute safe actions immediately', async () => {
        // Setup: Allow via guardrails
        const result = await executor.executeAction({
            type: 'auto_retry',
            tenantId: 'tenant-1',
            payload: { jobId: 'job-123' },
            reason: 'Transient failure'
        });

        expect(result.success).toBe(true);
        expect(mockDb.query).not.toHaveBeenCalled(); // No approval needed
     });

     it('should block unsafe actions via guardrails', async () => {
        const result = await executor.executeAction({
            type: 'delete_user_data', // Should be caught by "Data Mutation" guardrail
            tenantId: 'tenant-1',
            payload: {},
            reason: 'Cleanup'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Autonomous business data mutation is strictly prohibited');
     });
  });
});
