import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyEvidence } from '../../.github/scripts/verify-evidence.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function seedSchemas(targetDir) {
  const schemaDir = path.join(repoRoot, 'artifacts', 'evidence', 'schemas');
  const targetSchemaDir = path.join(targetDir, 'artifacts', 'evidence', 'schemas');
  fs.mkdirSync(targetSchemaDir, { recursive: true });
  for (const name of [
    'index.schema.json',
    'report.schema.json',
    'metrics.schema.json',
    'stamp.schema.json',
  ]) {
    fs.copyFileSync(
      path.join(schemaDir, name),
      path.join(targetSchemaDir, name),
    );
  }
}

function seedEvidence(targetDir, { includeTimestamp = false } = {}) {
  const baseDir = path.join(targetDir, 'artifacts', 'evidence');
  const evidenceId = 'EVD-SUMMIT-EVIDENCE-001';
  writeJson(path.join(baseDir, 'index.json'), {
    version: '1.0',
    evidence: [
      {
        id: evidenceId,
        area: 'evidence-system',
        files: [
          'artifacts/evidence/report.json',
          'artifacts/evidence/metrics.json',
          'artifacts/evidence/stamp.json',
        ],
      },
    ],
  });
  writeJson(path.join(baseDir, 'report.json'), {
    evidenceId,
    area: 'evidence-system',
    summary: 'Test report',
    details: includeTimestamp ? ['timestamp'] : ['ok'],
    ...(includeTimestamp ? { timestamp: '2026-02-08T00:00:00Z' } : {}),
  });
  writeJson(path.join(baseDir, 'metrics.json'), {
    evidenceId,
    verifierVersion: '1.0.0',
    counts: { files: 3 },
  });
  writeJson(path.join(baseDir, 'stamp.json'), {
    evidenceId,
    generatedAt: '2026-02-08T00:00:00Z',
    runId: 'test',
  });
}

test('verifyEvidence passes with valid evidence bundle', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-ok-'));
  seedSchemas(tempDir);
  seedEvidence(tempDir);
  assert.deepEqual(verifyEvidence({ rootDir: tempDir }), { ok: true });
});

test('verifyEvidence rejects timestamp fields outside stamp.json', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-bad-'));
  seedSchemas(tempDir);
  seedEvidence(tempDir, { includeTimestamp: true });
  assert.throws(() => verifyEvidence({ rootDir: tempDir }), {
    message: 'NONDETERMINISTIC_FIELD_OUTSIDE_STAMP',
  });
});
