import { ZERO_SPEND_OPTIMIZATIONS, buildMemoCacheKey } from 'common-types';

const EFFECTS = {
  [ZERO_SPEND_OPTIMIZATIONS.KV_CACHE]: {
    cost: 0.9,
    latency: 0.85,
    condition: (task) => (task.tokens ?? 0) > 1024,
  },
  [ZERO_SPEND_OPTIMIZATIONS.QUANTIZATION]: { cost: 0.82, latency: 0.95 },
  [ZERO_SPEND_OPTIMIZATIONS.SPECULATIVE_DECODE]: { cost: 0.92, latency: 0.7 },
  [ZERO_SPEND_OPTIMIZATIONS.BATCHING]: { cost: 0.9, latency: 0.9 },
  [ZERO_SPEND_OPTIMIZATIONS.VLLM]: { cost: 0.88, latency: 0.85 },
  [ZERO_SPEND_OPTIMIZATIONS.LORA]: { cost: 0.95, latency: 1 },
  [ZERO_SPEND_OPTIMIZATIONS.MEMOIZATION]: { cost: 0, latency: 0 },
};

export class OptimizationManager {
  constructor({ policyEngine, kvCache, memoCache }) {
    this.policyEngine = policyEngine;
    this.kvCache = kvCache ?? new Map();
    this.memoCache = memoCache ?? new Map();
  }

  cacheLookup(task) {
    if (!task?.promptHash || !task?.policyVersion) {
      return { hit: false };
    }
    const key = buildMemoCacheKey(task.promptHash, task.policyVersion);
    if (this.memoCache.has(key)) {
      return { hit: true, key, value: this.memoCache.get(key) };
    }
    return { hit: false, key };
  }

  cacheStore(key, value) {
    if (key) {
      this.memoCache.set(key, value);
    }
  }

  /**
   * Adjust predicted metrics using enabled optimizations.
   *
   * @param {{ cost: number, latency: number }} metrics
   * @param {object} task
   * @returns {{ cost: number, latency: number, applied: string[], savingsUSD: number }}
   */
  apply(metrics, task) {
    let cost = metrics.cost;
    let latency = metrics.latency;
    const applied = [];
    let savingsUSD = 0;
    for (const optimization of this.policyEngine.config.optimizationFlags) {
      const effect = EFFECTS[optimization];
      if (!effect) {
        continue;
      }
      if (effect.condition && !effect.condition(task)) {
        continue;
      }
      if (!this.policyEngine.isOptimizationEnabled(optimization)) {
        continue;
      }
      if (optimization === ZERO_SPEND_OPTIMIZATIONS.MEMOIZATION) {
        const { hit } = this.cacheLookup(task);
        if (hit) {
          applied.push(optimization);
          savingsUSD += cost;
          cost = 0;
          latency = 0;
        }
        continue;
      }
      const beforeCost = cost;
      const beforeLatency = latency;
      cost *= effect.cost ?? 1;
      latency *= effect.latency ?? 1;
      savingsUSD += Math.max(0, beforeCost - cost);
      if (beforeLatency !== latency || beforeCost !== cost) {
        applied.push(optimization);
      }
    }
    return { cost, latency, applied, savingsUSD };
  }
}
