import fs from 'fs';
import path from 'path';
import { EvidenceReport, EvidenceMetrics, EvidenceStamp } from './schema.js';

export function stableStringify(x: unknown): string {
  // Simple deterministic stringify: sort keys
  return JSON.stringify(x, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((acc, k) => {
          // @ts-ignore
          acc[k] = value[k];
          return acc;
        }, {});
    }
    return value;
  }, 2) + "\n";
}

export function writeEvidence(
  baseDir: string,
  slug: string,
  report: EvidenceReport,
  metrics: EvidenceMetrics,
  stamp: EvidenceStamp
) {
  const dir = path.join(baseDir, slug);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'report.json'), stableStringify(report));
  fs.writeFileSync(path.join(dir, 'metrics.json'), stableStringify(metrics));
  fs.writeFileSync(path.join(dir, 'stamp.json'), stableStringify(stamp));

  console.log(`Evidence written to ${dir}`);
}
