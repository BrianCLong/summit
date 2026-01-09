import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Ajv from 'ajv';
import { enforceDenylist, summarizeDurations } from '../lib/release-metrics.mjs';

const loadFixture = (name) =>
  JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        'scripts/release/__tests__/fixtures/release-metrics',
        name,
      ),
      'utf-8',
    ),
  );

const writeJsonl = (entries, filePath) => {
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n');
  fs.writeFileSync(filePath, `${content}\n`);
};

test('summarizeDurations returns p50/p95', () => {
  const stats = summarizeDurations([10, 20, 30, 40, 50]);
  assert.equal(stats.p50, 30);
  assert.equal(stats.p95, 50);
});

test('enforceDenylist fails closed on URLs', () => {
  assert.throws(() => enforceDenylist({ url: 'https://internal.example' }));
});

test('schema validation passes for fixture entries', () => {
  const [entry] = loadFixture('green-week.json');
  const schema = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'schemas/release-metrics.schema.json'), 'utf-8'),
  );
  const ajv = new Ajv({ allErrors: true, strict: false, meta: false });
  const schemaWithoutMeta = { ...schema };
  delete schemaWithoutMeta.$schema;
  const validate = ajv.compile(schemaWithoutMeta);
  const valid = validate(entry);
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test('weekly report computes availability and regressions', () => {
  const entries = loadFixture('regression-week.json');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-slo-'));
  const metricsPath = path.join(tempDir, 'metrics.jsonl');
  const outputDir = path.join(tempDir, 'report');
  writeJsonl(entries, metricsPath);

  execFileSync('node', [
    'scripts/release/generate_release_slo_report.mjs',
    '--metrics-path',
    metricsPath,
    '--output-dir',
    outputDir,
    '--slo-config',
    'release/RELEASE_SLO.yml',
    '--days',
    '7',
    '--now',
    '2026-01-15T12:00:00Z',
  ]);

  const report = JSON.parse(
    fs.readFileSync(path.join(outputDir, 'weekly-report.json'), 'utf-8'),
  );

  assert.ok(report.summary.availability_ratio > 0.99);
  const regression = report.summary.regressions.find((item) => item.name === 'lint');
  assert.ok(regression);
  assert.ok(regression.p95_delta > 0);
});

test('weekly report captures flake rate', () => {
  const entries = loadFixture('intermittent-week.json');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-slo-'));
  const metricsPath = path.join(tempDir, 'metrics.jsonl');
  const outputDir = path.join(tempDir, 'report');
  writeJsonl(entries, metricsPath);

  execFileSync('node', [
    'scripts/release/generate_release_slo_report.mjs',
    '--metrics-path',
    metricsPath,
    '--output-dir',
    outputDir,
    '--slo-config',
    'release/RELEASE_SLO.yml',
    '--days',
    '7',
    '--now',
    '2026-01-15T12:00:00Z',
  ]);

  const report = JSON.parse(
    fs.readFileSync(path.join(outputDir, 'weekly-report.json'), 'utf-8'),
  );
  assert.ok(report.summary.flake_rate_average > 0);
});
