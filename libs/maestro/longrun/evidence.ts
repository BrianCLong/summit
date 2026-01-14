import fs from 'node:fs';
import path from 'node:path';

import type {
  EvidenceManifest,
  IterationInput,
  LongRunJobSpec,
  StopDecision,
} from './types.js';
import { isCompletionVerified } from './stop-conditions.js';

export const createEvidenceManifest = (
  job: LongRunJobSpec,
  createdAt: string,
): EvidenceManifest => ({
  jobId: job.job_id,
  goal: job.goal,
  mode: job.mode ?? 'advisory',
  createdAt,
  updatedAt: createdAt,
  budgets: job.budgets,
  modelPolicy: job.model_policy,
  qualityGates: job.quality_gates,
  stopConditions: job.stop_conditions,
  iterations: [],
  completion: {
    status: 'in-progress',
    reason: 'not-complete',
    verified: false,
  },
});

export const recordIteration = (options: {
  manifest: EvidenceManifest;
  iteration: IterationInput;
  stopDecision: StopDecision;
  checkpointPath: string;
  timestamp: string;
}): EvidenceManifest => {
  const { manifest, iteration, stopDecision, checkpointPath, timestamp } = options;
  manifest.iterations.push({
    iteration: iteration.iteration,
    timestamp,
    metrics: iteration.metrics,
    diffSummary: iteration.diffSummary,
    planStatus: iteration.planStatus,
    qualityGates: iteration.qualityGates,
    stopDecision,
    checkpointPath,
  });

  manifest.updatedAt = timestamp;

  if (stopDecision.status === 'stop') {
    const verified = isCompletionVerified(iteration);
    manifest.completion = {
      status: verified ? 'completed' : 'halted',
      reason: stopDecision.reason,
      verified,
      verifiedAt: verified ? timestamp : undefined,
    };
  }

  return manifest;
};

export const writeEvidenceManifest = (options: {
  manifest: EvidenceManifest;
  outputDir: string;
  jobId: string;
}): string => {
  const { manifest, outputDir, jobId } = options;
  fs.mkdirSync(outputDir, { recursive: true });
  const target = path.join(outputDir, `${jobId}.manifest.json`);
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  return target;
};
