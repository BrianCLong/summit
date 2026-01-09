#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const DRILL_DIR = 'artifacts/incidents/drills';
const DASHBOARD_PATH = 'artifacts/risk/RISK_INCIDENT_DASHBOARD.md';

function main() {
  console.log('Generating Risk & Incident Dashboard...');

  if (!fs.existsSync(DRILL_DIR)) {
    console.log('No drill artifacts found.');
    return;
  }

  const files = fs.readdirSync(DRILL_DIR).filter(f => f.endsWith('.json'));
  const drills = files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(DRILL_DIR, f), 'utf8'));
    } catch (e) {
      return null;
    }
  }).filter(Boolean).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const stats = {
    total: drills.length,
    passed: drills.filter(d => d.outcome === 'pass').length,
    failed: drills.filter(d => d.outcome === 'fail').length,
    avgTTD: 0,
    avgTTR: 0
  };

  const ttds = drills.filter(d => d.timings.ttd_seconds).map(d => d.timings.ttd_seconds);
  const ttrs = drills.filter(d => d.timings.ttr_seconds).map(d => d.timings.ttr_seconds);

  if (ttds.length) stats.avgTTD = (ttds.reduce((a, b) => a + b, 0) / ttds.length).toFixed(2);
  if (ttrs.length) stats.avgTTR = (ttrs.reduce((a, b) => a + b, 0) / ttrs.length).toFixed(2);

  const markdown = `
# Risk & Incident Dashboard

**Generated:** ${new Date().toISOString()}

## Incident Drills Summary
*   **Total Drills:** ${stats.total}
*   **Pass Rate:** ${((stats.passed / stats.total) * 100).toFixed(1)}%
*   **Avg Time to Detect (TTD):** ${stats.avgTTD}s
*   **Avg Time to Recover (TTR):** ${stats.avgTTR}s

## Recent Drills

| Date | Scenario | Mode | Outcome | TTD | TTR |
| :--- | :--- | :--- | :--- | :--- | :--- |
${drills.slice(0, 10).map(d => `| ${d.timestamp.split('T')[0]} | ${d.scenario} | ${d.mode} | ${d.outcome === 'pass' ? '✅' : '❌'} | ${d.timings.ttd_seconds || '-'}s | ${d.timings.ttr_seconds || '-'}s |`).join('\n')}

## Risk Profile (Placeholder)
*High risk change statistics would go here based on CI logs.*
`;

  // Ensure artifacts/risk exists
  if (!fs.existsSync('artifacts/risk')) {
    fs.mkdirSync('artifacts/risk', { recursive: true });
  }

  fs.writeFileSync(DASHBOARD_PATH, markdown);
  console.log(`Dashboard generated at ${DASHBOARD_PATH}`);
}

main();
