"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies
const mockConfig = {
    QUERY_BUDGET_ENABLED: true,
    QUERY_BUDGET_MODE: 'block',
    QUERY_BUDGET_TOKENS: 10,
    QUERY_BUDGET_REFILL_RATE: 1, // 1 token per second
};
const mockMetrics = {
    queryBudgetRemaining: { set: globals_1.jest.fn() },
    queryBudgetBlockedTotal: { inc: globals_1.jest.fn() },
    queryBudgetLatencySeconds: { observe: globals_1.jest.fn() },
};
const mockLogger = {
    warn: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
};
globals_1.jest.mock('../../src/config.js', () => ({
    cfg: mockConfig,
}));
globals_1.jest.mock('../../src/monitoring/metrics.js', () => mockMetrics);
globals_1.jest.mock('../../src/config/logger.js', () => ({ logger: mockLogger }));
// Import the class under test
const query_budget_js_1 = require("../../src/observability/query-budget.js");
describe('QueryBudgetGuard', () => {
    let guard;
    let req;
    let res;
    let next;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        // Reset config to defaults
        mockConfig.QUERY_BUDGET_ENABLED = true;
        mockConfig.QUERY_BUDGET_MODE = 'block';
        mockConfig.QUERY_BUDGET_TOKENS = 10;
        mockConfig.QUERY_BUDGET_REFILL_RATE = 1;
        // Reset date mocking
        globals_1.jest.useFakeTimers();
        globals_1.jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
        guard = new query_budget_js_1.QueryBudgetGuard();
        // Reset internal state if needed (we might need to expose a reset method or recreate)
        // The class is exported, so we can just new it up.
        req = {
            headers: {},
            user: { tenant_id: 'tenant-1' },
        };
        res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
        next = globals_1.jest.fn();
    });
    afterEach(() => {
        globals_1.jest.useRealTimers();
    });
    test('should allow request when budget is sufficient', () => {
        const middleware = guard.middleware();
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(mockMetrics.queryBudgetRemaining.set).toHaveBeenCalledWith({ tenant: 'tenant-1' }, 9); // 10 - 1
    });
    test('should refill tokens over time', () => {
        // Consume 5 tokens
        guard.consumeBudget('tenant-1', 5);
        expect(mockMetrics.queryBudgetRemaining.set).toHaveBeenCalledWith({ tenant: 'tenant-1' }, 5);
        // Advance time by 2 seconds -> +2 tokens
        globals_1.jest.advanceTimersByTime(2000);
        const middleware = guard.middleware();
        middleware(req, res, next);
        // 5 + 2 - 1 = 6
        expect(mockMetrics.queryBudgetRemaining.set).toHaveBeenLastCalledWith({ tenant: 'tenant-1' }, 6);
        expect(next).toHaveBeenCalled();
    });
    test('should block request when budget is empty and mode is block', () => {
        // Drain budget
        guard.consumeBudget('tenant-1', 10);
        const middleware = guard.middleware();
        middleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Query budget exceeded' }));
        expect(mockMetrics.queryBudgetBlockedTotal.inc).toHaveBeenCalledWith({ tenant: 'tenant-1' });
    });
    test('should warn only when budget is empty and mode is warn', () => {
        mockConfig.QUERY_BUDGET_MODE = 'warn';
        // Re-instantiate to pick up config change (constructor reads config)
        guard = new query_budget_js_1.QueryBudgetGuard();
        // Drain budget
        guard.consumeBudget('tenant-1', 10);
        const middleware = guard.middleware();
        middleware(req, res, next);
        expect(next).toHaveBeenCalled(); // Allowed pass
        expect(res.status).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }), expect.stringContaining('warn-only'));
        expect(mockMetrics.queryBudgetBlockedTotal.inc).toHaveBeenCalledWith({ tenant: 'tenant-1' }); // Still counts as blocked/exceeded event
    });
    test('should skip check if disabled', () => {
        mockConfig.QUERY_BUDGET_ENABLED = false;
        guard = new query_budget_js_1.QueryBudgetGuard();
        const middleware = guard.middleware();
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(mockMetrics.queryBudgetRemaining.set).not.toHaveBeenCalled();
    });
    test('should identify tenant from headers if user not present', () => {
        req.user = undefined;
        req.headers = { 'x-tenant-id': 'tenant-header' };
        const middleware = guard.middleware();
        middleware(req, res, next);
        expect(mockMetrics.queryBudgetRemaining.set).toHaveBeenCalledWith({ tenant: 'tenant-header' }, 9);
    });
});
