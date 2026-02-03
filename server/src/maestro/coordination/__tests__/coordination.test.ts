
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { coordinationService } from '../service.js';
import { budgetManager } from '../budget-manager.js';
import { CoordinationSchema, SharedBudget } from '../types.js';

// Mock dependencies
jest.mock('../../MaestroService', () => ({
  maestroService: {
    logAudit: jest.fn().mockReturnValue(Promise.resolve(undefined))
  }
}));

describe('Coordination System', () => {
  const schema: CoordinationSchema = {
    version: '1.0',
    name: 'Test Schema',
    roles: ['COORDINATOR', 'WORKER'],
    allowedTransitions: []
  };

  const budget: SharedBudget = {
    totalSteps: 5,
    totalTokens: 1000,
    wallClockTimeMs: 10000
  };

  let coordinationId: string;

  beforeEach(() => {
    // Reset budget manager state if needed, but it's a singleton in-memory map.
    // Ideally we would have a reset method, but for now we rely on new IDs.
  });

  test('should start coordination and initialize budget', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);
    expect(coordinationId).toBeDefined();

    const context = budgetManager.get(coordinationId);
    expect(context).toBeDefined();
    expect(context?.budget).toEqual(budget);
    expect(context?.status).toBe('ACTIVE');
  });

  test('should enforce budget limits (steps)', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);

    // Consume up to limit
    coordinationService.consumeBudget(coordinationId, { totalSteps: 4 });
    let check = budgetManager.checkBudget(coordinationId);
    expect(check.allowed).toBe(true);

    // Exceed limit
    coordinationService.consumeBudget(coordinationId, { totalSteps: 2 });
    check = budgetManager.checkBudget(coordinationId);
    expect(check.allowed).toBe(false);
    // The reason is 'Context is TERMINATED' because consumeBudget triggers killCoordination
    expect(check.reason).toMatch(/Context is TERMINATED|Step limit exceeded/);
  });

  test('should enforce budget limits (tokens)', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);

    // Consume up to limit (1000)
    coordinationService.consumeBudget(coordinationId, { totalTokens: 900 });
    let check = budgetManager.checkBudget(coordinationId);
    expect(check.allowed).toBe(true);

    // Exceed limit
    coordinationService.consumeBudget(coordinationId, { totalTokens: 200 });
    check = budgetManager.checkBudget(coordinationId);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/Context is TERMINATED|Token limit exceeded/);
  });

  test('should kill coordination on budget exhaustion', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);

    // Trigger kill by consuming too much via service
    // Note: consumeBudget in service checks AFTER consumption
    coordinationService.consumeBudget(coordinationId, { totalSteps: 6 });

    const context = budgetManager.get(coordinationId);
    expect(context?.status).toBe('TERMINATED');
    expect(context?.terminationReason).toBe('Step limit exceeded');
  });

  test('should enforce role validation', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);

    // agent-1 is COORDINATOR by default
    expect(coordinationService.validateAction(coordinationId, 'agent-1', 'COORDINATOR')).toBe(true);
    expect(coordinationService.validateAction(coordinationId, 'agent-1', 'WORKER')).toBe(false);
  });

  test('should propagate kill switch', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);

    coordinationService.killCoordination(coordinationId, 'Manual Stop');

    const context = budgetManager.get(coordinationId);
    expect(context?.status).toBe('TERMINATED');

    // Further actions should be denied
    const valid = coordinationService.validateAction(coordinationId, 'agent-1', 'COORDINATOR');
    expect(valid).toBe(false);
  });

  test('should prevent invalid role assumption', () => {
    coordinationId = coordinationService.startCoordination('agent-1', schema, budget);

    // Attempt to validate an action for an invalid role 'ROGUE'
    // 'ROGUE' is not in the schema roles ['COORDINATOR', 'WORKER']
    const valid = coordinationService.validateAction(coordinationId, 'rogue-agent', 'ROGUE' as any);

    expect(valid).toBe(false);

    // Verify it wasn't added
    const context = budgetManager.get(coordinationId);
    expect(context?.roles['rogue-agent']).toBeUndefined();
  });
});
