import fs from 'node:fs';
import path from 'node:path';

import type {
  IterationInput,
  StopDecision,
  StopState,
  StopConditionPolicy,
} from './types.js';
import { BudgetTracker } from './budget.js';

const normalizeSignal = (message: string): string =>
  message.trim().toLowerCase().replace(/\s+/g, ' ');

const isPlanComplete = (iteration: IterationInput): boolean => {
  const plan = iteration.planStatus;
  if (!plan) {
    return false;
  }
  return plan.total > 0 && plan.completed >= plan.total;
};

const areQualityGatesGreen = (iteration: IterationInput): boolean => {
  const gates = iteration.qualityGates;
  if (!gates) {
    return false;
  }
  return gates.failed.length === 0;
};

const isMeaningfulDiff = (iteration: IterationInput): boolean => {
  const diff = iteration.diffSummary;
  if (!diff) {
    return false;
  }
  if (diff.meaningful !== undefined) {
    return diff.meaningful;
  }
  if (diff.changedLines !== undefined) {
    return diff.changedLines > 0;
  }
  return Boolean(diff.hash);
};

export const initialStopState = (): StopState => ({
  consecutiveDoneSignals: 0,
  stallCount: 0,
  diffHashCounts: {},
  errorCounts: {},
  lastMeaningfulIteration: 0,
});

export const evaluateStopConditions = (options: {
  iteration: IterationInput;
  state: StopState;
  policy: StopConditionPolicy;
  budget: BudgetTracker;
  workspaceRoot: string;
}): StopDecision => {
  const { iteration, state, policy, budget, workspaceRoot } = options;
  const stopFile = path.join(workspaceRoot, policy.manualStopFile);

  if (fs.existsSync(stopFile)) {
    return { status: 'stop', reason: 'manual-stop', detail: stopFile };
  }

  if (iteration.iteration >= policy.maxIterations) {
    return { status: 'stop', reason: 'max-iterations' };
  }

  const budgetStatus = budget.isBudgetExceeded();
  if (budgetStatus.exceeded) {
    return { status: 'stop', reason: 'budget-exhausted', detail: budgetStatus.reason };
  }

  const doneSignal = Boolean(iteration.doneSignal);
  if (doneSignal) {
    state.consecutiveDoneSignals += 1;
  } else {
    state.consecutiveDoneSignals = 0;
  }

  if (isMeaningfulDiff(iteration)) {
    state.stallCount = 0;
    state.lastMeaningfulIteration = iteration.iteration;
  } else {
    state.stallCount += 1;
    if (state.stallCount >= policy.maxStallIterations) {
      return { status: 'stop', reason: 'stall-detected' };
    }
  }

  if (iteration.diffSummary?.hash) {
    const hash = iteration.diffSummary.hash;
    state.diffHashCounts[hash] = (state.diffHashCounts[hash] ?? 0) + 1;
    if (state.diffHashCounts[hash] >= policy.maxRepeatDiffs) {
      return { status: 'stop', reason: 'oscillation-diff' };
    }
  }

  if (iteration.errors && iteration.errors.length > 0) {
    for (const error of iteration.errors) {
      const key = normalizeSignal(error);
      state.errorCounts[key] = (state.errorCounts[key] ?? 0) + 1;
      if (state.errorCounts[key] >= policy.maxRepeatErrors) {
        return { status: 'stop', reason: 'oscillation-error', detail: key };
      }
    }
  }

  const verifiedCompletion =
    isPlanComplete(iteration) && areQualityGatesGreen(iteration);
  if (verifiedCompletion) {
    if (state.consecutiveDoneSignals >= policy.requireConsecutiveDone) {
      return { status: 'stop', reason: 'verified-completion' };
    }
  }

  return { status: 'continue', reason: 'in-progress' };
};

export const isCompletionVerified = (iteration: IterationInput): boolean =>
  isPlanComplete(iteration) && areQualityGatesGreen(iteration);
