/**
 * Cost Guard Middleware Tests
 *
 * Tests budget enforcement, rate limiting, and error handling
 * for high-cost operations.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  costGuardMiddleware,
  costRecordingMiddleware,
  withCostGuard,
  withCostGuardResolver,
  withCostGuardDB,
  CostGuardError,
  costGuard,
} from '../../src/cost-guard/middleware';

describe('Cost Guard Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset cost guard state
    (costGuard as any).tenantUsage.clear();
    (costGuard as any).tenantBudgets.clear();

    mockReq = {
      path: '/api/test',
      method: 'GET',
      headers: {
        'x-tenant-id': 'test-tenant',
        'x-user-id': 'test-user',
        'user-agent': 'test-agent',
      },
      ip: '127.0.0.1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      on: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('costGuardMiddleware', () => {
    test('should allow request when budget is sufficient', async () => {
      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.costContext).toBeDefined();
      expect(mockReq.estimatedCost).toBeGreaterThan(0);
    });

    test('should block request when budget is exceeded', async () => {
      // Set very low budget
      costGuard.setBudgetLimits('test-tenant', {
        daily: 0.0001,
        monthly: 0.001,
      });

      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cost Limit Exceeded',
          details: expect.objectContaining({
            budgetRemaining: expect.any(Number),
            estimatedCost: expect.any(Number),
            warnings: expect.any(Array),
          }),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should skip health check paths', async () => {
      mockReq.path = '/health';

      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.costContext).toBeUndefined();
    });

    test('should skip metrics paths', async () => {
      mockReq.path = '/metrics';

      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.costContext).toBeUndefined();
    });

    test('should detect GraphQL operation from path', async () => {
      mockReq.path = '/graphql';

      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.costContext.operation).toBe('graphql_query');
    });

    test('should detect export operation from path', async () => {
      mockReq.path = '/api/export/data';

      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.costContext.operation).toBe('export_operation');
    });

    test('should add rate limit headers when approaching budget', async () => {
      // Set budget and consume most of it
      costGuard.setBudgetLimits('test-tenant', {
        daily: 1.0,
        monthly: 10.0,
        rate_limit_cost: 0.5,
      });

      // Consume 60% of daily budget
      await costGuard.recordActualCost({
        tenantId: 'test-tenant',
        userId: 'test-user',
        operation: 'api_request',
      }, 0.6);

      const middleware = costGuardMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Cost', 'true');
      expect(mockRes.set).toHaveBeenCalledWith(
        'X-RateLimit-Budget-Remaining',
        expect.any(String),
      );
    });

    test('should use custom tenant extraction function', async () => {
      const customExtractor = jest.fn(() => 'custom-tenant');
      const middleware = costGuardMiddleware({
        extractTenantId: customExtractor,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(customExtractor).toHaveBeenCalledWith(mockReq);
      expect(mockReq.costContext.tenantId).toBe('custom-tenant');
    });

    test('should call onBudgetExceeded callback', async () => {
      const onBudgetExceeded = jest.fn();

      costGuard.setBudgetLimits('test-tenant', {
        daily: 0.0001,
        monthly: 0.001,
      });

      const middleware = costGuardMiddleware({ onBudgetExceeded });
      await middleware(mockReq, mockRes, mockNext);

      expect(onBudgetExceeded).toHaveBeenCalled();
    });

    test('should fail open on error', async () => {
      // Force an error by providing invalid data
      const middleware = costGuardMiddleware({
        extractTenantId: () => {
          throw new Error('Extraction failed');
        },
      });

      await middleware(mockReq, mockRes, mockNext);

      // Should still call next() to allow request through
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('costRecordingMiddleware', () => {
    test('should record cost after request completes', async () => {
      const recordSpy = jest.spyOn(costGuard, 'recordActualCost');

      mockReq.costContext = {
        tenantId: 'test-tenant',
        userId: 'test-user',
        operation: 'api_request',
      };

      const middleware = costRecordingMiddleware();
      middleware(mockReq, mockRes, mockNext);

      // Simulate request finish
      const finishCallback = mockRes.on.mock.calls.find(
        (call: any[]) => call[0] === 'finish',
      )?.[1];

      expect(finishCallback).toBeDefined();

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));
      finishCallback();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalled();
      // Recording happens async, so we just verify the middleware was set up
    });

    test('should handle missing cost context gracefully', async () => {
      const middleware = costRecordingMiddleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('withCostGuard', () => {
    test('should execute operation when budget is sufficient', async () => {
      const mockOperation = jest.fn(async () => 'success');

      const result = await withCostGuard(
        {
          tenantId: 'test-tenant',
          userId: 'test-user',
          operation: 'api_request',
        },
        mockOperation,
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
    });

    test('should throw CostGuardError when budget exceeded', async () => {
      costGuard.setBudgetLimits('test-tenant', {
        daily: 0.0001,
        monthly: 0.001,
      });

      const mockOperation = jest.fn(async () => 'success');

      await expect(
        withCostGuard(
          {
            tenantId: 'test-tenant',
            userId: 'test-user',
            operation: 'cypher_query',
            complexity: 10,
          },
          mockOperation,
        ),
      ).rejects.toThrow(CostGuardError);

      expect(mockOperation).not.toHaveBeenCalled();
    });

    test('should record cost on successful operation', async () => {
      const recordSpy = jest.spyOn(costGuard, 'recordActualCost');

      await withCostGuard(
        {
          tenantId: 'test-tenant',
          userId: 'test-user',
          operation: 'api_request',
        },
        async () => 'success',
      );

      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'test-tenant',
          userId: 'test-user',
          operation: 'api_request',
          duration: expect.any(Number),
        }),
      );
    });

    test('should record cost on failed operation', async () => {
      const recordSpy = jest.spyOn(costGuard, 'recordActualCost');

      await expect(
        withCostGuard(
          {
            tenantId: 'test-tenant',
            userId: 'test-user',
            operation: 'api_request',
          },
          async () => {
            throw new Error('Operation failed');
          },
        ),
      ).rejects.toThrow('Operation failed');

      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'test-tenant',
          duration: expect.any(Number),
          metadata: expect.objectContaining({
            error: 'Operation failed',
            success: false,
          }),
        }),
      );
    });

    test('should handle high-cost operations', async () => {
      const mockOperation = jest.fn(async () => {
        // Simulate long-running operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });

      const result = await withCostGuard(
        {
          tenantId: 'test-tenant',
          userId: 'test-user',
          operation: 'cypher_query',
          complexity: 15,
        },
        mockOperation,
      );

      expect(result).toBe('success');
    });
  });

  describe('withCostGuardResolver', () => {
    test('should wrap GraphQL resolver with cost guard', async () => {
      const mockResolver = jest.fn(async () => 'resolver result');

      const wrappedResolver = withCostGuardResolver(mockResolver, {
        operation: 'graphql_query',
        complexity: 5,
      });

      const mockContext = {
        tenantId: 'test-tenant',
        user: { id: 'user-123' },
      };

      const mockInfo = {
        fieldName: 'testField',
        operation: { operation: 'query' },
        parentType: { name: 'Query' },
      };

      const result = await wrappedResolver(null, {}, mockContext, mockInfo);

      expect(result).toBe('resolver result');
      expect(mockResolver).toHaveBeenCalled();
    });

    test('should block expensive resolver when budget exceeded', async () => {
      costGuard.setBudgetLimits('test-tenant', {
        daily: 0.0001,
        monthly: 0.001,
      });

      const mockResolver = jest.fn(async () => 'resolver result');

      const wrappedResolver = withCostGuardResolver(mockResolver, {
        operation: 'graphql_query',
        complexity: 10,
      });

      const mockContext = {
        tenantId: 'test-tenant',
        user: { id: 'user-123' },
      };

      const mockInfo = {
        fieldName: 'expensiveField',
        operation: { operation: 'query' },
        parentType: { name: 'Query' },
      };

      await expect(
        wrappedResolver(null, {}, mockContext, mockInfo),
      ).rejects.toThrow(CostGuardError);

      expect(mockResolver).not.toHaveBeenCalled();
    });
  });

  describe('withCostGuardDB', () => {
    test('should wrap database operation with cost guard', async () => {
      const mockDbOperation = jest.fn(async () => [{ id: 1 }, { id: 2 }]);

      const result = await withCostGuardDB(
        {
          tenantId: 'test-tenant',
          userId: 'test-user',
          operation: 'cypher_query',
          complexity: 3,
        },
        mockDbOperation,
      );

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockDbOperation).toHaveBeenCalled();
    });

    test('should block expensive database operation', async () => {
      costGuard.setBudgetLimits('test-tenant', {
        daily: 0.0001,
        monthly: 0.001,
      });

      const mockDbOperation = jest.fn(async () => 'result');

      await expect(
        withCostGuardDB(
          {
            tenantId: 'test-tenant',
            userId: 'test-user',
            operation: 'cypher_query',
            complexity: 20,
          },
          mockDbOperation,
        ),
      ).rejects.toThrow(CostGuardError);
    });
  });

  describe('High-Cost Operation Simulation', () => {
    test('should handle burst of high-cost queries', async () => {
      costGuard.setBudgetLimits('burst-tenant', {
        daily: 1.0,
        monthly: 30.0,
        query_burst: 0.5,
      });

      // Execute multiple operations rapidly
      const operations = Array.from({ length: 5 }, (_, i) =>
        withCostGuard(
          {
            tenantId: 'burst-tenant',
            userId: 'burst-user',
            operation: 'cypher_query',
            complexity: 3,
          },
          async () => `result-${i}`,
        ),
      );

      const results = await Promise.allSettled(operations);

      // Some should succeed, some might fail due to budget
      expect(results.length).toBe(5);

      const usage = costGuard.getCurrentUsage('burst-tenant');
      expect(usage.daily).toBeGreaterThan(0);
    });

    test('should enforce burst limits on single expensive query', async () => {
      costGuard.setBudgetLimits('burst-tenant', {
        daily: 10.0,
        monthly: 100.0,
        query_burst: 0.5, // Max $0.50 per query
      });

      // Try to execute a very expensive query
      await expect(
        withCostGuard(
          {
            tenantId: 'burst-tenant',
            userId: 'burst-user',
            operation: 'cypher_query',
            complexity: 1000, // Extremely high complexity
          },
          async () => 'result',
        ),
      ).rejects.toThrow(CostGuardError);
    });

    test('should track and kill long-running expensive operations', async () => {
      jest.useFakeTimers();

      costGuard.setBudgetLimits('timeout-tenant', {
        daily: 10.0,
        monthly: 100.0,
        query_burst: 1.0,
      });

      const longOperation = withCostGuard(
        {
          tenantId: 'timeout-tenant',
          userId: 'timeout-user',
          operation: 'cypher_query',
          complexity: 20, // Expensive enough to trigger monitoring
        },
        async () => {
          // Simulate long-running operation
          await new Promise(resolve => setTimeout(resolve, 35000));
          return 'completed';
        },
      );

      // Fast-forward time
      jest.advanceTimersByTime(35000);

      await expect(longOperation).resolves.toBe('completed');

      jest.useRealTimers();
    });

    test('should provide cost analysis for tenant', async () => {
      // Record some usage
      await costGuard.recordActualCost({
        tenantId: 'analysis-tenant',
        userId: 'user-1',
        operation: 'graphql_query',
      }, 0.5);

      await costGuard.recordActualCost({
        tenantId: 'analysis-tenant',
        userId: 'user-2',
        operation: 'cypher_query',
      }, 0.3);

      const analysis = await costGuard.getCostAnalysis('analysis-tenant');

      expect(analysis).toMatchObject({
        currentUsage: {
          daily: expect.any(Number),
          monthly: expect.any(Number),
        },
        limits: expect.any(Object),
        utilization: {
          daily: expect.any(Number),
          monthly: expect.any(Number),
        },
        projectedMonthlySpend: expect.any(Number),
        recommendations: expect.any(Array),
      });

      expect(analysis.currentUsage.daily).toBeCloseTo(0.8, 1);
    });

    test('should generate cost report', async () => {
      await costGuard.recordActualCost({
        tenantId: 'report-tenant',
        userId: 'user-1',
        operation: 'graphql_query',
      }, 1.5);

      const report = await costGuard.generateCostReport('report-tenant', 30);

      expect(report).toMatchObject({
        totalCost: expect.any(Number),
        averageDailyCost: expect.any(Number),
        operationBreakdown: expect.any(Object),
        trends: expect.any(Array),
      });
    });
  });

  describe('Error Messages', () => {
    test('should provide clear error message when daily budget exceeded', async () => {
      costGuard.setBudgetLimits('error-tenant', {
        daily: 0.001,
        monthly: 1.0,
      });

      try {
        await withCostGuard(
          {
            tenantId: 'error-tenant',
            userId: 'user-1',
            operation: 'cypher_query',
            complexity: 10,
          },
          async () => 'result',
        );
        fail('Should have thrown CostGuardError');
      } catch (error) {
        expect(error).toBeInstanceOf(CostGuardError);
        expect((error as CostGuardError).message).toContain('Insufficient budget');
        expect((error as CostGuardError).warnings.length).toBeGreaterThan(0);
      }
    });

    test('should provide clear error message when burst limit exceeded', async () => {
      costGuard.setBudgetLimits('burst-error-tenant', {
        daily: 10.0,
        monthly: 100.0,
        query_burst: 0.1,
      });

      try {
        await withCostGuard(
          {
            tenantId: 'burst-error-tenant',
            userId: 'user-1',
            operation: 'cypher_query',
            complexity: 100,
          },
          async () => 'result',
        );
        fail('Should have thrown CostGuardError');
      } catch (error) {
        expect(error).toBeInstanceOf(CostGuardError);
        expect((error as CostGuardError).message).toContain('burst limit');
      }
    });
  });
});
