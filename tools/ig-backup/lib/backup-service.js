const fs = require('node:fs');
const path = require('node:path');
const { hashPayload, encryptSerialized, decryptSerialized } = require('./crypto');
const { readDatabase, writeDatabase } = require('./storage');

function assertInputPath(inputPath) {
  if (!inputPath) {
    throw new Error('The --input flag is required for restore operations.');
  }
}

function computeCaseHashes(cases, objects) {
  return cases.map((entry) => ({
    caseId: entry.id,
    hash: hashPayload({ case: entry, objects: objects.filter((obj) => obj.caseId === entry.id) }),
  }));
}

function buildCaseRefs(cases, objects) {
  return cases.map((entry) => ({
    caseId: entry.id,
    objectIds: objects.filter((obj) => obj.caseId === entry.id).map((obj) => obj.id),
  }));
}

function computeCaseRefHashes(caseRefs) {
  return caseRefs.map((entry) => ({
    caseId: entry.caseId,
    hash: hashPayload({
      caseId: entry.caseId,
      objectIds: entry.objectIds,
    }),
  }));
}

function selectDataForCases(snapshot, caseIds) {
  if (!caseIds?.length) {
    return snapshot;
  }
  const filteredCases = snapshot.cases.filter((c) => caseIds.includes(c.id));
  const filteredObjects = snapshot.objects.filter((o) => caseIds.includes(o.caseId));
  const filteredRefs = snapshot.caseRefs.filter((ref) => caseIds.includes(ref.caseId));
  return { cases: filteredCases, objects: filteredObjects, caseRefs: filteredRefs };
}

function createBackup({ dbPath, outputPath, passphrase, encrypt = true, caseIds = [], dryRun = false }) {
  const snapshot = readDatabase(dbPath);
  const normalizedRefs = snapshot.caseRefs.length ? snapshot.caseRefs : buildCaseRefs(snapshot.cases, snapshot.objects);
  const selected = selectDataForCases({ ...snapshot, caseRefs: normalizedRefs }, caseIds);
  const caseRefs = selected.caseRefs.length ? selected.caseRefs : buildCaseRefs(selected.cases, selected.objects);
  const caseRefsHash = hashPayload(caseRefs);
  const caseRefHashes = computeCaseRefHashes(caseRefs);
  const payload = {
    cases: selected.cases,
    objects: selected.objects,
    caseRefs,
  };
  const checksum = hashPayload(payload);
  const caseHashes = computeCaseHashes(payload.cases, payload.objects, payload.caseRefs);
  const backup = {
    kind: 'ig-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    checksum,
    counts: {
      cases: payload.cases.length,
      objects: payload.objects.length,
      caseRefs: payload.caseRefs.length,
    },
    hashes: {
      cases: caseHashes,
      caseRefs: caseRefHashes,
      caseRefsAggregate: caseRefsHash,
      payload: checksum,
    },
    data: payload,
  };
  const serialized = JSON.stringify(backup, null, 2);
  if (dryRun) {
    return { backup, saved: false, encrypted: encrypt, path: outputPath };
  }
  const content = encrypt ? encryptSerialized(serialized, passphrase) : backup;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));
  return { backup, saved: true, encrypted: encrypt, path: outputPath };
}

function loadBackup(inputPath, passphrase) {
  assertInputPath(inputPath);
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (raw.kind === 'ig-backup-encrypted') {
    if (!passphrase) {
      throw new Error('Encrypted backup requires a passphrase.');
    }
    const decrypted = decryptSerialized(raw, passphrase);
    return JSON.parse(decrypted);
  }
  return raw;
}

function validateBackup(backup) {
  if (backup.kind !== 'ig-backup') {
    throw new Error('Invalid backup format. Expected ig-backup payload.');
  }
  const recalculated = hashPayload(backup.data);
  if (recalculated !== backup.checksum) {
    throw new Error('Backup checksum mismatch; data may be corrupted or tampered with.');
  }
}

function restoreBackup({ dbPath, inputPath, passphrase, caseIds = [], dryRun = false }) {
  const backup = loadBackup(inputPath, passphrase);
  validateBackup(backup);
  const hydratedBackupRefs = backup.data.caseRefs.length
    ? backup.data.caseRefs
    : buildCaseRefs(backup.data.cases, backup.data.objects);
  const backupCaseRefHashes = backup.hashes?.caseRefs ?? computeCaseRefHashes(hydratedBackupRefs);
  const backupCaseRefsAggregate =
    backup.hashes?.caseRefsAggregate ?? hashPayload(hydratedBackupRefs);
  const selected = selectDataForCases({ ...backup.data, caseRefs: hydratedBackupRefs }, caseIds);
  const restorePayload = {
    cases: selected.cases,
    objects: selected.objects,
    caseRefs: selected.caseRefs.length ? selected.caseRefs : buildCaseRefs(selected.cases, selected.objects),
  };
  const restoreChecksum = hashPayload(restorePayload);
  const caseHashes = computeCaseHashes(restorePayload.cases, restorePayload.objects);
  const caseRefHashes = computeCaseRefHashes(restorePayload.caseRefs);
  const caseRefsAggregate = hashPayload(restorePayload.caseRefs);
  const summary = {
    dryRun,
    filtered: Boolean(caseIds?.length),
    counts: {
      cases: restorePayload.cases.length,
      objects: restorePayload.objects.length,
      caseRefs: restorePayload.caseRefs.length,
    },
    checksum: restoreChecksum,
    expectedChecksum: backup.checksum,
    checksumMatches: restoreChecksum === backup.checksum,
    caseHashes,
    caseRefHashes,
    caseRefsAggregate,
    expectedCaseRefsAggregate: backupCaseRefsAggregate,
  };
  if (!dryRun) {
    writeDatabase(dbPath, restorePayload);
  }
  const missingHashes = caseHashes.filter((entry) => {
    const expected = backup.hashes.cases.find((item) => item.caseId === entry.caseId);
    return !expected || expected.hash !== entry.hash;
  });
  if (missingHashes.length) {
    throw new Error(`Hash mismatch detected for cases: ${missingHashes.map((m) => m.caseId).join(', ')}`);
  }
  const missingCaseRefHashes = caseRefHashes.filter((entry) => {
    const expected = backupCaseRefHashes.find((item) => item.caseId === entry.caseId);
    return !expected || expected.hash !== entry.hash;
  });
  if (missingCaseRefHashes.length) {
    throw new Error(`Reference hash mismatch for cases: ${missingCaseRefHashes.map((m) => m.caseId).join(', ')}`);
  }
  if (!summary.filtered && backupCaseRefsAggregate && caseRefsAggregate !== backupCaseRefsAggregate) {
    throw new Error('Reference checksum mismatch; critical object references diverged from backup.');
  }
  return summary;
}

module.exports = {
  createBackup,
  restoreBackup,
  loadBackup,
  validateBackup,
};
