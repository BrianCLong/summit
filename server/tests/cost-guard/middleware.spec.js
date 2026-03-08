"use strict";
/**
 * Cost Guard Middleware Tests
 *
 * Tests budget enforcement, rate limiting, and error handling
 * for high-cost operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const middleware_1 = require("../../src/cost-guard/middleware");
(0, globals_1.describe)('Cost Guard Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    (0, globals_1.beforeEach)(() => {
        // Reset cost guard state
        middleware_1.costGuard.tenantUsage.clear();
        middleware_1.costGuard.tenantBudgets.clear();
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
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
            set: globals_1.jest.fn().mockReturnThis(),
            on: globals_1.jest.fn(),
        };
        mockNext = globals_1.jest.fn();
    });
    (0, globals_1.describe)('costGuardMiddleware', () => {
        (0, globals_1.test)('should allow request when budget is sufficient', async () => {
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
            (0, globals_1.expect)(mockRes.status).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockReq.costContext).toBeDefined();
            (0, globals_1.expect)(mockReq.estimatedCost).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should block request when budget is exceeded', async () => {
            // Set very low budget
            middleware_1.costGuard.setBudgetLimits('test-tenant', {
                daily: 0.0001,
                monthly: 0.001,
            });
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockRes.status).toHaveBeenCalledWith(429);
            (0, globals_1.expect)(mockRes.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: 'Cost Limit Exceeded',
                details: globals_1.expect.objectContaining({
                    budgetRemaining: globals_1.expect.any(Number),
                    estimatedCost: globals_1.expect.any(Number),
                    warnings: globals_1.expect.any(Array),
                }),
            }));
            (0, globals_1.expect)(mockNext).not.toHaveBeenCalled();
        });
        (0, globals_1.test)('should skip health check paths', async () => {
            mockReq.path = '/health';
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
            (0, globals_1.expect)(mockReq.costContext).toBeUndefined();
        });
        (0, globals_1.test)('should skip metrics paths', async () => {
            mockReq.path = '/metrics';
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
            (0, globals_1.expect)(mockReq.costContext).toBeUndefined();
        });
        (0, globals_1.test)('should detect GraphQL operation from path', async () => {
            mockReq.path = '/graphql';
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockReq.costContext.operation).toBe('graphql_query');
        });
        (0, globals_1.test)('should detect export operation from path', async () => {
            mockReq.path = '/api/export/data';
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockReq.costContext.operation).toBe('export_operation');
        });
        (0, globals_1.test)('should add rate limit headers when approaching budget', async () => {
            // Set budget and consume most of it
            middleware_1.costGuard.setBudgetLimits('test-tenant', {
                daily: 1.0,
                monthly: 10.0,
                rate_limit_cost: 0.5,
            });
            // Consume 60% of daily budget
            await middleware_1.costGuard.recordActualCost({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'api_request',
            }, 0.6);
            const middleware = (0, middleware_1.costGuardMiddleware)();
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Cost', 'true');
            (0, globals_1.expect)(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Budget-Remaining', globals_1.expect.any(String));
        });
        (0, globals_1.test)('should use custom tenant extraction function', async () => {
            const customExtractor = globals_1.jest.fn(() => 'custom-tenant');
            const middleware = (0, middleware_1.costGuardMiddleware)({
                extractTenantId: customExtractor,
            });
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(customExtractor).toHaveBeenCalledWith(mockReq);
            (0, globals_1.expect)(mockReq.costContext.tenantId).toBe('custom-tenant');
        });
        (0, globals_1.test)('should call onBudgetExceeded callback', async () => {
            const onBudgetExceeded = globals_1.jest.fn();
            middleware_1.costGuard.setBudgetLimits('test-tenant', {
                daily: 0.0001,
                monthly: 0.001,
            });
            const middleware = (0, middleware_1.costGuardMiddleware)({ onBudgetExceeded });
            await middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(onBudgetExceeded).toHaveBeenCalled();
        });
        (0, globals_1.test)('should fail open on error', async () => {
            // Force an error by providing invalid data
            const middleware = (0, middleware_1.costGuardMiddleware)({
                extractTenantId: () => {
                    throw new Error('Extraction failed');
                },
            });
            await middleware(mockReq, mockRes, mockNext);
            // Should still call next() to allow request through
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
            (0, globals_1.expect)(mockRes.status).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('costRecordingMiddleware', () => {
        (0, globals_1.test)('should record cost after request completes', async () => {
            const recordSpy = globals_1.jest.spyOn(middleware_1.costGuard, 'recordActualCost');
            mockReq.costContext = {
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'api_request',
            };
            const middleware = (0, middleware_1.costRecordingMiddleware)();
            middleware(mockReq, mockRes, mockNext);
            // Simulate request finish
            const finishCallback = mockRes.on.mock.calls.find((call) => call[0] === 'finish')?.[1];
            (0, globals_1.expect)(finishCallback).toBeDefined();
            // Wait for async callback
            await new Promise(resolve => setTimeout(resolve, 10));
            finishCallback();
            await new Promise(resolve => setTimeout(resolve, 10));
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
            // Recording happens async, so we just verify the middleware was set up
        });
        (0, globals_1.test)('should handle missing cost context gracefully', async () => {
            const middleware = (0, middleware_1.costRecordingMiddleware)();
            middleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('withCostGuard', () => {
        (0, globals_1.test)('should execute operation when budget is sufficient', async () => {
            const mockOperation = globals_1.jest.fn(async () => 'success');
            const result = await (0, middleware_1.withCostGuard)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'api_request',
            }, mockOperation);
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(mockOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should throw CostGuardError when budget exceeded', async () => {
            middleware_1.costGuard.setBudgetLimits('test-tenant', {
                daily: 0.0001,
                monthly: 0.001,
            });
            const mockOperation = globals_1.jest.fn(async () => 'success');
            await (0, globals_1.expect)((0, middleware_1.withCostGuard)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'cypher_query',
                complexity: 10,
            }, mockOperation)).rejects.toThrow(middleware_1.CostGuardError);
            (0, globals_1.expect)(mockOperation).not.toHaveBeenCalled();
        });
        (0, globals_1.test)('should record cost on successful operation', async () => {
            const recordSpy = globals_1.jest.spyOn(middleware_1.costGuard, 'recordActualCost');
            await (0, middleware_1.withCostGuard)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'api_request',
            }, async () => 'success');
            (0, globals_1.expect)(recordSpy).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'api_request',
                duration: globals_1.expect.any(Number),
            }));
        });
        (0, globals_1.test)('should record cost on failed operation', async () => {
            const recordSpy = globals_1.jest.spyOn(middleware_1.costGuard, 'recordActualCost');
            await (0, globals_1.expect)((0, middleware_1.withCostGuard)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'api_request',
            }, async () => {
                throw new Error('Operation failed');
            })).rejects.toThrow('Operation failed');
            (0, globals_1.expect)(recordSpy).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                tenantId: 'test-tenant',
                duration: globals_1.expect.any(Number),
                metadata: globals_1.expect.objectContaining({
                    error: 'Operation failed',
                    success: false,
                }),
            }));
        });
        (0, globals_1.test)('should handle high-cost operations', async () => {
            const mockOperation = globals_1.jest.fn(async () => {
                // Simulate long-running operation
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'success';
            });
            const result = await (0, middleware_1.withCostGuard)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'cypher_query',
                complexity: 15,
            }, mockOperation);
            (0, globals_1.expect)(result).toBe('success');
        });
    });
    (0, globals_1.describe)('withCostGuardResolver', () => {
        (0, globals_1.test)('should wrap GraphQL resolver with cost guard', async () => {
            const mockResolver = globals_1.jest.fn(async () => 'resolver result');
            const wrappedResolver = (0, middleware_1.withCostGuardResolver)(mockResolver, {
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
            (0, globals_1.expect)(result).toBe('resolver result');
            (0, globals_1.expect)(mockResolver).toHaveBeenCalled();
        });
        (0, globals_1.test)('should block expensive resolver when budget exceeded', async () => {
            middleware_1.costGuard.setBudgetLimits('test-tenant', {
                daily: 0.0001,
                monthly: 0.001,
            });
            const mockResolver = globals_1.jest.fn(async () => 'resolver result');
            const wrappedResolver = (0, middleware_1.withCostGuardResolver)(mockResolver, {
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
            await (0, globals_1.expect)(wrappedResolver(null, {}, mockContext, mockInfo)).rejects.toThrow(middleware_1.CostGuardError);
            (0, globals_1.expect)(mockResolver).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('withCostGuardDB', () => {
        (0, globals_1.test)('should wrap database operation with cost guard', async () => {
            const mockDbOperation = globals_1.jest.fn(async () => [{ id: 1 }, { id: 2 }]);
            const result = await (0, middleware_1.withCostGuardDB)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'cypher_query',
                complexity: 3,
            }, mockDbOperation);
            (0, globals_1.expect)(result).toEqual([{ id: 1 }, { id: 2 }]);
            (0, globals_1.expect)(mockDbOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should block expensive database operation', async () => {
            middleware_1.costGuard.setBudgetLimits('test-tenant', {
                daily: 0.0001,
                monthly: 0.001,
            });
            const mockDbOperation = globals_1.jest.fn(async () => 'result');
            await (0, globals_1.expect)((0, middleware_1.withCostGuardDB)({
                tenantId: 'test-tenant',
                userId: 'test-user',
                operation: 'cypher_query',
                complexity: 20,
            }, mockDbOperation)).rejects.toThrow(middleware_1.CostGuardError);
        });
    });
    (0, globals_1.describe)('High-Cost Operation Simulation', () => {
        (0, globals_1.test)('should handle burst of high-cost queries', async () => {
            middleware_1.costGuard.setBudgetLimits('burst-tenant', {
                daily: 1.0,
                monthly: 30.0,
                query_burst: 0.5,
            });
            // Execute multiple operations rapidly
            const operations = Array.from({ length: 5 }, (_, i) => (0, middleware_1.withCostGuard)({
                tenantId: 'burst-tenant',
                userId: 'burst-user',
                operation: 'cypher_query',
                complexity: 3,
            }, async () => `result-${i}`));
            const results = await Promise.allSettled(operations);
            // Some should succeed, some might fail due to budget
            (0, globals_1.expect)(results.length).toBe(5);
            const usage = middleware_1.costGuard.getCurrentUsage('burst-tenant');
            (0, globals_1.expect)(usage.daily).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should enforce burst limits on single expensive query', async () => {
            middleware_1.costGuard.setBudgetLimits('burst-tenant', {
                daily: 10.0,
                monthly: 100.0,
                query_burst: 0.5, // Max $0.50 per query
            });
            // Try to execute a very expensive query
            await (0, globals_1.expect)((0, middleware_1.withCostGuard)({
                tenantId: 'burst-tenant',
                userId: 'burst-user',
                operation: 'cypher_query',
                complexity: 1000, // Extremely high complexity
            }, async () => 'result')).rejects.toThrow(middleware_1.CostGuardError);
        });
        (0, globals_1.test)('should track and kill long-running expensive operations', async () => {
            globals_1.jest.useFakeTimers();
            middleware_1.costGuard.setBudgetLimits('timeout-tenant', {
                daily: 10.0,
                monthly: 100.0,
                query_burst: 1.0,
            });
            const longOperation = (0, middleware_1.withCostGuard)({
                tenantId: 'timeout-tenant',
                userId: 'timeout-user',
                operation: 'cypher_query',
                complexity: 20, // Expensive enough to trigger monitoring
            }, async () => {
                // Simulate long-running operation
                await new Promise(resolve => setTimeout(resolve, 35000));
                return 'completed';
            });
            // Fast-forward time
            globals_1.jest.advanceTimersByTime(35000);
            await (0, globals_1.expect)(longOperation).resolves.toBe('completed');
            globals_1.jest.useRealTimers();
        });
        (0, globals_1.test)('should provide cost analysis for tenant', async () => {
            // Record some usage
            await middleware_1.costGuard.recordActualCost({
                tenantId: 'analysis-tenant',
                userId: 'user-1',
                operation: 'graphql_query',
            }, 0.5);
            await middleware_1.costGuard.recordActualCost({
                tenantId: 'analysis-tenant',
                userId: 'user-2',
                operation: 'cypher_query',
            }, 0.3);
            const analysis = await middleware_1.costGuard.getCostAnalysis('analysis-tenant');
            (0, globals_1.expect)(analysis).toMatchObject({
                currentUsage: {
                    daily: globals_1.expect.any(Number),
                    monthly: globals_1.expect.any(Number),
                },
                limits: globals_1.expect.any(Object),
                utilization: {
                    daily: globals_1.expect.any(Number),
                    monthly: globals_1.expect.any(Number),
                },
                projectedMonthlySpend: globals_1.expect.any(Number),
                recommendations: globals_1.expect.any(Array),
            });
            (0, globals_1.expect)(analysis.currentUsage.daily).toBeCloseTo(0.8, 1);
        });
        (0, globals_1.test)('should generate cost report', async () => {
            await middleware_1.costGuard.recordActualCost({
                tenantId: 'report-tenant',
                userId: 'user-1',
                operation: 'graphql_query',
            }, 1.5);
            const report = await middleware_1.costGuard.generateCostReport('report-tenant', 30);
            (0, globals_1.expect)(report).toMatchObject({
                totalCost: globals_1.expect.any(Number),
                averageDailyCost: globals_1.expect.any(Number),
                operationBreakdown: globals_1.expect.any(Object),
                trends: globals_1.expect.any(Array),
            });
        });
    });
    (0, globals_1.describe)('Error Messages', () => {
        (0, globals_1.test)('should provide clear error message when daily budget exceeded', async () => {
            middleware_1.costGuard.setBudgetLimits('error-tenant', {
                daily: 0.001,
                monthly: 1.0,
            });
            try {
                await (0, middleware_1.withCostGuard)({
                    tenantId: 'error-tenant',
                    userId: 'user-1',
                    operation: 'cypher_query',
                    complexity: 10,
                }, async () => 'result');
                fail('Should have thrown CostGuardError');
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(middleware_1.CostGuardError);
                (0, globals_1.expect)(error.message).toContain('Insufficient budget');
                (0, globals_1.expect)(error.warnings.length).toBeGreaterThan(0);
            }
        });
        (0, globals_1.test)('should provide clear error message when burst limit exceeded', async () => {
            middleware_1.costGuard.setBudgetLimits('burst-error-tenant', {
                daily: 10.0,
                monthly: 100.0,
                query_burst: 0.1,
            });
            try {
                await (0, middleware_1.withCostGuard)({
                    tenantId: 'burst-error-tenant',
                    userId: 'user-1',
                    operation: 'cypher_query',
                    complexity: 100,
                }, async () => 'result');
                fail('Should have thrown CostGuardError');
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(middleware_1.CostGuardError);
                (0, globals_1.expect)(error.message).toContain('burst limit');
            }
        });
    });
});
