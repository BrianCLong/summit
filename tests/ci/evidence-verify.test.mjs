import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { verifyEvidenceBundles } from '../../.github/scripts/evidence-verify.mjs';

const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const buildFixture = async ({ reportOverrides = {}, metricsOverrides = {}, policyOverrides = {} } = {}) => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-verify-'));
  const bundleDir = path.join(rootDir, 'evidence/bundles/TEST-BUNDLE');

  const report = {
    evidence_id: 'EVD-CLAUDE-OBSIDIAN-TEST-001',
    item: 'fixture',
    summary: 'Fixture report',
    artifacts: ['metrics.json', 'stamp.json'],
    policy: {
      mode: 'read_only',
      write_enabled: false,
      ...policyOverrides,
    },
    ...reportOverrides,
  };
  const metrics = {
    docs_scanned: 0,
    docs_emitted: 0,
    excluded_paths: 0,
    duration_ms: 0,
    ...metricsOverrides,
  };
  const stamp = {
    generated_at: '2026-02-07T00:00:00Z',
    tool_version: 'summit-evidence-0.1.0',
  };

  await writeJson(path.join(bundleDir, 'report.json'), report);
  await writeJson(path.join(bundleDir, 'metrics.json'), metrics);
  await writeJson(path.join(bundleDir, 'stamp.json'), stamp);

  const index = {
    version: 1,
    items: [
      {
        evidence_id: 'EVD-CLAUDE-OBSIDIAN-TEST-001',
        files: {
          report: 'evidence/bundles/TEST-BUNDLE/report.json',
          metrics: 'evidence/bundles/TEST-BUNDLE/metrics.json',
          stamp: 'evidence/bundles/TEST-BUNDLE/stamp.json',
        },
      },
    ],
  };

  await writeJson(path.join(rootDir, 'evidence/index.json'), index);

  return rootDir;
};

test('verifyEvidenceBundles passes for valid bundle', async () => {
  const rootDir = await buildFixture();
  const result = await verifyEvidenceBundles({ rootDir });
  assert.equal(result.bundlesChecked, 1);
});

test('verifyEvidenceBundles fails on timestamp leak in report', async () => {
  const rootDir = await buildFixture({
    reportOverrides: { note: '2026-02-07T01:00:00Z' },
  });
  await assert.rejects(() => verifyEvidenceBundles({ rootDir }), /timestamp leak/);
});

test('verifyEvidenceBundles fails when write_enabled true', async () => {
  const rootDir = await buildFixture({
    policyOverrides: { write_enabled: true },
  });
  await assert.rejects(() => verifyEvidenceBundles({ rootDir }), /write_enabled/);
});
