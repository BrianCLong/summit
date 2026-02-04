import { z } from 'zod';

// Define the shape of a trajectory (run history)
export const TrajectoryStepSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['succeeded', 'failed', 'retried']),
  timestamp: z.number(), // Unix ms
  metadata: z.record(z.any()).optional(),
});

export const TrajectorySchema = z.object({
  runId: z.string(),
  steps: z.array(TrajectoryStepSchema),
  finalStatus: z.enum(['succeeded', 'failed', 'killed']),
  startTime: z.number(),
  endTime: z.number().optional(),
});

export type Trajectory = z.infer<typeof TrajectorySchema>;
export type TrajectoryStep = z.infer<typeof TrajectoryStepSchema>;

export interface HealthMetrics {
  convergenceTimeMs: number | null;
  oscillationRate: number;
  recoveryRate: number;
  escalationDensity: number;
  overallHealthScore: number; // 0-1
}

export class TrajectoryEvaluator {
  /**
   * Calculate health metrics for a given trajectory.
   */
  evaluate(trajectory: Trajectory): HealthMetrics {
    const steps = trajectory.steps;

    // 1. Convergence Time
    let convergenceTimeMs: number | null = null;
    if (trajectory.finalStatus === 'succeeded' && trajectory.endTime) {
      convergenceTimeMs = trajectory.endTime - trajectory.startTime;
    }

    // 2. Oscillation Rate (Repeated identical steps)
    // We assume 'oscillation' means running the same task type/params multiple times back-to-back or in short loops
    // Simplified: Count of steps that share type with the immediately preceding step
    let oscillations = 0;
    for (let i = 1; i < steps.length; i++) {
       if (steps[i].type === steps[i-1].type && steps[i].status !== 'retried') {
           // Basic heuristic: same task type, not a retry mechanism
           oscillations++;
       }
    }
    const oscillationRate = steps.length > 0 ? oscillations / steps.length : 0;

    // 3. Recovery Rate
    const failures = steps.filter(s => s.status === 'failed');
    const retries = steps.filter(s => s.status === 'retried');
    // Assuming a 'retried' status means we recovered from a failure, or a subsequent success after failure
    // Let's use a simpler heuristic: (Total Failures - Unrecovered Failures) / Total Failures
    // Where Unrecovered is if the run failed.
    // Actually, recovery usually means: Step A failed, then Step A (retry) succeeded.
    // For now, let's just use: if final status is success, recovery is 1.0 (if there were failures).
    let recoveryRate = 1.0;
    if (failures.length > 0) {
        recoveryRate = trajectory.finalStatus === 'succeeded' ? 1.0 : 0.0;
        // More granular: check if failed steps were followed by success of same type?
    }

    // 4. Escalation Density
    // Assume metadata contains 'escalation' flag
    const escalations = steps.filter(s => s.metadata?.escalation === true).length;
    const escalationDensity = steps.length > 0 ? escalations / steps.length : 0;

    // 5. Overall Health Score (Weighted average)
    // - Convergence: Lower is better (normalized? hard to normalize without baseline) -> Ignored for 0-1 score
    // - Oscillation: Lower is better
    // - Recovery: Higher is better
    // - Escalation: Lower is better

    let score = 1.0;
    score -= oscillationRate * 0.5; // High penalty for oscillation
    score -= escalationDensity * 0.3;
    if (failures.length > 0) {
        score = score * (0.5 + (recoveryRate * 0.5)); // If failures occurred, max score depends on recovery
    }

    return {
      convergenceTimeMs,
      oscillationRate,
      recoveryRate,
      escalationDensity,
      overallHealthScore: Math.max(0, Math.min(1, score)),
    };
  }
}
