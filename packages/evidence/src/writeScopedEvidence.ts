import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { generateEvidenceID } from './id.js';
import { ScopedEvidence, EvidenceArtifact } from './types.js';

export async function writeScopedEvidence(
  evidence: ScopedEvidence,
  outputDir: string = 'artifacts/evidence'
): Promise<string> {
  // Use 'report' as the primary artifact for directory naming, or generic bundle ID
  // The plan asked for Evidence ID pattern: EVID::<domain>::<yyyyMMdd>::<scope_id>::<artifact>::v<semver>
  // Here we use it for the directory name.
  const evId = generateEvidenceID(evidence.domain, evidence.scopeId, 'bundle', evidence.version);
  const runDir = path.join(outputDir, evId);
  await fs.promises.mkdir(runDir, { recursive: true });

  // 1. Write Report
  const reportPath = path.join(runDir, 'report.json');
  // Sort keys for determinism
  const reportJson = JSON.stringify(evidence.report, Object.keys(evidence.report).sort(), 2);
  await fs.promises.writeFile(reportPath, reportJson);

  // 2. Write Metrics
  const metricsPath = path.join(runDir, 'metrics.json');
  const metricsJson = JSON.stringify(evidence.metrics, Object.keys(evidence.metrics).sort(), 2);
  await fs.promises.writeFile(metricsPath, metricsJson);

  // 3. Compute Stamp (hash of report + metrics)
  const reportHash = crypto.createHash('sha256').update(reportJson).digest('hex');
  const metricsHash = crypto.createHash('sha256').update(metricsJson).digest('hex');

  const stamp = {
    reportHash,
    metricsHash,
    version: evidence.version,
    scopeId: evidence.scopeId,
    generatedAt: new Date().toISOString()
  };

  const stampPath = path.join(runDir, 'stamp.json');
  await fs.promises.writeFile(stampPath, JSON.stringify(stamp, null, 2));

  return runDir;
}
