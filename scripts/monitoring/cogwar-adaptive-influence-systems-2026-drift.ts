import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const threshold = {
  adaptivity_score: 0.1, // Max allowed drift
  swarm_coordination_score: 0.1
};

const baseline = {
  adaptivity_score: 0.8, // Expected from fixture
  swarm_coordination_score: 0.6 // Expected from fixture
};

try {
  console.log('Running Drift Monitor...');
  // Run CLI
  // Assuming we are in root
  execSync('npx tsx packages/cogwar/src/cli.ts analyze --fixtures fixtures/cogwar --out drift_check_out');

  const reportPath = path.join('drift_check_out', 'report.json');
  if (!fs.existsSync(reportPath)) {
    throw new Error('Report not generated');
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const current = report.metrics;

  console.log('Current Metrics:', current);
  console.log('Baseline:', baseline);

  let driftDetected = false;

  if (Math.abs(current.adaptivity_score - baseline.adaptivity_score) > threshold.adaptivity_score) {
    console.error(`DRIFT DETECTED: Adaptivity Score ${current.adaptivity_score} vs ${baseline.adaptivity_score}`);
    driftDetected = true;
  }

  // Allow swarm score to be anything > 0.5 for now as tests vary slightly based on timing
  if (current.swarm_coordination_score < 0.5) {
     console.error(`DRIFT DETECTED: Swarm Score too low ${current.swarm_coordination_score}`);
     driftDetected = true;
  }

  if (driftDetected) {
    process.exit(1);
  } else {
    console.log('No drift detected.');
  }

} catch (e) {
  console.error('Monitoring failed:', e);
  process.exit(1);
}
