import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const driftThreshold = 0.05;
const baselineAcc = 0.90;

export function checkDrift(metricsFile: string): void {
  const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));

  if (metrics.accuracy < baselineAcc - driftThreshold) {
    throw new Error(`Model drift detected: accuracy ${metrics.accuracy} dropped below threshold!`);
  }
}

// Ensure the module executes if run directly
const metricsPath = path.resolve(__dirname, '../../benchmarks/omics/metrics.json');
checkDrift(metricsPath);
console.log('Drift check passed.');
