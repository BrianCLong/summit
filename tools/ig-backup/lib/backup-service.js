const fs = require('node:fs');
const path = require('node:path');
const { hashPayload, encryptSerialized, decryptSerialized } = require('./crypto');
const { readDatabase, writeDatabase } = require('./storage');

function buildCaseRefs(cases, objects) {
  return cases.map((entry) => ({
    caseId: entry.id,
    objectIds: objects.filter((obj) => obj.caseId === entry.id).map((obj) => obj.id),
  }));
}

function computeCaseHashes(cases, objects) {
  return cases.map((entry) => ({
    caseId: entry.id,
    hash: hashPayload({ case: entry, objects: objects.filter((obj) => obj.caseId === entry.id) }),
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
  const payload = {
    cases: selected.cases,
    objects: selected.objects,
    caseRefs,
  };
  const checksum = hashPayload(payload);
  const caseHashes = computeCaseHashes(payload.cases, payload.objects);
  const backup = {
    kind: 'ig-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    checksum,
    counts: {
      cases: payload.cases.length,
      objects: payload.objects.length,
    },
    hashes: {
      cases: caseHashes,
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
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (raw.kind === 'ig-backup-encrypted') {
    if (!passphrase) {
      throw new Error('Encrypted backup requires a passphrase.');
    }
    const decrypted = decryptSerialized(raw, passphrase);
    return JSON.parse(decrypted);
  }
  if (raw.kind !== 'ig-backup') {
    throw new Error('Unsupported backup kind. Expected ig-backup or ig-backup-encrypted.');
  }
  return raw;
}

function validateBackup(backup) {
  if (backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }
  const recalculated = hashPayload(backup.data);
  if (recalculated !== backup.checksum) {
    throw new Error('Backup checksum mismatch; data may be corrupted or tampered with.');
  }
  const metadataCounts = backup.counts || {};
  if (
    metadataCounts.cases !== undefined &&
    metadataCounts.objects !== undefined &&
    (metadataCounts.cases !== backup.data.cases.length || metadataCounts.objects !== backup.data.objects.length)
  ) {
    throw new Error('Backup metadata counts do not align with payload contents.');
  }
}

function restoreBackup({ dbPath, inputPath, passphrase, caseIds = [], dryRun = false }) {
  const backup = loadBackup(inputPath, passphrase);
  validateBackup(backup);
  if (caseIds.length) {
    const missingRequested = caseIds.filter((id) => !backup.data.cases.some((c) => c.id === id));
    if (missingRequested.length) {
      throw new Error(`Requested case IDs not found in backup: ${missingRequested.join(', ')}`);
    }
  }
  const selected = selectDataForCases(backup.data, caseIds);
  const restorePayload = {
    cases: selected.cases,
    objects: selected.objects,
    caseRefs: selected.caseRefs.length ? selected.caseRefs : buildCaseRefs(selected.cases, selected.objects),
  };
  const restoreChecksum = hashPayload(restorePayload);
  const caseHashes = computeCaseHashes(restorePayload.cases, restorePayload.objects);
  const summary = {
    dryRun,
    filtered: Boolean(caseIds?.length),
    counts: {
      cases: restorePayload.cases.length,
      objects: restorePayload.objects.length,
    },
    checksum: restoreChecksum,
    expectedChecksum: backup.checksum,
    caseHashes,
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
  if (!summary.filtered && summary.checksum !== summary.expectedChecksum) {
    throw new Error('Restored payload checksum does not match backup checksum.');
  }
  return summary;
}

module.exports = {
  createBackup,
  restoreBackup,
  loadBackup,
  validateBackup,
};
