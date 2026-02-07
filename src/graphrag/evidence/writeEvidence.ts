import fs from 'node:fs';
import path from 'node:path';
import { stableStringify } from './stableStringify';
import { EvidenceBundleInput, EvidenceWriteResult } from './types';

export function writeEvidenceBundle(input: EvidenceBundleInput): EvidenceWriteResult {
  if (process.env.EVIDENCE_WRITE === '0') {
    return { written: false, outDir: input.outDir };
  }

  fs.mkdirSync(input.outDir, { recursive: true });

  const reportPath = path.join(input.outDir, 'report.json');
  const metricsPath = path.join(input.outDir, 'metrics.json');
  const stampPath = path.join(input.outDir, 'stamp.json');

  fs.writeFileSync(reportPath, stableStringify(input.report));
  fs.writeFileSync(metricsPath, stableStringify(input.metrics));
  fs.writeFileSync(stampPath, stableStringify(input.stamp));

  const rootIndexPath = path.join(process.cwd(), 'evidence', 'index.json');
  fs.mkdirSync(path.dirname(rootIndexPath), { recursive: true });
  fs.writeFileSync(rootIndexPath, stableStringify({ entries: input.index }));

  return {
    written: true,
    outDir: input.outDir,
    files: {
      report: reportPath,
      metrics: metricsPath,
      stamp: stampPath,
      index: rootIndexPath,
    },
  };
}
