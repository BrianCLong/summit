import { canonicalString } from './canonicalize.js';
import { hashJson } from './hash.js';
import { signPayload, verifyPayload } from './signing.js';

export interface LedgerPublicKey {
  keyId: string;
  algorithm: 'ed25519';
  publicKey: string;
}

export interface LedgerEntryPayload {
  sequence: number;
  claimId: string;
  entityId: string;
  evidenceId: string;
  stage: string;
  contentHash: string;
  actor: string;
  timestamp: string;
  prevHash: string | null;
  signingKeyId: string;
  artifactUri?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerEntry extends LedgerEntryPayload {
  hash: string;
  signature: string;
}

export interface LedgerFile {
  version: string;
  ledgerId: string;
  description?: string;
  publicKeys: LedgerPublicKey[];
  entries: LedgerEntry[];
  rootHash: string;
}

export interface LedgerAppendInput {
  claimId: string;
  entityId: string;
  evidenceId: string;
  stage: string;
  contentHash: string;
  actor: string;
  signingKeyId: string;
  timestamp?: string;
  artifactUri?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerVerificationResult {
  valid: boolean;
  errors: string[];
  rootHash: string;
  entryCount: number;
}

function omitUndefined(payload: LedgerEntryPayload): LedgerEntryPayload {
  const clone: LedgerEntryPayload = { ...payload };
  if (!clone.artifactUri) {
    delete clone.artifactUri;
  }
  if (!clone.metadata || Object.keys(clone.metadata).length === 0) {
    delete clone.metadata;
  }
  return clone;
}

function entryToPayload(entry: LedgerEntry): LedgerEntryPayload {
  const { hash: _hash, signature: _sig, ...payload } = entry;
  return omitUndefined(payload);
}

export function appendLedgerEntry(
  ledger: LedgerFile,
  input: LedgerAppendInput,
  privateKeyPem: string | Buffer,
): LedgerEntry {
  const sequence = ledger.entries.length + 1;
  const prevHash = ledger.entries.length > 0 ? ledger.entries[ledger.entries.length - 1].hash : null;
  const timestamp = input.timestamp ?? new Date().toISOString();

  const payload: LedgerEntryPayload = omitUndefined({
    sequence,
    claimId: input.claimId,
    entityId: input.entityId,
    evidenceId: input.evidenceId,
    stage: input.stage,
    contentHash: input.contentHash,
    actor: input.actor,
    timestamp,
    prevHash,
    signingKeyId: input.signingKeyId,
    artifactUri: input.artifactUri,
    metadata: input.metadata,
  });

  const canonical = canonicalString(payload);
  const hash = hashJson(payload);
  const signature = signPayload(canonical, privateKeyPem);

  const entry: LedgerEntry = {
    ...payload,
    hash,
    signature,
  };

  ledger.entries.push(entry);
  ledger.rootHash = hash;

  return entry;
}

export function verifyLedger(ledger: LedgerFile): LedgerVerificationResult {
  const errors: string[] = [];
  const keyMap = new Map(ledger.publicKeys.map((k) => [k.keyId, k]));
  let expectedSequence = 1;
  let prevHash: string | null = null;
  let computedRoot = '';

  for (const entry of ledger.entries) {
    if (entry.sequence !== expectedSequence) {
      errors.push(`sequence mismatch at entry ${entry.sequence}: expected ${expectedSequence}`);
    }

    if (entry.prevHash !== prevHash) {
      errors.push(`prevHash mismatch at sequence ${entry.sequence}`);
    }

    const payload = entryToPayload(entry);
    const canonical = canonicalString(payload);
    const computedHash = hashJson(payload);

    if (computedHash !== entry.hash) {
      errors.push(`hash mismatch at sequence ${entry.sequence}`);
    }

    const key = keyMap.get(entry.signingKeyId);
    if (!key) {
      errors.push(`missing public key ${entry.signingKeyId} for sequence ${entry.sequence}`);
    } else {
      const signatureValid = verifyPayload(canonical, key.publicKey, entry.signature);
      if (!signatureValid) {
        errors.push(`invalid signature at sequence ${entry.sequence}`);
      }
    }

    prevHash = entry.hash;
    computedRoot = entry.hash;
    expectedSequence += 1;
  }

  if (ledger.entries.length === 0) {
    computedRoot = '';
  }

  if (ledger.rootHash !== computedRoot) {
    errors.push(`rootHash mismatch: expected ${ledger.rootHash}, computed ${computedRoot}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    rootHash: computedRoot,
    entryCount: ledger.entries.length,
  };
}
