import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.join(scriptDir, '..'));
const backupScript = path.join(repoRoot, 'backup.sh');
const restoreScript = path.join(repoRoot, 'restore.sh');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(scriptPath, args, env = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, ...env }
  });
}

test('backup script exits non-zero on unknown arguments', () => {
  const result = runScript(backupScript, ['--unknown']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /Unknown argument/);
});

test('backup script dry-run emits plan without requiring secrets', () => {
  const result = runScript(backupScript, ['--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /DRY RUN/);
  assert.match(result.stdout, /PostgreSQL dump hook/);
});

test('restore script dry-run validates input and reports actions', () => {
  withTempDir((dir) => {
    const backupId = 'conductor-backup-test';
    const backupDir = path.join(dir, backupId);
    fs.mkdirSync(backupDir);
    const result = runScript(restoreScript, ['--dry-run', backupId], { BACKUP_BASE: dir });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /DRY RUN/);
    assert.match(result.stdout, /Validated backup directory/);
    assert.match(result.stdout, /PostgreSQL restore hook/);
  });
});

test('restore script fails when backup id is missing', () => {
  const result = runScript(restoreScript, []);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /Backup ID required/);
});
