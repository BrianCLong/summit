#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildCalibrationReport,
  renderCalibrationMarkdown,
} from '../../packages/maestro-core/src/confidence/calibrationReport.js';
import { validateConfidenceReport } from '../../packages/maestro-core/src/confidence/ConfidenceReport.js';

const OUTPUT_DIR = resolve(process.cwd(), 'artifacts', 'calibration');
const JSON_PATH = resolve(OUTPUT_DIR, 'calibration_report.json');
const MD_PATH = resolve(OUTPUT_DIR, 'calibration_report.md');

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function main(): void {
  const report = buildCalibrationReport(new Date('2026-01-14T00:00:00Z'));
  const markdown = renderCalibrationMarkdown(report);

  const schemaErrors = report.scenarios.flatMap((scenario) =>
    validateConfidenceReport(scenario.report).map(
      (error) => `${scenario.id}: ${error}`,
    ),
  );

  if (schemaErrors.length > 0) {
    console.error('ConfidenceReport schema validation failed:');
    schemaErrors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  const evidenceScenario = report.scenarios.find(
    (scenario) => scenario.id === 'evidence-noise',
  );
  if (!evidenceScenario || !evidenceScenario.cap_applied) {
    console.error('Expected evidence-noise scenario to apply confidence cap.');
    process.exit(1);
  }

  ensureDir(dirname(JSON_PATH));
  writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(MD_PATH, markdown, 'utf8');

  console.log(`Calibration report written to ${JSON_PATH}`);
  console.log(`Calibration report written to ${MD_PATH}`);
}

main();
