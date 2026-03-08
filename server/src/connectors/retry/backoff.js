"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSeededRng = createSeededRng;
exports.createDeterministicBackoff = createDeterministicBackoff;
exports.previewDelays = previewDelays;
const DEFAULT_OPTIONS = {
    baseDelayMs: 200,
    factor: 2,
    maxDelayMs: 30_000,
    jitterRatio: 0.3,
};
/**
 * Minimal deterministic PRNG based on mulberry32.
 */
function createSeededRng(seed = 'retry-seed') {
    let value = typeof seed === 'number' ? seed : hashSeed(seed);
    return () => {
        value |= 0;
        value = (value + 0x6d2b79f5) | 0;
        let t = Math.imul(value ^ (value >>> 15), 1 | value);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hashSeed(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
function applyJitter(delay, rng, jitterRatio, maxDelayMs) {
    if (jitterRatio <= 0)
        return delay;
    const jitterSpan = delay * jitterRatio;
    const jitter = (rng() - 0.5) * 2 * jitterSpan;
    const jittered = delay + jitter;
    return Math.max(0, Math.min(maxDelayMs, Math.round(jittered)));
}
function computeDelay(attempt, options) {
    const exponential = options.baseDelayMs * options.factor ** (attempt - 1);
    return Math.min(options.maxDelayMs, exponential);
}
function createDeterministicBackoff(plan = {}) {
    const { seed, ...rest } = plan;
    const mergedOptions = {
        ...DEFAULT_OPTIONS,
        ...rest,
    };
    const rng = createSeededRng(seed ?? 'retry-seed');
    let attempt = 0;
    const delays = [];
    return () => {
        attempt += 1;
        const baseDelay = computeDelay(attempt, mergedOptions);
        const delay = applyJitter(baseDelay, rng, mergedOptions.jitterRatio, mergedOptions.maxDelayMs);
        delays.push(delay);
        return { attempt, delays: [...delays] };
    };
}
function previewDelays(attempts, plan = {}) {
    const step = createDeterministicBackoff(plan);
    let state;
    for (let i = 0; i < attempts; i += 1) {
        state = step();
    }
    return state?.delays ?? [];
}
