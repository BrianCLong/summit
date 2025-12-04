import fs from 'fs';
import path from 'path';

const METRICS_DIR = path.join(process.cwd(), 'ci-metrics');
const REPORT_FILE = 'regression-report.json';

let metrics = [];
let regressions = [];

if (fs.existsSync(METRICS_DIR)) {
  fs.readdirSync(METRICS_DIR).forEach(file => {
    if (file.endsWith('.json')) {
      metrics.push(JSON.parse(fs.readFileSync(path.join(METRICS_DIR, file), 'utf8')));
    }
  });
}

if (fs.existsSync(REPORT_FILE)) {
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  regressions = report.regressions || [];
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (!summaryPath) {
  console.log('Not running in GitHub Actions, skipping summary generation.');
  process.exit(0);
}

let md = '# 🛡️ Pipeline Health Dashboard\n\n';

// Health Overview
const failed = metrics.filter(m => m.status === 'FAILURE');
const flaked = metrics.filter(m => m.attempts > 1 && m.status === 'SUCCESS');

md += '## 🏥 Health Status\n';
if (failed.length === 0 && regressions.length === 0 && flaked.length === 0) {
  md += '✅ **All Systems Nominal**\n\n';
} else {
  if (failed.length > 0) md += `🔴 **${failed.length} Failures**\n`;
  if (flaked.length > 0) md += `⚠️ **${flaked.length} Flakes Recovered**\n`;
  if (regressions.length > 0) md += `🐢 **${regressions.length} Performance Regressions**\n`;
  md += '\n';
}

// Regression Table
if (regressions.length > 0) {
  md += '## 🐢 Performance Regressions\n';
  md += '| Step | Current (ms) | Baseline (ms) | Drift |\n';
  md += '|---|---|---|---|\n';
  regressions.forEach(r => {
    md += `| ${r.name} | ${r.current} | ${r.baseline} | 🔻 +${r.percent}% |\n`;
  });
  md += '\n';
}

// Execution Stats
md += '## ⏱️ Execution Metrics\n';
md += '| Step | Status | Duration | Retries | Category |\n';
md += '|---|---|---|---|---|\n';
metrics.forEach(m => {
  const icon = m.status === 'SUCCESS' ? '✅' : '❌';
  md += `| ${m.name} | ${icon} ${m.status} | ${(m.duration / 1000).toFixed(2)}s | ${m.attempts - 1} | ${m.category} |\n`;
});

fs.appendFileSync(summaryPath, md);
