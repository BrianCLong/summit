/**
 * OPA Enforcer Middleware Test Suite
 *
 * Tests for:
 * - Policy evaluation and decision making
 * - Budget enforcement integration
 * - Four-eyes approval validation
 * - Caching behavior
 * - Retry logic on OPA failures
 * - Fallback decision mechanism
 * - Express middleware integration
 * - GraphQL mutation extraction
 */

import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { OPAEnforcer, createOPAMiddleware } from '../opa-enforcer';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock budget ledger
jest.mock('../../db/budgetLedger', () => ({
  getBudgetLedgerManager: jest.fn(() => ({
    getTenantBudget: jest.fn(),
    getSpendingSummary: jest.fn(),
    getSpendingEntries: jest.fn(),
    checkTenantBudget: jest.fn(),
  })),
}));

describe('OPAEnforcer', () => {
  let opaEnforcer: OPAEnforcer;
  let mockBudgetLedger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked budget ledger
    const { getBudgetLedgerManager } = jest.requireMock('../../db/budgetLedger');
    mockBudgetLedger = getBudgetLedgerManager();

    // Reset environment variables
    delete process.env.OPA_ENFORCEMENT;
    delete process.env.FOUR_EYES_THRESHOLD_USD;
    delete process.env.FOUR_EYES_THRESHOLD_TOKENS;

    opaEnforcer = new OPAEnforcer({
      enabled: true,
      opaUrl: 'http://localhost:8181',
      cacheDecisions: false, // Disable cache for most tests
    });
  });

  describe('evaluatePolicy', () => {
    const mockInput = {
      tenant_id: 'tenant-123',
      user_id: 'user-456',
      mutation: 'createEntity',
      est_usd: 0.5,
      est_total_tokens: 1000,
      request_id: 'req-789',
      timestamp: new Date().toISOString(),
    };

    it('should allow operation when OPA approves', async () => {
      const mockOPAResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: mockInput.tenant_id,
            estimated_usd: mockInput.est_usd,
            monthly_room: 100.0,
            daily_room: 3.33,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'low',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
        hardCap: true,
        notificationThreshold: 0.8,
      });

      mockBudgetLedger.getSpendingSummary.mockResolvedValue({
        totalSpend: 10.0,
      });

      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const decision = await opaEnforcer.evaluatePolicy(mockInput);

      expect(decision.allow).toBe(true);
      expect(decision.violation_reasons).toEqual([]);
      expect(decision.tenant_id).toBe(mockInput.tenant_id);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/data/intelgraph/budget/decision'),
        expect.objectContaining({
          input: expect.objectContaining(mockInput),
        }),
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });

    it('should deny operation when budget exceeded', async () => {
      const mockOPAResponse = {
        data: {
          result: {
            allow: false,
            tenant_id: mockInput.tenant_id,
            estimated_usd: mockInput.est_usd,
            monthly_room: -5.0, // Negative room indicates over budget
            daily_room: 0.0,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'medium',
            violation_reasons: ['Monthly budget exceeded'],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const decision = await opaEnforcer.evaluatePolicy(mockInput);

      expect(decision.allow).toBe(false);
      expect(decision.violation_reasons).toContain('Monthly budget exceeded');
      expect(decision.monthly_room).toBe(-5.0);
    });

    it('should enforce four-eyes approval for high-cost operations', async () => {
      const highCostInput = {
        ...mockInput,
        est_usd: 10.0, // Above threshold
      };

      const mockOPAResponse = {
        data: {
          result: {
            allow: false,
            tenant_id: highCostInput.tenant_id,
            estimated_usd: highCostInput.est_usd,
            monthly_room: 50.0,
            daily_room: 2.0,
            requires_four_eyes: true,
            valid_approvers: 0, // No approvers provided
            risk_level: 'high',
            violation_reasons: ['Four-eyes approval required'],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const decision = await opaEnforcer.evaluatePolicy(highCostInput);

      expect(decision.allow).toBe(false);
      expect(decision.requires_four_eyes).toBe(true);
      expect(decision.valid_approvers).toBe(0);
      expect(decision.violation_reasons).toContain('Four-eyes approval required');
    });

    it('should allow high-cost operation with valid approvers', async () => {
      const highCostInput = {
        ...mockInput,
        est_usd: 10.0,
        approvers: [
          {
            user_id: 'approver-1',
            role: 'manager',
            approved_at: new Date().toISOString(),
            session_token: 'token-1',
          },
          {
            user_id: 'approver-2',
            role: 'admin',
            approved_at: new Date().toISOString(),
            session_token: 'token-2',
          },
        ],
      };

      const mockOPAResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: highCostInput.tenant_id,
            estimated_usd: highCostInput.est_usd,
            monthly_room: 50.0,
            daily_room: 2.0,
            requires_four_eyes: true,
            valid_approvers: 2,
            risk_level: 'high',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const decision = await opaEnforcer.evaluatePolicy(highCostInput);

      expect(decision.allow).toBe(true);
      expect(decision.requires_four_eyes).toBe(true);
      expect(decision.valid_approvers).toBe(2);
    });

    it('should retry on OPA failure', async () => {
      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      const successResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: mockInput.tenant_id,
            estimated_usd: mockInput.est_usd,
            monthly_room: 100.0,
            daily_room: 3.33,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'low',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      // First call fails, second succeeds
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(successResponse);

      const decision = await opaEnforcer.evaluatePolicy(mockInput);

      expect(decision.allow).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should use fallback decision when OPA unavailable after retries', async () => {
      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      // All attempts fail
      mockedAxios.post.mockRejectedValue(new Error('OPA server down'));

      const decision = await opaEnforcer.evaluatePolicy(mockInput);

      expect(decision.allow).toBe(true); // Fallback allows low-cost ops
      expect(decision.policy_version).toBe('fallback-1.0');
      expect(mockBudgetLedger.checkTenantBudget).toHaveBeenCalled();
    });

    it('should use fallback decision when OPA is disabled', async () => {
      const disabledEnforcer = new OPAEnforcer({
        enabled: false,
      });

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      const decision = await disabledEnforcer.evaluatePolicy(mockInput);

      expect(decision.policy_version).toBe('fallback-1.0');
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(mockBudgetLedger.checkTenantBudget).toHaveBeenCalled();
    });

    it('should handle invalid OPA response structure', async () => {
      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);
      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      // Invalid response (missing result)
      mockedAxios.post.mockResolvedValue({ data: {} });

      const decision = await opaEnforcer.evaluatePolicy(mockInput);

      // Should fall back
      expect(decision.policy_version).toBe('fallback-1.0');
    });
  });

  describe('caching', () => {
    const mockInput = {
      tenant_id: 'tenant-123',
      user_id: 'user-456',
      mutation: 'createEntity',
      est_usd: 0.5,
      est_total_tokens: 1000,
      request_id: 'req-789',
      timestamp: new Date().toISOString(),
    };

    it('should cache decisions when enabled', async () => {
      const cachedEnforcer = new OPAEnforcer({
        enabled: true,
        cacheDecisions: true,
        cacheTtlMs: 60000,
      });

      const mockOPAResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: mockInput.tenant_id,
            estimated_usd: mockInput.est_usd,
            monthly_room: 100.0,
            daily_room: 3.33,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'low',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      // First call - should hit OPA
      await cachedEnforcer.evaluatePolicy(mockInput);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await cachedEnforcer.evaluatePolicy(mockInput);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should not cache when disabled', async () => {
      const noCacheEnforcer = new OPAEnforcer({
        enabled: true,
        cacheDecisions: false,
      });

      const mockOPAResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: mockInput.tenant_id,
            estimated_usd: mockInput.est_usd,
            monthly_room: 100.0,
            daily_room: 3.33,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'low',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      // Two calls should both hit OPA
      await noCacheEnforcer.evaluatePolicy(mockInput);
      await noCacheEnforcer.evaluatePolicy(mockInput);

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('createMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock<NextFunction>;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        body: {
          query: 'mutation createEntity { createEntity(input: {}) { id } }',
          operationName: 'createEntity',
        },
        get: jest.fn(),
        originalUrl: '/graphql',
      } as any;

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      mockNext = jest.fn();
    });

    it('should skip non-POST requests', async () => {
      mockReq.method = 'GET';

      const middleware = opaEnforcer.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip non-mutation requests', async () => {
      mockReq.body = {
        query: 'query getEntity { entity(id: "123") { id } }',
      };

      const middleware = opaEnforcer.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow request when OPA approves', async () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-estimated-usd': '0.5',
          'x-estimated-tokens': '1000',
          'x-request-id': 'req-789',
        };
        return headers[header];
      });

      const mockOPAResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: 'tenant-123',
            estimated_usd: 0.5,
            monthly_room: 100.0,
            daily_room: 3.33,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'low',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const middleware = opaEnforcer.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect((mockReq as any).opaDecision).toBeDefined();
      expect((mockReq as any).opaDecision.allow).toBe(true);
    });

    it('should deny request with 403 when OPA denies', async () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-estimated-usd': '50.0', // High cost
          'x-estimated-tokens': '100000',
          'x-request-id': 'req-789',
        };
        return headers[header];
      });

      const mockOPAResponse = {
        data: {
          result: {
            allow: false,
            tenant_id: 'tenant-123',
            estimated_usd: 50.0,
            monthly_room: 10.0,
            daily_room: 0.33,
            requires_four_eyes: true,
            valid_approvers: 0,
            risk_level: 'high',
            violation_reasons: ['Four-eyes approval required', 'High cost operation'],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const middleware = opaEnforcer.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Policy violation'),
          code: 'POLICY_VIOLATION',
          decision: expect.objectContaining({
            allow: false,
            requires_four_eyes: true,
            violation_reasons: expect.arrayContaining([
              'Four-eyes approval required',
              'High cost operation',
            ]),
          }),
        }),
      );
    });

    it('should fail open on middleware error', async () => {
      (mockReq.get as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const middleware = opaEnforcer.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should call next() to fail open
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should extract mutation field name from query', async () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        const headers: Record<string, string> = {
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-estimated-usd': '0.5',
          'x-estimated-tokens': '1000',
          'x-request-id': 'req-789',
        };
        return headers[header];
      });

      mockReq.body = {
        query:
          'mutation createComplexEntity { createComplexEntity(input: {name: "test"}) { id name } }',
        operationName: 'createComplexEntity',
      };

      const mockOPAResponse = {
        data: {
          result: {
            allow: true,
            tenant_id: 'tenant-123',
            estimated_usd: 0.5,
            monthly_room: 100.0,
            daily_room: 3.33,
            requires_four_eyes: false,
            valid_approvers: 0,
            risk_level: 'low',
            violation_reasons: [],
            policy_version: '1.0',
            evaluated_at: Date.now(),
          },
        },
      };

      mockBudgetLedger.getTenantBudget.mockResolvedValue({
        monthlyUsdLimit: 100.0,
        dailyUsdLimit: 10.0,
      });
      mockBudgetLedger.getSpendingSummary.mockResolvedValue({});
      mockBudgetLedger.getSpendingEntries.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue(mockOPAResponse);

      const middleware = opaEnforcer.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            field_name: 'createComplexEntity',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('fallback decision', () => {
    it('should allow low-cost operations when budget is available', async () => {
      const fallbackEnforcer = new OPAEnforcer({ enabled: false });

      const input = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        mutation: 'createEntity',
        est_usd: 0.5,
        est_total_tokens: 1000,
        request_id: 'req-789',
        timestamp: new Date().toISOString(),
      };

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      const decision = await fallbackEnforcer.evaluatePolicy(input);

      expect(decision.allow).toBe(true);
      expect(decision.policy_version).toBe('fallback-1.0');
    });

    it('should deny when budget is exceeded', async () => {
      const fallbackEnforcer = new OPAEnforcer({ enabled: false });

      const input = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        mutation: 'createEntity',
        est_usd: 0.5,
        est_total_tokens: 1000,
        request_id: 'req-789',
        timestamp: new Date().toISOString(),
      };

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: false,
        budgetLimit: 100.0,
        currentSpend: 99.8,
        reason: 'Monthly budget exceeded',
      });

      const decision = await fallbackEnforcer.evaluatePolicy(input);

      expect(decision.allow).toBe(false);
      expect(decision.violation_reasons).toContain('Monthly budget exceeded');
    });

    it('should require four-eyes approval for high-cost operations', async () => {
      const fallbackEnforcer = new OPAEnforcer({ enabled: false });

      const input = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        mutation: 'bulkDelete',
        est_usd: 10.0, // Above threshold
        est_total_tokens: 50000,
        request_id: 'req-789',
        timestamp: new Date().toISOString(),
      };

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      const decision = await fallbackEnforcer.evaluatePolicy(input);

      expect(decision.allow).toBe(false);
      expect(decision.requires_four_eyes).toBe(true);
      expect(decision.valid_approvers).toBe(0);
    });

    it('should require four-eyes approval for destructive operations', async () => {
      const fallbackEnforcer = new OPAEnforcer({ enabled: false });

      const input = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        mutation: 'deleteAll',
        est_usd: 0.1, // Low cost but destructive
        est_total_tokens: 100,
        risk_tag: 'destructive',
        request_id: 'req-789',
        timestamp: new Date().toISOString(),
      };

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      const decision = await fallbackEnforcer.evaluatePolicy(input);

      expect(decision.allow).toBe(false);
      expect(decision.requires_four_eyes).toBe(true);
    });

    it('should allow high-cost operation with sufficient approvers', async () => {
      const fallbackEnforcer = new OPAEnforcer({ enabled: false });

      const input = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        mutation: 'bulkOperation',
        est_usd: 10.0,
        est_total_tokens: 50000,
        approvers: [
          {
            user_id: 'approver-1',
            role: 'manager',
            approved_at: new Date().toISOString(),
            session_token: 'token-1',
          },
          {
            user_id: 'approver-2',
            role: 'admin',
            approved_at: new Date().toISOString(),
            session_token: 'token-2',
          },
        ],
        request_id: 'req-789',
        timestamp: new Date().toISOString(),
      };

      mockBudgetLedger.checkTenantBudget.mockResolvedValue({
        canAfford: true,
        budgetLimit: 100.0,
        currentSpend: 10.0,
        reason: '',
      });

      const decision = await fallbackEnforcer.evaluatePolicy(input);

      expect(decision.allow).toBe(true);
      expect(decision.requires_four_eyes).toBe(true);
      expect(decision.valid_approvers).toBe(2);
    });
  });
});
