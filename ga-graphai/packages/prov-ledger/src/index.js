import crypto from 'node:crypto';

import { createDecisionRecord } from 'common-types';

function deepFreeze(object) {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    for (const value of Object.values(object)) {
      deepFreeze(value);
    }
  }
  return object;
}

function serializeForHash(input) {
  return JSON.stringify(input, Object.keys(input).sort());
}

export class ProvenanceLedger {
  constructor(options = {}) {
    this.namespace = options.namespace ?? 'default';
    this.entries = [];
  }

  /**
   * Record a decision and return the immutable ledger entry.
   *
   * @param {import('common-types').DecisionRecord} decision
   * @param {{ policyTags?: string[], savingsUSD?: number }} metadata
   * @returns {object}
   */
  record(decision, metadata = {}) {
    const normalizedDecision = createDecisionRecord(decision);
    const entry = {
      id: crypto.randomUUID(),
      namespace: this.namespace,
      recordedAt: new Date().toISOString(),
      decision: normalizedDecision,
      metadata: {
        policyTags: Array.from(new Set(metadata.policyTags ?? [])),
        savingsUSD: Number(metadata.savingsUSD ?? 0)
      }
    };
    entry.fingerprint = this.createFingerprint(entry);
    deepFreeze(entry);
    this.entries.push(entry);
    return entry;
  }

  /**
   * Generate a deterministic fingerprint suitable for audit trails.
   *
   * @param {object} entry
   * @returns {string}
   */
  createFingerprint(entry) {
    const payload = {
      namespace: entry.namespace,
      recordedAt: entry.recordedAt,
      decision: entry.decision,
      metadata: entry.metadata
    };
    const hash = crypto.createHash('sha256');
    hash.update(serializeForHash(payload));
    return hash.digest('hex');
  }

  /**
   * Retrieve ledger entries for a task id.
   *
   * @param {string} taskId
   * @returns {object[]}
   */
  findByTask(taskId) {
    return this.entries.filter((entry) => entry.decision.taskId === taskId);
  }

  /**
   * Verify that an entry was not tampered with after recording.
   *
   * @param {object} entry
   * @returns {boolean}
   */
  verify(entry) {
    return entry.fingerprint === this.createFingerprint(entry);
  }

  /**
   * Aggregate summary stats for dashboards.
   *
   * @returns {{ count: number, totalBudgetDeltaUSD: number, totalSavingsUSD: number }}
   */
  summary() {
    return this.entries.reduce(
      (acc, entry) => {
        acc.count += 1;
        acc.totalBudgetDeltaUSD += entry.decision.budgetDeltaUSD;
        acc.totalSavingsUSD += entry.metadata.savingsUSD;
        return acc;
      },
      { count: 0, totalBudgetDeltaUSD: 0, totalSavingsUSD: 0 }
    );
  }
}

// ============================================================================
// HUMAN ANNOTATION PROVENANCE LEDGER (HAPL)
// ============================================================================

export class HaplLedger {
  constructor(options) {
    if (!options?.privateKey || !options?.publicKey) {
      throw new Error('HaplLedger requires both private and public keys');
    }

    this.#privateKey = toPrivateKey(options.privateKey);
    this.#publicKey = toPublicKey(options.publicKey);
    this.#now = options.now ?? (() => new Date());
    this.#signerId = fingerprintKey(this.#publicKey);
    this.#entries = [];
  }

  appendLabel(input) {
    const payload = {
      labelerId: input.labelerId,
      label: input.label,
      rubricVersion: input.rubricVersion,
      toolVersion: input.toolVersion,
      rubricId: input.rubricId,
      metadata: input.metadata ? pruneEmptyObject(input.metadata) : undefined
    };

    return this.#appendEntry('label', input.datasetId, input.itemId, input.labelerId, payload, input.timestamp);
  }

  appendPayment(input) {
    const payload = {
      payerId: input.payerId,
      labelerId: input.labelerId,
      amount: Number(input.amount),
      currency: input.currency,
      reference: input.reference,
      metadata: input.metadata ? pruneEmptyObject(input.metadata) : undefined
    };

    return this.#appendEntry('payment', input.datasetId, input.itemId, input.payerId, payload, input.timestamp);
  }

  appendConflict(input) {
    const actors = Array.from(new Set([...(input.actors ?? []), input.raisedBy])).sort();
    const payload = {
      actors,
      reason: input.reason,
      resolution: input.resolution,
      metadata: input.metadata ? pruneEmptyObject(input.metadata) : undefined
    };

    return this.#appendEntry('conflict', input.datasetId, input.itemId, input.raisedBy, payload, input.timestamp);
  }

