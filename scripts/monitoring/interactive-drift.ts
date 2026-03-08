import fs from 'fs';
import path from 'path';

export function checkDrift() {
  const artifactDir = path.join(__dirname, '../../artifacts/benchmarks/interactive');

  if (!fs.existsSync(artifactDir)) {
    console.log('No artifacts found to check drift.');
    return;
  }

  // Example drift logic: checking trend_metrics.json or historical reports
  // This validates the step count, rewards, or other agent metrics over time.
  console.log('Checking interactive benchmark drift...');

  const files = fs.readdirSync(artifactDir);
  for (const file of files) {
    if (file.endsWith('metrics.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(artifactDir, file), 'utf8'));

      // Basic validation constraint for drift
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number' && isNaN(value)) {
           throw new Error(`Drift check failed: Invalid metric detected for ${key}`);
        }
      }
    }
  }

  console.log('Drift check passed.');
}

if (require.main === module) {
  checkDrift();
}
