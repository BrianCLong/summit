import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Analyzes policy drift reports and identifies anomalies.
 */
export async function detectDriftAnomalies(): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const driftReportPath = resolve(__dirname, `../../artifacts/federation/policy-drift/${date}/report.json`);
  const driftReport = JSON.parse(readFileSync(driftReportPath, 'utf-8'));

  const anomalies = [];
  for (const repo in driftReport) {
    if (driftReport[repo].drift.length > 5) {
      anomalies.push({
        repo,
        reason: 'Excessive policy drift',
        drift: driftReport[repo].drift,
      });
    }
  }

  const reportDir = resolve(__dirname, `../../artifacts/assurance/drift-anomalies/${date}`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(resolve(reportDir, 'report.json'), JSON.stringify(anomalies, null, 2));
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      await detectDriftAnomalies();
      console.log('Drift anomaly detection complete.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
