import { EvidenceReport, EvidenceStamp } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  return Object.keys(obj).sort().reduce((res: any, key: string) => {
    res[key] = sortKeys(obj[key]);
    return res;
  }, {});
}

export async function writeEvidence(
  report: EvidenceReport,
  outputDir: string = 'artifacts/evidence'
): Promise<string> {
  const subDir = (report.packName || report.evidence_id || 'unknown').replace('/', '-');
  const runDir = path.join(outputDir, subDir, report.runId);
  await fs.promises.mkdir(runDir, { recursive: true });

  // Handle metrics if present
  const reportToWrite = { ...report };
  if (report.metrics) {
    const metricsPath = path.join(runDir, 'metrics.json');
    // Sort keys recursively
    const sortedMetrics = sortKeys(report.metrics);
    const metricsJson = JSON.stringify(sortedMetrics, null, 2);
    await fs.promises.writeFile(metricsPath, metricsJson);

    // Remove metrics from report to avoid duplication in report.json
    delete reportToWrite.metrics;
  }

  // 1. Write Report
  const reportPath = path.join(runDir, 'report.json');
  // Sort keys for determinism
  const sortedReport = sortKeys(reportToWrite);
  const reportJson = JSON.stringify(sortedReport, null, 2);
  await fs.promises.writeFile(reportPath, reportJson);

  // 2. Compute Stamp (hash of report)
  const hash = crypto.createHash('sha256').update(reportJson).digest('hex');
  const stamp: EvidenceStamp = {
    hash,
    version: '1.0.0',
  };
  const stampPath = path.join(runDir, 'stamp.json');
  // Sort stamp too just in case
  await fs.promises.writeFile(stampPath, JSON.stringify(sortKeys(stamp), null, 2));

  return runDir;
}