  verify() {
    return verifyHaplEntries(this.#entries, this.#publicKey);
  }

  getRootHash() {
    return this.#entries.at(-1)?.hash;
  }

  getSignerId() {
    return this.#signerId;
  }

  getEntries() {
    return this.#entries.slice();
  }

  toJSON() {
    return {
      signerId: this.#signerId,
      root: this.getRootHash(),
      entries: this.#entries.map((entry) => JSON.parse(JSON.stringify(entry)))
    };
  }

  #appendEntry(eventType, datasetId, itemId, actor, payload, timestamp) {
    const sequence = this.#entries.length;
    const isoTimestamp = ensureIsoTimestamp(timestamp, this.#now);
    const previousHash = this.#entries.at(-1)?.hash;
    const canonicalPayload = canonicalizePayload(payload);
    const signPayload = {
      sequence,
      eventType,
      datasetId,
      actor,
      timestamp: isoTimestamp,
      payload: canonicalPayload,
      signerId: this.#signerId,
      previousHash
    };

    if (itemId !== undefined) {
      signPayload.itemId = itemId;
    }

    const canonicalString = canonicalStringify(signPayload);
    const hash = computeEntryHash(previousHash, canonicalString);
    const signature = signCanonical(canonicalString, this.#privateKey);
    const entry = {
      ...signPayload,
      hash,
      signature
    };

    const frozen = deepFreeze(entry);
    this.#entries.push(frozen);
    return frozen;
  }

  #entries;
  #now;
  #privateKey;
  #publicKey;
  #signerId;
}

export function buildDatasetProvenanceOverlay(entries) {
  const overlay = {
    signerId: entries[0]?.signerId,
    root: entries.at(-1)?.hash,
    datasets: {}
  };

  for (const entry of entries) {
    const dataset = (overlay.datasets[entry.datasetId] ??= { items: {} });
    const itemKey = entry.itemId ?? '__dataset__';
    const item = (dataset.items[itemKey] ??= {
      labels: [],
      payments: [],
      conflicts: []
    });

    if (entry.eventType === 'label') {
      const payload = entry.payload;
      item.labels.push({
        sequence: entry.sequence,
        labelerId: payload.labelerId,
        label: payload.label,
        rubricVersion: payload.rubricVersion,
        toolVersion: payload.toolVersion,
        rubricId: payload.rubricId,
        timestamp: entry.timestamp,
        signerId: entry.signerId,
        hash: entry.hash,
        previousHash: entry.previousHash,
        signature: entry.signature,
        metadata: payload.metadata
      });
      continue;
    }

    if (entry.eventType === 'payment') {
      const payload = entry.payload;
      item.payments.push({
        sequence: entry.sequence,
        payerId: payload.payerId,
        labelerId: payload.labelerId,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        timestamp: entry.timestamp,
        signerId: entry.signerId,
        hash: entry.hash,
        previousHash: entry.previousHash,
        signature: entry.signature,
        metadata: payload.metadata
      });
      continue;
    }

    if (entry.eventType === 'conflict') {
      const payload = entry.payload;
      item.conflicts.push({
        sequence: entry.sequence,
        raisedBy: entry.actor,
        actors: payload.actors,
        reason: payload.reason,
        resolution: payload.resolution,
        timestamp: entry.timestamp,
        signerId: entry.signerId,
        hash: entry.hash,
        previousHash: entry.previousHash,
        signature: entry.signature,
        metadata: payload.metadata
      });
    }
  }

  return overlay;
}

export function verifyHaplEntries(entries, publicKey) {
  const key = toPublicKey(publicKey);
  const signerId = fingerprintKey(key);
  let expectedPrevious;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.sequence !== index) {
      return { valid: false, error: `Sequence mismatch at index ${index}` };
    }
    if (entry.signerId !== signerId) {
      return { valid: false, error: `Unexpected signer for entry ${index}` };
    }
    if ((entry.previousHash ?? undefined) !== expectedPrevious) {
      return { valid: false, error: `Hash chain broken at entry ${index}` };
    }

    const payload = payloadForSignature(entry);
    const canonicalString = canonicalStringify(payload);
    const expectedHash = computeEntryHash(expectedPrevious, canonicalString);
    if (entry.hash !== expectedHash) {
      return { valid: false, error: `Hash mismatch at entry ${index}` };
    }
    if (!verifyCanonical(canonicalString, entry.signature, key)) {
      return { valid: false, error: `Signature mismatch at entry ${index}` };
    }

    expectedPrevious = entry.hash;
  }

  return { valid: true };
}

function payloadForSignature(entry) {
  const payload = canonicalizePayload(entry.payload);
  const signPayload = {
    sequence: entry.sequence,
    eventType: entry.eventType,
    datasetId: entry.datasetId,
    actor: entry.actor,
    timestamp: entry.timestamp,
    payload,
    signerId: entry.signerId,
    previousHash: entry.previousHash
  };

  if (entry.itemId !== undefined) {
    signPayload.itemId = entry.itemId;
  }

  return signPayload;
}

function ensureIsoTimestamp(timestamp, now) {
  if (!timestamp) {
    return now().toISOString();
  }
  return new Date(timestamp).toISOString();
}

function canonicalizePayload(payload) {
  return canonicalizeValue(payload);
}

function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }

  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }

    const record = value;
    const sortedKeys = Object.keys(record).sort();
    const result = {};
    for (const key of sortedKeys) {
      const child = canonicalizeValue(record[key]);
      if (child !== undefined) {
        result[key] = child;
      }
    }
    return result;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Ledger payload numbers must be finite');
    }
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === undefined) {
    return undefined;
  }

  return value;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalizeValue(value));
}

function computeEntryHash(previousHash, canonical) {
  const hash = crypto.createHash('sha256');
  if (previousHash) {
    hash.update(previousHash);
  }
  hash.update(canonical);
  return hash.digest('hex');
}

function signCanonical(payload, privateKey) {
  return crypto.sign(null, Buffer.from(payload), privateKey).toString('base64');
}

function verifyCanonical(payload, signature, publicKey) {
  try {
    return crypto.verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

function toPublicKey(key) {
  if (typeof key === 'string' || Buffer.isBuffer(key)) {
    return crypto.createPublicKey(key);
  }
  return key;
}

function toPrivateKey(key) {
  if (typeof key === 'string' || Buffer.isBuffer(key)) {
    return crypto.createPrivateKey(key);
  }
  return key;
}

function fingerprintKey(key) {
  const exported = key.export({ format: 'der', type: 'spki' });
  const hash = crypto.createHash('sha256');
  hash.update(exported);
  return hash.digest('hex');
}

function pruneEmptyObject(value) {
  const canonical = canonicalizeValue(value);
  if (!canonical) {
    return undefined;
  }
  const keys = Object.keys(canonical);
  if (keys.length === 0) {
    return undefined;
  }
  return canonical;
}
