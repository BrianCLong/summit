import { EvidenceReport, EvidenceStamp, EvidenceMetrics, MWSEvidenceReport } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export async function writeEvidence(
  report: EvidenceReport,
  optionsOrOutputDir: { metrics?: EvidenceMetrics; outputDir?: string } | string = 'artifacts/evidence'
): Promise<string> {
  let outputDir = 'artifacts/evidence';
  let metrics: EvidenceMetrics | undefined;

  if (typeof optionsOrOutputDir === 'string') {
    outputDir = optionsOrOutputDir;
  } else {
    outputDir = optionsOrOutputDir.outputDir || outputDir;
    metrics = optionsOrOutputDir.metrics;
  }

  // Determine runDir
  let runDir: string;
  if ('eid' in report && report.eid) {
    runDir = path.join(outputDir, report.eid);
  } else if ('packName' in report && 'runId' in report) {
     const mwsReport = report as MWSEvidenceReport;
     runDir = path.join(outputDir, mwsReport.packName.replace('/', '-'), mwsReport.runId);
  } else {
    throw new Error('EvidenceReport must have eid or packName/runId');
  }

  await fs.promises.mkdir(runDir, { recursive: true });

  // 1. Write Report
  const reportPath = path.join(runDir, 'report.json');
  // Sort keys for determinism
  const reportJson = JSON.stringify(report, Object.keys(report).sort(), 2);
  await fs.promises.writeFile(reportPath, reportJson);

  // 2. Write Metrics (if provided)
  let metricsJson = '';
  if (metrics) {
    const metricsPath = path.join(runDir, 'metrics.json');
    metricsJson = JSON.stringify(metrics, Object.keys(metrics).sort(), 2);
    await fs.promises.writeFile(metricsPath, metricsJson);
  }

  // 3. Compute Stamp (hash of report + metrics)
  const hashInput = reportJson + metricsJson;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  const stamp: EvidenceStamp = {
    hash,
    version: '1.0.0',
    date: new Date().toISOString(),
  };
  const stampPath = path.join(runDir, 'stamp.json');
  await fs.promises.writeFile(stampPath, JSON.stringify(stamp, null, 2));

  return runDir;
}
