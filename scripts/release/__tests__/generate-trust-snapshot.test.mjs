import { test } from 'node:test';
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve('.');
const scriptPath = path.join(repoRoot, 'scripts', 'release', 'generate_trust_snapshot.ts');
const fixtureRoot = path.join(
  repoRoot,
  'scripts',
  'release',
  '__tests__',
  'fixtures',
  'trust-snapshot',
);
const bundleFixture = path.join(fixtureRoot, 'bundle');
const expectedDir = path.join(fixtureRoot, 'expected');

async function runGenerator(bundlePath, outDir, extraArgs = []) {
  const tsxPath = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
  const runner = await fs
    .access(tsxPath)
    .then(() => tsxPath)
    .catch(() => 'tsx');

  const args = [
    scriptPath,
    '--bundle',
    bundlePath,
    '--out-dir',
    outDir,
    '--metadata',
    path.join(bundlePath, 'bundle_metadata.json'),
    ...extraArgs,
  ];

  return execFileAsync(runner, args, { cwd: repoRoot });
}

test('generates deterministic trust snapshot from fixture bundle', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trust-snapshot-'));
  const bundleCopy = path.join(tempDir, 'bundle');
  const outputDir = path.join(tempDir, 'out');

  await fs.cp(bundleFixture, bundleCopy, { recursive: true });
  await runGenerator(bundleCopy, outputDir);

  const actualJson = await fs.readFile(path.join(outputDir, 'trust_snapshot.json'), 'utf8');
  const actualMd = await fs.readFile(path.join(outputDir, 'trust_snapshot.md'), 'utf8');
  const expectedJson = await fs.readFile(path.join(expectedDir, 'trust_snapshot.json'), 'utf8');
  const expectedMd = await fs.readFile(path.join(expectedDir, 'trust_snapshot.md'), 'utf8');

  assert.strictEqual(actualJson.trim(), expectedJson.trim());
  assert.strictEqual(actualMd.trim(), expectedMd.trim());
});

test('handles missing bundle sections with unknown defaults', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trust-snapshot-missing-'));
  const bundleDir = path.join(tempDir, 'bundle');
  const outputDir = path.join(tempDir, 'out');

  await fs.mkdir(bundleDir, { recursive: true });
  await fs.writeFile(
    path.join(bundleDir, 'bundle_metadata.json'),
    JSON.stringify({ git_sha: 'unknown', workflow_run_id: 'unknown', generated_at_utc: 'unknown' }),
  );

  await runGenerator(bundleDir, outputDir);

  const snapshot = JSON.parse(
    await fs.readFile(path.join(outputDir, 'trust_snapshot.json'), 'utf8'),
  );

  assert.strictEqual(snapshot.ga_gate.status, 'unknown');
  assert.strictEqual(snapshot.smoke.status, 'unknown');
  assert.strictEqual(snapshot.sbom.package_count, 0);
  assert.strictEqual(snapshot.reproducible_build.status, 'unknown');
});

test('fails redaction scan when notes contain restricted data', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trust-snapshot-redaction-'));
  const bundleDir = path.join(tempDir, 'bundle');
  const outputDir = path.join(tempDir, 'out');

  await fs.mkdir(bundleDir, { recursive: true });
  await fs.writeFile(
    path.join(bundleDir, 'bundle_metadata.json'),
    JSON.stringify({ git_sha: 'unknown', workflow_run_id: 'unknown', generated_at_utc: 'unknown' }),
  );

  await assert.rejects(
    runGenerator(bundleDir, outputDir, ['--notes', 'Contact: user@example.com']),
    /Disallowed content detected/i,
  );
});
