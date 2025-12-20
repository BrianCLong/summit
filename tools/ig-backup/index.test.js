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
  assert.strictEqual(restoreResult.counts.caseRefs, createResult.backup.counts.caseRefs);
  assert.ok(restoreResult.checksumMatches);

  const restoredData = readDatabase(restoreDb);
  assert.strictEqual(restoredData.cases.length, 2);
  assert.strictEqual(restoredData.objects.length, 3);
  assert.strictEqual(restoredData.caseRefs.length, 2);
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
  assert.strictEqual(restoreResult.counts.caseRefs, 1);
  assert.strictEqual(restoreResult.caseHashes.length, 1);
  assert.strictEqual(restoreResult.checksumMatches, false);

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

test('restore requires an explicit input path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const restoreDb = path.join(dir, 'restored.json');

  assert.throws(() => {
    restoreBackup({
      dbPath: restoreDb,
      inputPath: undefined,
    });
  }, /--input flag is required/);
});

test('cli dry-run create surfaces hashes without writing files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const backupPath = path.join(dir, 'backup.json');
  seedDatabase(dbPath);

  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(__dirname, 'index.js'),
    'backup',
    'create',
    '--db',
    dbPath,
    '--output',
    backupPath,
    '--dry-run',
    '--no-encrypt',
  ]);

  assert.strictEqual(result.status, 0);
  assert.ok(!fs.existsSync(backupPath));

  const parsed = JSON.parse(result.stdout.toString());
  assert.deepStrictEqual(parsed.counts, { cases: 2, objects: 3, caseRefs: 2 });
  assert.ok(parsed.checksum);
  assert.ok(Array.isArray(parsed.caseHashes));
  assert.ok(parsed.dryRun);
});

test('cli backup and restore round-trip keeps counts and hashes aligned', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-backup-'));
  const dbPath = path.join(dir, 'db.json');
  const restoreDb = path.join(dir, 'restored.json');
  const backupPath = path.join(dir, 'backup.json');
  const passphraseFile = path.join(dir, 'passphrase.txt');
  const passphrase = 'cli-passphrase-secret';

  fs.writeFileSync(passphraseFile, passphrase, 'utf8');
  seedDatabase(dbPath);

  const { spawnSync } = require('node:child_process');
  const create = spawnSync('node', [
    path.join(__dirname, 'index.js'),
    'backup',
    'create',
    '--db',
    dbPath,
    '--output',
    backupPath,
    '--passphrase-file',
    passphraseFile,
  ]);

  const createStdout = create.stdout.toString();
  assert.strictEqual(create.status, 0);
  assert.ok(fs.existsSync(backupPath));
  assert.ok(!createStdout.includes(passphrase));

  const created = JSON.parse(createStdout);
  assert.deepStrictEqual(created.counts, { cases: 2, objects: 3, caseRefs: 2 });

  const restore = spawnSync('node', [
    path.join(__dirname, 'index.js'),
    'backup',
    'restore',
    '--db',
    restoreDb,
    '--input',
    backupPath,
    '--passphrase-file',
    passphraseFile,
  ]);

  const restoreStdout = restore.stdout.toString();
  assert.strictEqual(restore.status, 0);
  assert.ok(!restoreStdout.includes(passphrase));

  const restoredSummary = JSON.parse(restoreStdout);
  assert.ok(restoredSummary.checksumMatches);
  assert.deepStrictEqual(restoredSummary.counts, created.counts);

  const restoredData = readDatabase(restoreDb);
  assert.strictEqual(restoredData.cases.length, 2);
  assert.strictEqual(restoredData.objects.length, 3);
  assert.strictEqual(restoredData.caseRefs.length, 2);
});
