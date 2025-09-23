import { randomUUID } from 'node:crypto';

/**
 * Build a provenance payload for ledger storage.
 * @param {{
 *   tenant: string,
 *   caseId: string,
 *   environment: string,
 *   operation: string,
 *   request: any,
 *   policy: any,
 *   decision: any,
 *   model: any,
 *   cost: { usd: number, tokensIn: number, tokensOut: number, latencyMs?: number },
 *   output: any
 * }} input
 * @returns {object}
 */
export function buildEvidencePayload(input) {
  return {
    tenant: input.tenant,
    caseId: input.caseId,
    environment: input.environment,
    operation: input.operation,
    request: input.request,
    policy: input.policy,
    decision: input.decision,
    model: input.model,
    cost: input.cost,
    output: input.output
  };
}

export class InMemoryLedger {
  constructor(options = {}) {
    this.entries = new Map();
    this.signer = options.signer ?? ((payload) => `stub-signature:${payload.id}`);
  }

  /**
   * Persist an evidence payload.
   * @param {object} payload
   * @returns {object}
   */
  record(payload) {
    const id = randomUUID();
    const recordedAt = new Date().toISOString();
    const entry = {
      id,
      recordedAt,
      signature: this.signer({ id, recordedAt, payload }),
      payload
    };
    this.entries.set(id, entry);
    return entry;
  }

  /**
   * Retrieve an entry by id.
   * @param {string} id
   * @returns {object | null}
   */
  get(id) {
    return this.entries.get(id) ?? null;
  }

  /**
   * List entries in reverse chronological order.
   * @param {number} [limit]
   * @returns {object[]}
   */
  list(limit = 50) {
    const values = Array.from(this.entries.values());
    return values.slice(-limit).reverse();
  }
}
