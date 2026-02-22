import fs from 'node:fs';
import path from 'node:path';

// Simple diff logic
interface Metrics {
  [key: string]: number;
}

interface RunMetrics {
  mode: string;
  metrics: Metrics;
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

export function computeDiff(baselinePath: string, assistPath: string, outputPath: string) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as RunMetrics;
  const assist = JSON.parse(fs.readFileSync(assistPath, 'utf-8')) as RunMetrics;

  const diff: any = {
    baseline_mode: baseline.mode,
    assist_mode: assist.mode,
    deltas: {},
    percentage_changes: {}
  };

  const keys = new Set([...Object.keys(baseline.metrics), ...Object.keys(assist.metrics)]);

  for (const key of keys) {
    const bVal = baseline.metrics[key] || 0;
    const aVal = assist.metrics[key] || 0;

    diff.deltas[key] = aVal - bVal;

    if (bVal !== 0) {
      diff.percentage_changes[key] = ((aVal - bVal) / bVal) * 100;
    } else {
      diff.percentage_changes[key] = aVal === 0 ? 0 : null; // null for undefined/infinity
    }
  }

  // Deterministic output
  const sortedDiff = sortKeys(diff);

  fs.writeFileSync(outputPath, JSON.stringify(sortedDiff, null, 2) + '\n');
  console.log(`Wrote diff to ${outputPath}`);
}

// CLI usage
// In ESM with tsx, require.main === module might not work as expected if handled as module.
// We can use a simple check or just run it.
// For simplicity in this environment:
const args = process.argv.slice(2);
if (args.length >= 3) {
  computeDiff(args[0], args[1], args[2]);
}
