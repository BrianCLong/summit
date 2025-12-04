#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT = path.join(process.cwd(), 'artifacts', 'axe-report.json');

function fail(message) {
  console.error(`\n❌  A11y gate failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(ARTIFACT)) {
  fail('No axe artifact found at artifacts/axe-report.json. Run `pnpm test` first.');
}

const report = JSON.parse(fs.readFileSync(ARTIFACT, 'utf8'));
const critical = report.violations?.filter((v) => v.impact === 'critical') ?? [];
if (critical.length) {
  fail(`Found ${critical.length} critical violations: ${critical.map((c) => c.id).join(', ')}`);
}

const colorContrast = report.violations?.filter((v) => v.id === 'color-contrast') ?? [];
if (colorContrast.length > 2) {
  fail(`Contrast budget exceeded (${colorContrast.length} > 2).`);
}

console.log('✅ A11y gate passed with zero critical violations.');
