"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreBudgetEfficiency = scoreBudgetEfficiency;
/**
 * Calculates the budget efficiency score based on the sequence of traces.
 *
 * This deterministic function scores how efficiently the agent
 * used its budget constraints to reach a successful outcome.
 */
function scoreBudgetEfficiency(traces, maxSteps) {
    if (traces.length === 0)
        return 0;
    if (maxSteps <= 0)
        return 0;
    const stepsTaken = traces.length;
    const lastTrace = traces[traces.length - 1];
    // High efficiency if steps taken are low compared to max budget,
    // weighted by the final reward and completion status.
    const stepEfficiency = 1.0 - (stepsTaken / maxSteps);
    let successMultiplier = 1.0;
    // If the environment signaled done, the agent reached a terminal state
    if (lastTrace.observation.done) {
        successMultiplier = 1.5;
    }
    // Ensuring score is non-negative and somewhat normalized
    const score = Math.max(0, stepEfficiency * successMultiplier);
    return score;
}
