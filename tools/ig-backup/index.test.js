const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createBackup, restoreBackup } = require('./lib/backup-service');
const { writeDatabase, readDatabase } = require('./lib/storage');

function seedDatabase(dbPath) {
  writeDatabase(dbPath, {
    cases: [
      { id: 'CASE-1', name: 'Alpha' },
      { id: 'CASE-2', name: 'Bravo' },
    ],
    objects: [
      { id: 'OBJ-1', caseId: 'CASE-1', type: 'note', value: 'a' },
      { id: 'OBJ-2', caseId: 'CASE-1', type: 'evidence', value: 'b' },
      { id: 'OBJ-3', caseId: 'CASE-2', type: 'note', value: 'c' },
    ],
    caseRefs: [],
  });
}

test('backup and restore round-trip with encryption and checksum validation', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const restoreDb = path.join(dir, 'restored.json');
  const backupPath = path.join(dir, 'backup.json');
  const passphrase = 'unit-test-passphrase';

  seedDatabase(dbPath);
  const createResult = createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase,
    encrypt: true,
  });

  assert.ok(createResult.saved);
  assert.ok(fs.existsSync(backupPath));

  const restoreResult = restoreBackup({
    dbPath: restoreDb,
    inputPath: backupPath,
    passphrase,
  });

  assert.strictEqual(restoreResult.expectedChecksum, createResult.backup.checksum);
  assert.strictEqual(restoreResult.counts.cases, createResult.backup.counts.cases);
  assert.strictEqual(restoreResult.counts.objects, createResult.backup.counts.objects);

  const restoredData = readDatabase(restoreDb);
  assert.strictEqual(restoredData.cases.length, 2);
  assert.strictEqual(restoredData.objects.length, 3);
});

test('partial restore limits to selected case and preserves hashes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const restoreDb = path.join(dir, 'restored.json');
  const backupPath = path.join(dir, 'backup.json');

  seedDatabase(dbPath);
  const createResult = createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase: null,
    encrypt: false,
  });

  const restoreResult = restoreBackup({
    dbPath: restoreDb,
    inputPath: backupPath,
    caseIds: ['CASE-1'],
  });

  assert.ok(restoreResult.filtered);
  assert.strictEqual(restoreResult.counts.cases, 1);
  assert.strictEqual(restoreResult.counts.objects, 2);
  assert.strictEqual(restoreResult.caseHashes.length, 1);

  const restoredData = readDatabase(restoreDb);
  assert.deepStrictEqual(restoredData.cases.map((c) => c.id), ['CASE-1']);
  assert.strictEqual(restoredData.objects.length, 2);

  const expectedCaseHash = createResult.backup.hashes.cases.find((c) => c.caseId === 'CASE-1').hash;
  assert.strictEqual(restoreResult.caseHashes[0].hash, expectedCaseHash);
});

test('checksum validation blocks tampered backups', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const backupPath = path.join(dir, 'backup.json');

  seedDatabase(dbPath);
  createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase: null,
    encrypt: false,
  });

  const tampered = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  tampered.data.cases[0].name = 'tampered';
  fs.writeFileSync(backupPath, JSON.stringify(tampered, null, 2));

  assert.throws(() => {
    restoreBackup({
      dbPath: path.join(dir, 'restored.json'),
      inputPath: backupPath,
    });
  });
});

test('dry-run restore does not mutate target database', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const backupPath = path.join(dir, 'backup.json');
  const restoreDb = path.join(dir, 'restored.json');

  seedDatabase(dbPath);
  createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase: null,
    encrypt: false,
  });

  const summary = restoreBackup({
    dbPath: restoreDb,
    inputPath: backupPath,
    dryRun: true,
  });

  assert.ok(summary.dryRun);
  assert.ok(!fs.existsSync(restoreDb));
});

test('dry-run create skips writing backup file but returns metadata', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const backupPath = path.join(dir, 'backup.json');

  seedDatabase(dbPath);
  const result = createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase: 'ignored',
    encrypt: true,
    dryRun: true,
  });

  assert.ok(!result.saved);
  assert.strictEqual(result.backup.counts.cases, 2);
  assert.strictEqual(result.backup.counts.objects, 3);
  assert.ok(!fs.existsSync(backupPath));
});

test('restore rejects requests for unknown case IDs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const backupPath = path.join(dir, 'backup.json');

  seedDatabase(dbPath);
  createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase: null,
    encrypt: false,
  });

  assert.throws(() => {
    restoreBackup({
      dbPath: path.join(dir, 'restored.json'),
      inputPath: backupPath,
      caseIds: ['CASE-3'],
    });
  });
});

test('restore fails when backup metadata counts are tampered', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const backupPath = path.join(dir, 'backup.json');

  seedDatabase(dbPath);
  createBackup({
    dbPath,
    outputPath: backupPath,
    passphrase: null,
    encrypt: false,
  });

  const tampered = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  tampered.counts.cases = 999;
  fs.writeFileSync(backupPath, JSON.stringify(tampered, null, 2));

  assert.throws(() => {
    restoreBackup({
      dbPath: path.join(dir, 'restored.json'),
      inputPath: backupPath,
    });
  });
});
