import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { EvidenceBundle, EvidencePaths } from './types.js';

const ensureMatchingIdentity = (bundle: EvidenceBundle): void => {
  const { evidenceId, runId } = bundle.report;
  if (bundle.metrics.evidenceId !== evidenceId) {
    throw new Error('EvidenceMetrics.evidenceId must match EvidenceReport.evidenceId.');
  }
  if (bundle.stamp.evidenceId !== evidenceId) {
    throw new Error('EvidenceStamp.evidenceId must match EvidenceReport.evidenceId.');
  }
  if (bundle.metrics.runId !== runId) {
    throw new Error('EvidenceMetrics.runId must match EvidenceReport.runId.');
  }
  if (bundle.stamp.runId !== runId) {
    throw new Error('EvidenceStamp.runId must match EvidenceReport.runId.');
  }
  if (!bundle.stamp.createdAtIso) {
    throw new Error('EvidenceStamp.createdAtIso is required and must be caller-provided.');
  }
};

export const writeEvidenceBundle = async (
  baseDir: string,
  bundle: EvidenceBundle,
): Promise<EvidencePaths> => {
  ensureMatchingIdentity(bundle);

  const runDir = path.join(baseDir, bundle.report.runId);
  await mkdir(runDir, { recursive: true });

  const reportPath = path.join(runDir, 'report.json');
  const metricsPath = path.join(runDir, 'metrics.json');
  const stampPath = path.join(runDir, 'stamp.json');

  await writeFile(reportPath, JSON.stringify(bundle.report, null, 2));
  await writeFile(metricsPath, JSON.stringify(bundle.metrics, null, 2));
  await writeFile(stampPath, JSON.stringify(bundle.stamp, null, 2));

  return {
    report: reportPath,
    metrics: metricsPath,
    stamp: stampPath,
  };
};
