import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { test } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');
const PREFLIGHT_SCRIPT = path.resolve(ROOT_DIR, 'scripts/release/preflight.ts');
const FIXTURES_DIR = path.resolve(ROOT_DIR, 'scripts/release/fixtures');

test('Preflight Offline Mode - Success Path', async (t) => {
  // Execute preflight in offline mode
  const result = spawnSync('npx', ['tsx', PREFLIGHT_SCRIPT, '--mode=offline', `--fixturesDir=${FIXTURES_DIR}`], {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
    env: { ...process.env, PATH: process.env.PATH }
  });

  if (result.status !== 0) {
    console.error('STDOUT:', result.stdout);
    console.error('STDERR:', result.stderr);
  }

  assert.strictEqual(result.status, 0, 'Exit code should be 0 for clean fixtures');
  assert.match(result.stdout, /Mode: offline/, 'Should report offline mode');

  // Verify evidence
  const evidenceMatch = result.stdout.match(/Output: (.*)/);
  assert.ok(evidenceMatch, 'Should output evidence path');
  const evidenceDir = evidenceMatch[1];

  assert.ok(fs.existsSync(path.join(evidenceDir, 'summary.json')), 'summary.json should exist');
  assert.ok(fs.existsSync(path.join(evidenceDir, 'summary.md')), 'summary.md should exist');
  assert.ok(fs.existsSync(path.join(evidenceDir, 'environment.json')), 'environment.json should exist');
  assert.ok(fs.existsSync(path.join(evidenceDir, 'workspace-scripts.json')), 'workspace-scripts.json should exist');

  const summary = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'summary.json'), 'utf8'));
  assert.strictEqual(summary.exitCode, 0);
  assert.strictEqual(summary.results.length, 7, 'Should have 7 stages');
});

test('Preflight Offline Mode - P0 Failure', async (t) => {
  // Create a temporary fixture with a failure
  const tempFixtures = path.join(FIXTURES_DIR, 'temp-p0');
  if (!fs.existsSync(tempFixtures)) fs.mkdirSync(tempFixtures);

  // Copy base fixtures
  fs.readdirSync(FIXTURES_DIR).forEach(f => {
    if (f.endsWith('.log') || f.endsWith('.json')) {
      fs.copyFileSync(path.join(FIXTURES_DIR, f), path.join(tempFixtures, f));
    }
  });

  // Inject failure
  fs.writeFileSync(path.join(tempFixtures, 'test.log'), 'FAIL: something went wrong\nERR_MODULE_NOT_FOUND');

  const result = spawnSync('npx', ['tsx', PREFLIGHT_SCRIPT, '--mode=offline', `--fixturesDir=${tempFixtures}`], {
    encoding: 'utf-8',
    cwd: ROOT_DIR
  });

  assert.strictEqual(result.status, 1, 'Exit code should be 1 for P0 failure');

  // Cleanup
  fs.rmSync(tempFixtures, { recursive: true, force: true });
});

test('Preflight Offline Mode - P1 Warning', async (t) => {
  // Create a temporary fixture with a P1 issue
  const tempFixtures = path.join(FIXTURES_DIR, 'temp-p1');
  if (!fs.existsSync(tempFixtures)) fs.mkdirSync(tempFixtures);

  // Copy base fixtures
  fs.readdirSync(FIXTURES_DIR).forEach(f => {
    if (f.endsWith('.log') || f.endsWith('.json')) {
      fs.copyFileSync(path.join(FIXTURES_DIR, f), path.join(tempFixtures, f));
    }
  });

  // Inject P1 signature
  fs.writeFileSync(path.join(tempFixtures, 'lint.log'), 'Error: Duplicate metric registered');

  const result = spawnSync('npx', ['tsx', PREFLIGHT_SCRIPT, '--mode=offline', `--fixturesDir=${tempFixtures}`], {
    encoding: 'utf-8',
    cwd: ROOT_DIR
  });

  assert.strictEqual(result.status, 2, 'Exit code should be 2 for P1 failure');

  // Cleanup
  fs.rmSync(tempFixtures, { recursive: true, force: true });
});
