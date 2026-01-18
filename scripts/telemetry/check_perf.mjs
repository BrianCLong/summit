import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Threshold: 20% regression
const THRESHOLD = 0.2;

const runId = process.env.RUN_ID || 'test-run';
const artifactDir = process.argv[2] || `artifacts/telemetry/${runId}`;
const ingestFile = path.join(artifactDir, 'ingest.json');

// Mock baseline data if no DB available
// In real world, this would query the SQLite DB or fetch a baseline artifact
let baseline = {
  jobs: {
    'build': 120,
    'test': 300,
    'lint': 45
  }
};

const baselineFile = path.join(artifactDir, 'baseline.json');
if (fs.existsSync(baselineFile)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    if (loaded && loaded.jobs) {
      baseline = loaded;
      console.log(`Loaded baseline from ${baselineFile}`);
    }
  } catch (e) {
    console.warn('Failed to parse baseline.json, using mock data.');
  }
}

if (!fs.existsSync(ingestFile)) {
  console.error(`Ingest file not found: ${ingestFile}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(ingestFile, 'utf8'));

let failed = false;

console.log('--- Performance Check ---');
data.jobs.forEach(job => {
  const base = baseline.jobs[job.name];
  if (base) {
    const diff = (job.duration_s - base) / base;
    const diffPct = (diff * 100).toFixed(1);

    if (diff > THRESHOLD) {
      console.error(`❌ Job '${job.name}' regressed by ${diffPct}% (${job.duration_s}s vs ${base}s)`);
      failed = true;
    } else {
      console.log(`✅ Job '${job.name}' is within limits (${diffPct}% change)`);
    }
  } else {
    console.log(`ℹ️ No baseline for job '${job.name}', skipping check.`);
  }
});

if (failed && process.env.CI_PERF_STRICT === 'true') {
  console.error('Performance gate failed.');
  process.exit(1);
} else if (failed) {
    console.warn('Performance regressions detected but strict mode is off.');
} else {
  console.log('Performance gate passed.');
}
