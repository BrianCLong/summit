import { EvidenceReport, EvidenceStamp } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export async function writeEvidence(
  report: EvidenceReport,
  outputDir: string = 'artifacts/evidence'
): Promise<string> {
  const runDir = path.join(outputDir, report.packName.replace('/', '-'), report.runId);
  await fs.promises.mkdir(runDir, { recursive: true });

  // 1. Write Report
  const reportPath = path.join(runDir, 'report.json');
  // Sort keys for determinism
  const reportJson = JSON.stringify(report, Object.keys(report).sort(), 2);
  await fs.promises.writeFile(reportPath, reportJson);

  // 2. Compute Stamp (hash of report)
  const hash = crypto.createHash('sha256').update(reportJson).digest('hex');
  const stamp: EvidenceStamp = {
    hash,
    version: '1.0.0',
  };
  const stampPath = path.join(runDir, 'stamp.json');
  await fs.promises.writeFile(stampPath, JSON.stringify(stamp, null, 2));

  return runDir;
}
