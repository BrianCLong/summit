import { createHash } from 'crypto';
import type { Experiment } from './types.js';

export function serializeExperimentForExport(experiment: Experiment): string {
  return JSON.stringify(
    {
      id: experiment.id,
      name: experiment.name,
      hypothesis: experiment.hypothesis,
      metrics: experiment.metrics,
      stopRule: experiment.stopRule,
      analysisPlan: experiment.analysisPlan,
      powerAnalysis: experiment.powerAnalysis,
      createdAt: experiment.createdAt,
      lockedAt: experiment.lockedAt ?? null,
      status: experiment.status,
      auditLog: experiment.auditLog,
      results: experiment.results
    },
    null,
    2
  );
}

export function createExportDigest(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

export function buildExportBundle(experiment: Experiment) {
  const payload = serializeExperimentForExport(experiment);
  const digest = createExportDigest(payload);
  return { payload, digest };
}
