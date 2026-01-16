import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/ci/verify_governance_docs.mjs');

async function setupRepo({ missingHeader = false } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gov-docs-'));
  const docsDir = path.join(tempDir, 'docs', 'governance');
  await fs.mkdir(docsDir, { recursive: true });

  const policy = [
    'required_headers:',
    '  - Owner',
    '  - Last-Reviewed',
    '  - Evidence-IDs',
    '  - Status',
    'allowed_status:',
    '  - active',
    'index_file: docs/governance/INDEX.md',
    'max_days_since_reviewed: 365',
    'report_out_dir: artifacts/governance/docs-integrity/${sha}',
    ''
  ].join('\n');

  await fs.writeFile(path.join(tempDir, 'docs', 'governance', 'DOCS_POLICY.yml'), policy, 'utf8');

  const headers = [
    'Owner: Governance',
    missingHeader ? 'Last-Reviewed: 2026-01-01' : 'Last-Reviewed: 2026-01-01',
    missingHeader ? '' : 'Evidence-IDs: sample',
    'Status: active',
    ''
  ].filter(Boolean);

  const docBody = [...headers, '# Sample Doc', ''].join('\n');
  await fs.writeFile(path.join(docsDir, 'SAMPLE.md'), docBody, 'utf8');

  const indexBody = [
    'Owner: Governance',
    'Last-Reviewed: 2026-01-01',
    'Evidence-IDs: index',
    'Status: active',
    '',
    '# Index',
    '',
    '- [Sample](SAMPLE.md)',
    ''
  ].join('\n');
  await fs.writeFile(path.join(docsDir, 'INDEX.md'), indexBody, 'utf8');

  return tempDir;
}

test('governance docs verifier passes with valid headers', async () => {
  const tempDir = await setupRepo();
  const outDir = path.join(tempDir, 'artifacts', 'governance', 'docs-integrity', 'test');
  const result = spawnSync('node', [
    SCRIPT_PATH,
    '--policy',
    'docs/governance/DOCS_POLICY.yml',
    '--out',
    outDir,
    '--sha',
    'test'
  ], { cwd: tempDir, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const reportPath = path.join(outDir, 'report.json');
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  assert.equal(report.status, 'pass');
});

test('governance docs verifier fails on missing headers', async () => {
  const tempDir = await setupRepo({ missingHeader: true });
  const outDir = path.join(tempDir, 'artifacts', 'governance', 'docs-integrity', 'test');
  const result = spawnSync('node', [
    SCRIPT_PATH,
    '--policy',
    'docs/governance/DOCS_POLICY.yml',
    '--out',
    outDir,
    '--sha',
    'test'
  ], { cwd: tempDir, encoding: 'utf8' });

  assert.equal(result.status, 1);
  const reportPath = path.join(outDir, 'report.json');
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  assert.equal(report.status, 'fail');
  assert.ok(report.violations.length > 0);
});
