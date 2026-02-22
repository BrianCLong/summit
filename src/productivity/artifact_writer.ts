import fs from 'node:fs';
import path from 'node:path';

export interface ProductivityMetrics {
  mode: 'baseline' | 'assist';
  metrics: {
    duration_seconds: number;
    tests_passed?: number;
    tests_failed?: number;
    lint_issues?: number;
    review_friction_index?: number;
    [key: string]: number | undefined;
  };
  tags?: string[];
}

export interface RunStamp {
  runId: string;
  timestamp: string;
  workflowId?: string;
  runner?: string;
  [key: string]: any;
}

function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortKeys(obj[key]);
      return acc;
    }, {} as any);
}

export function writeProductivityArtifacts(
  outputDir: string,
  metrics: ProductivityMetrics,
  stamp: RunStamp
) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Deterministic write (sorted keys)
  const sortedMetrics = sortKeys(metrics);
  const metricsJson = JSON.stringify(sortedMetrics, null, 2);
  fs.writeFileSync(path.join(outputDir, 'run_metrics.json'), metricsJson + '\n');

  // Volatile write
  const stampJson = JSON.stringify(stamp, null, 2);
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), stampJson + '\n');

  console.log(`Wrote productivity artifacts to ${outputDir}`);
}
