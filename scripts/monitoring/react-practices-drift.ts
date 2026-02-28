import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

function detectDrift(reportsDir: string) {
  const metricsPath = path.join(reportsDir, 'metrics.json');
  const trendPath = path.join(reportsDir, 'trend.json');

  if (!fs.existsSync(metricsPath)) {
    console.error('metrics.json not found. Run analysis first.');
    process.exit(1);
  }

  const currentMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  let trendData: any[] = [];

  if (fs.existsSync(trendPath)) {
    trendData = JSON.parse(fs.readFileSync(trendPath, 'utf8'));
  }

  trendData.push({
    timestamp: new Date().toISOString().split('T')[0], // Just date for determinism or pseudo-determinism
    ...currentMetrics
  });

  // Keep last 30 entries
  if (trendData.length > 30) {
    trendData.shift();
  }

  fs.writeFileSync(trendPath, JSON.stringify(trendData, null, 2));

  // Alerting logic
  if (trendData.length >= 2) {
    const previous = trendData[trendData.length - 2];
    const current = trendData[trendData.length - 1];

    if (current.streamingCoveragePercent < 75) {
      console.error(`🚨 ALERT: Streaming coverage dropped below 75% (${current.streamingCoveragePercent}%)`);
      process.exit(1);
    }

    const violationIncrease = (current.boundaryViolations + current.cacheViolations) - (previous.boundaryViolations + previous.cacheViolations);
    if (violationIncrease > 0) { // Should ideally be a percentage increase, but keeping simple for MWS
       console.warn(`⚠️ Warning: Violations increased by ${violationIncrease}`);
    }
  }

  console.log('Drift detection complete. Trend updated.');
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const reportsDir = process.argv[2] || path.join(process.cwd(), 'reports', 'react-best-practices');
  detectDrift(reportsDir);
}
