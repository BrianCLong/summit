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
        savingsUSD: Number(metadata.savingsUSD ?? 0),
      },
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
      metadata: entry.metadata,
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
      { count: 0, totalBudgetDeltaUSD: 0, totalSavingsUSD: 0 },
    );
  }
}
