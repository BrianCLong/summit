"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const orchestrator_enhanced_1 = require("../../src/autonomous/orchestrator.enhanced");
const CostEstimator_1 = require("../../src/autonomous/CostEstimator");
// Mock Dependencies
globals_1.jest.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: globals_1.jest.fn(() => ({
            startActiveSpan: globals_1.jest.fn((name, fn) => {
                const span = {
                    setStatus: globals_1.jest.fn(),
                    setAttributes: globals_1.jest.fn(),
                    end: globals_1.jest.fn(),
                };
                // Handle both callback styles if necessary, but Orchestrator uses async/await wrapper
                return fn(span);
            }),
        })),
    },
    SpanStatusCode: {
        OK: 1,
        ERROR: 2,
    },
}));
// Mock Logger
const mockLogger = {
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
    child: globals_1.jest.fn().mockReturnThis(),
};
// Mock DB
const mockDb = {
    query: globals_1.jest.fn(),
};
// Mock Redis
const mockRedis = {
    subscribe: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    publish: globals_1.jest.fn(),
};
// Mock PolicyEngine
const mockPolicyEngine = {
    evaluate: globals_1.jest.fn(),
};
(0, globals_1.describe)('Cost-Aware Planning', () => {
    let orchestrator;
    let costEstimator;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Default DB mock implementation
        mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });
        // Default Policy mock implementation
        mockPolicyEngine.evaluate.mockResolvedValue({ allowed: true });
        // Use real CostEstimator for logic testing, or we could mock it
        costEstimator = new CostEstimator_1.CostEstimator();
        orchestrator = new orchestrator_enhanced_1.EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine, costEstimator);
    });
    const baseConfig = {
        goal: 'Analyze the market trends',
        autonomy: 2,
        mode: 'PLAN',
        budgets: {
            tokens: 100000,
            usd: 10.0,
            timeMinutes: 60,
        },
        createdBy: 'user-123',
        tenantId: 'tenant-abc',
    };
    (0, globals_1.it)('should successfully create a run when within budget', async () => {
        // Setup DB to return run details when requested
        mockDb.query.mockImplementation((query, params) => {
            if (typeof query === 'string' && query.includes('SELECT * FROM runs')) {
                return Promise.resolve({ rows: [{ ...baseConfig, id: params[0], budget_usd: 10.0, budget_tokens: 100000 }] });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        });
        const runId = await orchestrator.createRun(baseConfig);
        (0, globals_1.expect)(runId).toBeDefined();
        // The startPlanning is async and fire-and-forget in createRun.
        // We need to wait a bit or inspect calls.
        // Since we can't easily await the private async call, we rely on the fact that
        // it was called and verify logs or db updates.
        // However, createRun does NOT wait for planning.
        // We can spy on generateTasks if we cast to any, or invoke startPlanning directly if we could.
        // Instead, we can verify that the error logger wasn't called with a budget error.
        // Wait for promise resolution (microtasks)
        await new Promise(resolve => setTimeout(resolve, 10));
        (0, globals_1.expect)(mockLogger.error).not.toHaveBeenCalledWith(globals_1.expect.objectContaining({ error: globals_1.expect.stringMatching(/Plan exceeds/) }), globals_1.expect.any(String));
    });
    (0, globals_1.it)('should log error when plan exceeds USD budget', async () => {
        // Override CostEstimator to return high cost
        const expensiveEstimator = {
            estimate: globals_1.jest.fn(),
            estimatePlan: globals_1.jest.fn().mockReturnValue({ usd: 100.0, tokens: 100, timeMs: 1000 })
        };
        orchestrator = new orchestrator_enhanced_1.EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine, expensiveEstimator);
        const budgetConfig = { ...baseConfig, budgets: { ...baseConfig.budgets, usd: 5.0 } };
        // Setup DB
        mockDb.query.mockImplementation((query, params) => {
            if (typeof query === 'string' && query.includes('SELECT * FROM runs')) {
                return Promise.resolve({ rows: [{ ...budgetConfig, id: params[0], budget_usd: 5.0 }] });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        });
        await orchestrator.createRun(budgetConfig);
        // Wait for async planning
        await new Promise(resolve => setTimeout(resolve, 100));
        // Expect error log
        (0, globals_1.expect)(mockLogger.error).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            error: globals_1.expect.objectContaining({ message: globals_1.expect.stringMatching(/Plan exceeds USD budget/) })
        }), 'Planning failed');
    });
    (0, globals_1.it)('should log error when plan exceeds Token budget', async () => {
        // Override CostEstimator to return high tokens
        const tokenHeavyEstimator = {
            estimate: globals_1.jest.fn(),
            estimatePlan: globals_1.jest.fn().mockReturnValue({ usd: 1.0, tokens: 500000, timeMs: 1000 })
        };
        orchestrator = new orchestrator_enhanced_1.EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine, tokenHeavyEstimator);
        const budgetConfig = { ...baseConfig, budgets: { ...baseConfig.budgets, tokens: 100000 } };
        // Setup DB
        mockDb.query.mockImplementation((query, params) => {
            if (typeof query === 'string' && query.includes('SELECT * FROM runs')) {
                return Promise.resolve({ rows: [{ ...budgetConfig, id: params[0], budget_tokens: 100000 }] });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        });
        await orchestrator.createRun(budgetConfig);
        // Wait for async planning
        await new Promise(resolve => setTimeout(resolve, 100));
        // Expect error log
        (0, globals_1.expect)(mockLogger.error).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            error: globals_1.expect.objectContaining({ message: globals_1.expect.stringMatching(/Plan exceeds token budget/) })
        }), 'Planning failed');
    });
});
