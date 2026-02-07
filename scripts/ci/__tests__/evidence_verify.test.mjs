import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function runVerify({ rootDir, indexPath }) {
  execFileSync(
    'node',
    [
      '--import',
      'tsx/esm',
      '.github/scripts/evidence_verify.ts',
      '--root',
      rootDir,
      '--index',
      indexPath,
    ],
    { stdio: 'pipe' },
  );
}

test('evidence_verify passes with clean report', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-pass-'));
  const reportPath = path.join(rootDir, 'report.json');
  const metricsPath = path.join(rootDir, 'metrics.json');
  const stampPath = path.join(rootDir, 'stamp.json');
  writeJson(reportPath, { summary: 'ok' });
  writeJson(metricsPath, { metrics: { score: 1 } });
  writeJson(stampPath, { timestamp: '2026-02-07T00:00:00Z' });

  const indexPath = path.join(rootDir, 'index.json');
  writeJson(indexPath, {
    version: 1,
    items: [
      {
        evidence_id: 'EVD-TEST-001',
        files: {
          report: 'report.json',
          metrics: 'metrics.json',
          stamp: 'stamp.json',
        },
      },
    ],
  });

  assert.doesNotThrow(() =>
    runVerify({ rootDir, indexPath: indexPath }),
  );
});

test('evidence_verify fails when report includes timestamp strings', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-fail-'));
  const reportPath = path.join(rootDir, 'report.json');
  const metricsPath = path.join(rootDir, 'metrics.json');
  const stampPath = path.join(rootDir, 'stamp.json');
  writeJson(reportPath, { summary: '2026-02-07T00:00:00Z' });
  writeJson(metricsPath, { metrics: { score: 1 } });
  writeJson(stampPath, { timestamp: '2026-02-07T00:00:00Z' });

  const indexPath = path.join(rootDir, 'index.json');
  writeJson(indexPath, {
    version: 1,
    items: [
      {
        evidence_id: 'EVD-TEST-002',
        files: {
          report: 'report.json',
          metrics: 'metrics.json',
          stamp: 'stamp.json',
        },
      },
    ],
  });

  assert.throws(() => runVerify({ rootDir, indexPath: indexPath }));
});
