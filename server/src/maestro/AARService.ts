import { GoalSeekingResult } from './GoalSeekingAgent.js';

/**
 * After-Action Reporting (AAR) Service - Generates structured summaries of agent performance.
 */
export class AARService {
  generateReport(result: GoalSeekingResult): AfterActionReport {
    const totalImpact = result.history.reduce((acc, iter) => acc + iter.impact.momentumShift, 0);
    const avgImpact = totalImpact / result.iterations;

    return {
      success: result.success,
      iterations: result.iterations,
      totalMomentumShift: totalImpact,
      averageImpactPerIteration: avgImpact,
      summary: result.success
        ? `Objective achieved in ${result.iterations} iterations with a total shift of ${totalImpact.toFixed(2)}.`
        : `Objective not reached after ${result.iterations} iterations. Final momentum: ${result.history[result.history.length-1]?.momentum || 0}`,
      timestamp: new Date().toISOString()
    };
  }
}

export interface AfterActionReport {
  success: boolean;
  iterations: number;
  totalMomentumShift: number;
  averageImpactPerIteration: number;
  summary: string;
  timestamp: string;
}
