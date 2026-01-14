import { BudgetTracker } from '../../libs/maestro/longrun/budget.js';
import {
  evaluateStopConditions,
  initialStopState,
} from '../../libs/maestro/longrun/stop-conditions.js';

const budgets = { perHourUsd: 100, totalUsd: 100, tokens: 1000 };
const policy = {
  maxIterations: 5,
  maxStallIterations: 2,
  maxRepeatErrors: 2,
  maxRepeatDiffs: 2,
  requireConsecutiveDone: 2,
  manualStopFile: '.maestro/STOP',
};

const createBudget = () => new BudgetTracker(budgets, Date.now());

describe('evaluateStopConditions', () => {
  it('detects stalls after configured iterations', () => {
    const state = initialStopState();
    const budget = createBudget();
    const first = evaluateStopConditions({
      iteration: {
        iteration: 1,
        diffSummary: { meaningful: false },
      },
      state,
      policy,
      budget,
      workspaceRoot: process.cwd(),
    });

    expect(first.status).toBe('continue');

    const second = evaluateStopConditions({
      iteration: {
        iteration: 2,
        diffSummary: { meaningful: false },
      },
      state,
      policy,
      budget,
      workspaceRoot: process.cwd(),
    });

    expect(second).toEqual({ status: 'stop', reason: 'stall-detected' });
  });

  it('detects diff oscillation', () => {
    const state = initialStopState();
    const budget = createBudget();

    const first = evaluateStopConditions({
      iteration: {
        iteration: 1,
        diffSummary: { hash: 'abc123', meaningful: true },
      },
      state,
      policy,
      budget,
      workspaceRoot: process.cwd(),
    });

    expect(first.status).toBe('continue');

    const second = evaluateStopConditions({
      iteration: {
        iteration: 2,
        diffSummary: { hash: 'abc123', meaningful: true },
      },
      state,
      policy,
      budget,
      workspaceRoot: process.cwd(),
    });

    expect(second).toEqual({ status: 'stop', reason: 'oscillation-diff' });
  });

  it('requires consecutive done signals for verified completion', () => {
    const state = initialStopState();
    const budget = createBudget();

    const first = evaluateStopConditions({
      iteration: {
        iteration: 1,
        doneSignal: true,
        planStatus: { completed: 3, total: 3 },
        qualityGates: { passed: ['pnpm test'], failed: [] },
        diffSummary: { meaningful: true },
      },
      state,
      policy,
      budget,
      workspaceRoot: process.cwd(),
    });

    expect(first.status).toBe('continue');

    const second = evaluateStopConditions({
      iteration: {
        iteration: 2,
        doneSignal: true,
        planStatus: { completed: 3, total: 3 },
        qualityGates: { passed: ['pnpm test'], failed: [] },
        diffSummary: { meaningful: true },
      },
      state,
      policy,
      budget,
      workspaceRoot: process.cwd(),
    });

    expect(second).toEqual({ status: 'stop', reason: 'verified-completion' });
  });
});
