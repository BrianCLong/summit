import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';

import {
  parseArgs,
  verifyBundleDirectory,
  verifyEvidenceStructure,
} from '../evidence-verify.mjs';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-verify-'));
  tempDirs.push(root);
  fs.mkdirSync(path.join(root, 'schemas'), { recursive: true });

  for (const fileName of [
    'report.schema.json',
    'metrics.schema.json',
    'stamp.schema.json',
    'index.schema.json',
  ]) {
    fs.writeFileSync(path.join(root, 'schemas', fileName), '{}\n');
  }

  fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({
    'EVD-WEEKLY20260206-GOV-001': ['report.json', 'metrics.json', 'stamp.json'],
  }));

  return root;
}

describe('evidence-verify', () => {
  test('parses CLI options', () => {
    const options = parseArgs([
      '--evidence-dir',
      'custom-evidence',
      '--bundle-dir',
      'bundle',
      '--enforce-weekly-evidence-ids',
    ]);

    assert.equal(options.evidenceDir, 'custom-evidence');
    assert.equal(options.bundleDir, 'bundle');
    assert.equal(options.enforceWeeklyEvidenceIds, true);
  });

  test('validates evidence structure and counts entries', () => {
    const evidenceDir = createFixture();

    const result = verifyEvidenceStructure({
      evidenceDir,
      enforceWeeklyEvidenceIds: true,
    });

    assert.equal(result.entries, 1);
  });


  test('supports envelope-style evidence index with items[]', () => {
    const evidenceDir = createFixture();
    fs.writeFileSync(path.join(evidenceDir, 'index.json'), JSON.stringify({
      version: 1,
      items: [
        {
          evidenceId: 'EVD-WEEKLY20260206-GOV-001',
          files: ['report.json', 'metrics.json', 'stamp.json'],
        },
      ],
    }));

    const result = verifyEvidenceStructure({ evidenceDir });
    assert.equal(result.entries, 1);
  });

  test('rejects malformed evidence index entries', () => {
    const evidenceDir = createFixture();
    fs.writeFileSync(path.join(evidenceDir, 'index.json'), JSON.stringify({
      'EVD-WEEKLY20260206-GOV-001': 'report.json',
    }));

    assert.throws(
      () =>
        verifyEvidenceStructure({
          evidenceDir,
        }),
      /entry must be string\[]/,
    );
  });

  test('rejects RFC3339 timestamps outside stamp.json in bundle mode', () => {
    const evidenceDir = createFixture();
    const bundleDir = path.join(evidenceDir, 'bundle');
    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(path.join(bundleDir, 'report.json'), JSON.stringify({ ts: '2026-02-06T20:07:00Z' }));
    fs.writeFileSync(path.join(bundleDir, 'metrics.json'), '{}');
    fs.writeFileSync(path.join(bundleDir, 'stamp.json'), JSON.stringify({ generatedAt: '2026-02-06T20:07:00Z' }));

    assert.throws(() => verifyBundleDirectory(bundleDir), /only stamp\.json may include timestamps/);
  });
});
