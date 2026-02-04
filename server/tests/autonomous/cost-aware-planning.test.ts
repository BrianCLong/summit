import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EnhancedAutonomousOrchestrator, RunConfig } from '../../src/autonomous/orchestrator.enhanced';
import { CostEstimator, TaskCost } from '../../src/autonomous/CostEstimator';
import { PolicyEngine } from '../../src/autonomous/policy-engine';
import { Logger } from 'pino';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Mock Dependencies
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(() => ({
      startActiveSpan: jest.fn((name, fn) => {
        const span = {
          setStatus: jest.fn(),
          setAttributes: jest.fn(),
          end: jest.fn(),
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
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
} as unknown as Logger;

// Mock DB
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

// Mock Redis
const mockRedis = {
  subscribe: jest.fn(),
  on: jest.fn(),
  publish: jest.fn(),
} as unknown as Redis;

// Mock PolicyEngine
const mockPolicyEngine = {
  evaluate: jest.fn(),
} as unknown as PolicyEngine;

describe('Cost-Aware Planning', () => {
  let orchestrator: EnhancedAutonomousOrchestrator;
  let costEstimator: CostEstimator;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default DB mock implementation
    (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

    // Default Policy mock implementation
    (mockPolicyEngine.evaluate as jest.Mock).mockResolvedValue({ allowed: true });

    // Use real CostEstimator for logic testing, or we could mock it
    costEstimator = new CostEstimator();

    orchestrator = new EnhancedAutonomousOrchestrator(
      mockDb,
      mockRedis,
      mockLogger,
      mockPolicyEngine,
      costEstimator
    );
  });

  const baseConfig: RunConfig = {
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

  it('should successfully create a run when within budget', async () => {
    // Setup DB to return run details when requested
    (mockDb.query as jest.Mock).mockImplementation((query, params) => {
        if (typeof query === 'string' && query.includes('SELECT * FROM runs')) {
             return Promise.resolve({ rows: [{ ...baseConfig, id: params[0], budget_usd: 10.0, budget_tokens: 100000 }] });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
    });

    const runId = await orchestrator.createRun(baseConfig);
    expect(runId).toBeDefined();

    // The startPlanning is async and fire-and-forget in createRun.
    // We need to wait a bit or inspect calls.
    // Since we can't easily await the private async call, we rely on the fact that
    // it was called and verify logs or db updates.

    // However, createRun does NOT wait for planning.
    // We can spy on generateTasks if we cast to any, or invoke startPlanning directly if we could.
    // Instead, we can verify that the error logger wasn't called with a budget error.

    // Wait for promise resolution (microtasks)
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockLogger.error).not.toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Plan exceeds/) }), expect.any(String));
  });

  it('should log error when plan exceeds USD budget', async () => {
    // Override CostEstimator to return high cost
    const expensiveEstimator = {
        estimate: jest.fn(),
        estimatePlan: jest.fn().mockReturnValue({ usd: 100.0, tokens: 100, timeMs: 1000 })
    } as unknown as CostEstimator;

    orchestrator = new EnhancedAutonomousOrchestrator(
        mockDb,
        mockRedis,
        mockLogger,
        mockPolicyEngine,
        expensiveEstimator
    );

    const budgetConfig = { ...baseConfig, budgets: { ...baseConfig.budgets, usd: 5.0 } };

    // Setup DB
    (mockDb.query as jest.Mock).mockImplementation((query, params) => {
        if (typeof query === 'string' && query.includes('SELECT * FROM runs')) {
             return Promise.resolve({ rows: [{ ...budgetConfig, id: params[0], budget_usd: 5.0 }] });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
    });

    await orchestrator.createRun(budgetConfig);

    // Wait for async planning
    await new Promise(resolve => setTimeout(resolve, 100));

    // Expect error log
    expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
            error: expect.objectContaining({ message: expect.stringMatching(/Plan exceeds USD budget/) })
        }),
        'Planning failed'
    );
  });

  it('should log error when plan exceeds Token budget', async () => {
    // Override CostEstimator to return high tokens
    const tokenHeavyEstimator = {
        estimate: jest.fn(),
        estimatePlan: jest.fn().mockReturnValue({ usd: 1.0, tokens: 500000, timeMs: 1000 })
    } as unknown as CostEstimator;

    orchestrator = new EnhancedAutonomousOrchestrator(
        mockDb,
        mockRedis,
        mockLogger,
        mockPolicyEngine,
        tokenHeavyEstimator
    );

    const budgetConfig = { ...baseConfig, budgets: { ...baseConfig.budgets, tokens: 100000 } };

    // Setup DB
    (mockDb.query as jest.Mock).mockImplementation((query, params) => {
        if (typeof query === 'string' && query.includes('SELECT * FROM runs')) {
             return Promise.resolve({ rows: [{ ...budgetConfig, id: params[0], budget_tokens: 100000 }] });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
    });

    await orchestrator.createRun(budgetConfig);

    // Wait for async planning
    await new Promise(resolve => setTimeout(resolve, 100));

    // Expect error log
    expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
            error: expect.objectContaining({ message: expect.stringMatching(/Plan exceeds token budget/) })
        }),
        'Planning failed'
    );
  });
});
