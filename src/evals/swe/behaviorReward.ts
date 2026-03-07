import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface BehaviorMetrics {
  fail_to_pass_before: number;
  fail_to_pass_after: number;
  regressions: number;
  patch_size_penalty?: number;
  reward: number;
}

export function computeBehaviorReward(
  failToPassBefore: number,
  failToPassAfter: number,
  regressions: number,
  patchSizePenalty = 0
): number {
  return failToPassAfter - failToPassBefore - regressions - patchSizePenalty;
}

export function emitBehaviorMetrics(id: string, metrics: BehaviorMetrics): void {
  const resultsDir = path.join(process.cwd(), 'evaluation/results/swe', id);
  mkdirSync(resultsDir, { recursive: true });

  const outputPath = path.join(resultsDir, 'behavior_metrics.json');
  writeFileSync(outputPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf-8');
}
