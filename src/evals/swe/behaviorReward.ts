import * as fs from 'fs';
import * as path from 'path';

/**
 * Computes the behavior reward based on fail-to-pass tests and regressions.
 * @param failToPassBefore The number of fail-to-pass tests before the patch.
 * @param failToPassAfter The number of fail-to-pass tests after the patch.
 * @param regressions The number of new regressions introduced.
 * @returns The computed reward score.
 */
export function computeBehaviorReward(
  failToPassBefore: number,
  failToPassAfter: number,
  regressions: number
): number {
  // Reward formula based on SWE-rebench V2 behavior-first approach
  const reward = (failToPassAfter - failToPassBefore) - (regressions * 0.1);
  return reward;
}

/**
 * Emits the behavior metrics to a JSON file.
 * @param id The unique identifier for the evaluation/task.
 * @param metrics The metrics to record.
 */
export function emitBehaviorMetrics(
  id: string,
  metrics: {
    fail_to_pass_before: number;
    fail_to_pass_after: number;
    regressions: number;
    reward: number;
  }
): void {
  const resultsDir = path.join(process.cwd(), 'evals/results', id);

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const outputPath = path.join(resultsDir, 'behavior_metrics.json');
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2), 'utf-8');
  console.log(`Emitted behavior metrics to ${outputPath}`);
}
