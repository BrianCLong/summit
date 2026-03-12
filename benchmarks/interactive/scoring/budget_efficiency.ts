import { TraceEvent } from '../runners/interactive_runner';

/**
 * Deterministic scoring function for budget efficiency.
 * Calculates the reward normalized by the number of steps taken.
 */
export function scoreBudgetEfficiency(trace: TraceEvent[], maxBudget: number): number {
  if (!trace || trace.length === 0 || maxBudget <= 0) return 0;

  const stepsTaken = trace.length;
  const lastEvent = trace[trace.length - 1];
  // Check for terminal state: observation.done === true
  const done = (lastEvent?.observation as any)?.done === true;

  const efficiency = (maxBudget - stepsTaken) / maxBudget;
  const multiplier = done ? 1.5 : 1.0;
  return efficiency * multiplier;
}
