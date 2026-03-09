import { TraceEvent } from '../runners/interactive_runner';

/**
 * Deterministic scoring function for budget efficiency.
 * Calculates the reward normalized by the number of steps taken.
 */
export function scoreBudgetEfficiency(trace: TraceEvent[], maxBudget: number): number {
  if (!trace || trace.length === 0 || maxBudget <= 0) return 0;

  let totalReward = 0;
  let stepsTaken = trace.length - 1; // Subtract 1 for initial reset step

  for (const event of trace) {
    if (event.reward) {
      totalReward += event.reward;
    }
  }

  if (stepsTaken === 0) return 0;

  // Efficiency = total reward / fraction of budget used
  const fractionUsed = stepsTaken / maxBudget;
  return totalReward / fractionUsed;
}
