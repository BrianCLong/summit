#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const CONFIG_PATH = path.join(process.cwd(), 'ci/gate-ratchet.yml');
const REPORT_PATH = path.join(process.cwd(), 'dist/ci/gate-stability-report.json');

if (!fs.existsSync(REPORT_PATH)) {
  console.error('Stability report not found. Run analysis first.');
  process.exit(1);
}

const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as any;
const stats = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

console.log('# Gate Promotion Proposals\n');

let changesProposed = false;

for (const gate of config.gates) {
  if (gate.status === 'required') continue;

  const stat = stats[gate.id];
  if (!stat) {
    console.log(`- [SKIP] ${gate.id}: No data available.`);
    continue;
  }

  const criteria = gate.promotion_criteria;
  const meetsStreak = stat.consecutive_green >= criteria.min_consecutive_green;
  const meetsPassRate = stat.pass_rate_percent >= criteria.min_pass_rate_percent;
  const meetsFlake = stat.flake_retry_percent <= criteria.max_flake_retry_percent;
  const meetsDuration = stat.p95_duration_seconds <= criteria.max_duration_seconds_p95;

  if (meetsStreak && meetsPassRate && meetsFlake && meetsDuration) {
    console.log(`- [PROPOSE] ${gate.id}: Promoting to REQUIRED.`);
    console.log(`  - Streak: ${stat.consecutive_green} >= ${criteria.min_consecutive_green}`);
    console.log(`  - Pass Rate: ${stat.pass_rate_percent.toFixed(1)}% >= ${criteria.min_pass_rate_percent}%`);
    gate.status = 'required';
    changesProposed = true;
  } else {
    console.log(`- [KEEP] ${gate.id}: Not ready.`);
    if (!meetsStreak) console.log(`  - Streak: ${stat.consecutive_green} < ${criteria.min_consecutive_green}`);
    if (!meetsPassRate) console.log(`  - Pass Rate: ${stat.pass_rate_percent.toFixed(1)}% < ${criteria.min_pass_rate_percent}%`);
  }
}

if (changesProposed) {
  fs.writeFileSync(CONFIG_PATH, yaml.dump(config));
  console.log('\nUpdated ci/gate-ratchet.yml');
} else {
  console.log('\nNo changes proposed.');
}
