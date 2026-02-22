import * as fs from 'fs';
import * as path from 'path';

export interface MemAlignReport {
  judgeName: string;
  traces: number;
  results: any[];
}

export interface MemAlignMetrics {
  latencyP95: number;
  avgScore: number;
  retrievalHitRate: number;
}

export function saveArtifacts(
  outputDir: string,
  report: MemAlignReport,
  metrics: MemAlignMetrics
) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // sort keys for determinism
  const sortKeys = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(sortKeys);
    if (typeof obj === 'object' && obj !== null) {
      return Object.keys(obj).sort().reduce((acc: any, key) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  };

  fs.writeFileSync(
    path.join(outputDir, 'report.json'),
    JSON.stringify(sortKeys(report), null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'metrics.json'),
    JSON.stringify(sortKeys(metrics), null, 2)
  );

  // Stamp without timestamp
  const stamp = {
    version: '1.0.0',
    config_hash: 'TODO_HASH', // simplified
  };
  fs.writeFileSync(
    path.join(outputDir, 'stamp.json'),
    JSON.stringify(stamp, null, 2)
  );
}
