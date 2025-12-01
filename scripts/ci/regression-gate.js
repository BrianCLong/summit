import fs from 'fs';
import path from 'path';

const METRICS_DIR = path.join(process.cwd(), 'ci-metrics');
const BASELINE_FILE = path.join(process.cwd(), 'ci-metrics-baseline.json');

// Load current metrics
const currentMetrics = {};
if (fs.existsSync(METRICS_DIR)) {
  fs.readdirSync(METRICS_DIR).forEach(file => {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(METRICS_DIR, file), 'utf8'));
      currentMetrics[data.name] = data;
    }
  });
}

// Load baseline
let baseline = {};
if (fs.existsSync(BASELINE_FILE)) {
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch (e) {
    console.warn('Failed to parse baseline metrics');
  }
}

const regressions = [];
const THRESHOLD_PERCENT = 20;

for (const [name, curr] of Object.entries(currentMetrics)) {
  if (curr.status === 'FAILURE') continue;
  const base = baseline[name];
  if (base) {
    const diff = curr.duration - base.duration;
    const percent = (diff / base.duration) * 100;

    if (percent > THRESHOLD_PERCENT && diff > 5000) { // Only valid if diff > 5s
      regressions.push({
        name,
        current: curr.duration,
        baseline: base.duration,
        percent: percent.toFixed(1)
      });
    }
  }
}

// Generate Report
const report = {
  regressions,
  metrics: currentMetrics
};

fs.writeFileSync('regression-report.json', JSON.stringify(report, null, 2));
// Also save flattened metrics for next baseline
fs.writeFileSync('ci-metrics-new.json', JSON.stringify(currentMetrics, null, 2));

if (regressions.length > 0) {
  console.log('::warning::Performance Regressions Detected:');
  regressions.forEach(r => {
    console.log(`- ${r.name}: ${r.current}ms vs ${r.baseline}ms (+${r.percent}%)`);
  });
}
