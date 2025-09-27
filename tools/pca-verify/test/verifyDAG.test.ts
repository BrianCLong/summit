import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { verifyDAG } from '../src/index.js';
import type { Fixtures, Manifest } from '../src/types.js';

const packageRoot = resolve('.');
const manifestPath = resolve(packageRoot, 'test/fixtures/golden-manifest.json');
const fixturesPath = resolve(packageRoot, 'test/fixtures/golden-fixtures.json');

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
}

function loadFixtures(): Fixtures {
  return JSON.parse(readFileSync(fixturesPath, 'utf8')) as Fixtures;
}

test('verifyDAG returns match verdict for untampered bundle', () => {
  const manifest = loadManifest();
  const fixtures = loadFixtures();
  const result = verifyDAG(manifest, fixtures);

  assert.equal(result.verdict, 'match');
  assert.equal(result.checksumFailures.length, 0);
  assert.equal(result.variances.length, 1);
  assert.ok(result.variances[0]?.withinTolerance);
  assert.equal(result.failureLog.length, 0);
});

test('verifyDAG flags tampered checksum', () => {
  const manifest = loadManifest();
  const fixtures = loadFixtures();
  manifest.checksumTree['outputs/score'] = '0'.repeat(64);

  const result = verifyDAG(manifest, fixtures);

  assert.equal(result.verdict, 'error');
  assert.ok(result.checksumFailures.some((failure) => failure.artifact === 'outputs/score'));
  assert.ok(result.failureLog.some((entry) => entry.includes('Checksum mismatch')));
});

test('CLI emits failure log and exit codes', () => {
  const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  const manifest = loadManifest();
  const workingDir = mkdtempSync(join(tmpdir(), 'pca-verify-'));
  const manifestCopy = join(workingDir, 'manifest.json');
  const tamperedPath = join(workingDir, 'manifest-tampered.json');
  const failureLogPath = join(workingDir, 'failures.log');

  writeFileSync(manifestCopy, JSON.stringify(manifest, null, 2));
  const ok = spawnSync('node', [cliPath, '--manifest', manifestCopy, '--fixtures', fixturesPath], {
    cwd: packageRoot,
    encoding: 'utf8'
  });
  assert.equal(ok.status, 0, ok.stderr || ok.stdout);

  const tampered = structuredClone(manifest);
  tampered.checksumTree['outputs/score'] = '0'.repeat(64);
  writeFileSync(tamperedPath, JSON.stringify(tampered, null, 2));

  const fail = spawnSync(
    'node',
    [
      cliPath,
      '--manifest',
      tamperedPath,
      '--fixtures',
      fixturesPath,
      '--failure-log',
      failureLogPath
    ],
    { cwd: packageRoot, encoding: 'utf8' }
  );

  assert.notEqual(fail.status, 0);
  const logContent = JSON.parse(readFileSync(failureLogPath, 'utf8')) as {
    failureLog: string[];
    checksumFailures: unknown[];
  };
  assert.ok(Array.isArray(logContent.failureLog));
  assert.ok(logContent.failureLog.length > 0);
  assert.ok(Array.isArray(logContent.checksumFailures));
  assert.ok(logContent.checksumFailures.length > 0);
});
