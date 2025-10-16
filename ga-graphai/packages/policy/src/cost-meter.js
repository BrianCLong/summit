/**
 * Cost meter with soft/hard cap enforcement.
 */

export class CostMeter {
  constructor() {
    this.usage = new Map();
  }

  /**
   * Get usage snapshot for a key.
   * @param {string} key
   * @returns {{usd: number, tokens: number}}
   */
  snapshot(key) {
    return this.usage.get(key) ?? { usd: 0, tokens: 0 };
  }

  /**
   * Record cost and tokens for a key.
   * @param {string} key
   * @param {{usd: number, tokens: number}} delta
   * @returns {{usd: number, tokens: number}}
   */
  record(key, delta) {
    const previous = this.snapshot(key);
    const next = {
      usd: Number((previous.usd + (delta.usd ?? 0)).toFixed(6)),
      tokens: previous.tokens + (delta.tokens ?? 0),
    };
    this.usage.set(key, next);
    return next;
  }

  /**
   * Ensure the next delta will not breach caps. Hard caps fail closed.
   * @param {string} key
   * @param {{hardUsd: number, softPct: number, tokenCap: number}}
   * @param {{usd: number, tokens: number}}
   * @returns {{status: 'allow' | 'deny', reason?: string, softHit?: boolean, projected: {usd: number, tokens: number}}}
   */
  evaluate(key, caps, delta) {
    const current = this.snapshot(key);
    const projected = {
      usd: Number((current.usd + (delta.usd ?? 0)).toFixed(6)),
      tokens: current.tokens + (delta.tokens ?? 0),
    };

    if (caps.tokenCap > 0 && projected.tokens > caps.tokenCap) {
      return { status: 'deny', reason: 'TOKEN_CAP_EXCEEDED', projected };
    }

    if (typeof caps.hardUsd === 'number' && caps.hardUsd > 0) {
      if (projected.usd > caps.hardUsd) {
        return { status: 'deny', reason: 'HARD_CAP_EXCEEDED', projected };
      }
      const pct = (projected.usd / caps.hardUsd) * 100;
      if (caps.softPct > 0 && pct >= caps.softPct) {
        return { status: 'allow', softHit: true, projected };
      }
    } else if (delta.usd > 0) {
      return { status: 'deny', reason: 'PAID_MODEL_BLOCKED', projected };
    }

    return { status: 'allow', projected };
  }

  /**
   * Apply a delta after successful evaluation.
   * @param {string} key
   * @param {{usd: number, tokens: number}} delta
   * @returns {{usd: number, tokens: number}}
   */
  commit(key, delta) {
    return this.record(key, delta);
  }
}
