"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyNoise = applyNoise;
exports.applyNoiseToUnknown = applyNoiseToUnknown;
const DEFAULT_SEED = 1337;
function createSeededRandom(seed) {
    let state = seed % 2147483647;
    if (state <= 0) {
        state += 2147483646;
    }
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function renameKey(key, random) {
    const suffix = Math.floor(random() * 1000);
    return `${key}_drift_${suffix}`;
}
function applyNoise(input, scenario) {
    const random = createSeededRandom(scenario.seed ?? DEFAULT_SEED);
    const signals = [];
    const payload = { ...input };
    for (const key of Object.keys(payload)) {
        const dropChance = scenario.dropFieldProbability ?? 0;
        if (random() < dropChance) {
            delete payload[key];
            signals.push({
                type: 'field_dropped',
                details: `Dropped field ${key}`,
            });
            continue;
        }
        const renameChance = scenario.renameFieldProbability ?? 0;
        if (random() < renameChance) {
            const newKey = renameKey(key, random);
            payload[newKey] = payload[key];
            delete payload[key];
            signals.push({
                type: 'field_renamed',
                details: `Renamed field ${key} to ${newKey}`,
            });
        }
    }
    if (scenario.adversarialOverrides && isRecord(scenario.adversarialOverrides)) {
        Object.assign(payload, scenario.adversarialOverrides);
        signals.push({
            type: 'adversarial_override',
            details: 'Applied adversarial overrides',
        });
    }
    if (scenario.timeoutMs && scenario.timeoutMs > 0) {
        signals.push({ type: 'timeout', details: `Timeout at ${scenario.timeoutMs}ms` });
    }
    if (scenario.rateLimitPerMinute && scenario.rateLimitPerMinute > 0) {
        signals.push({
            type: 'rate_limited',
            details: `Rate limited at ${scenario.rateLimitPerMinute}/min`,
        });
    }
    if (scenario.staleCache) {
        signals.push({
            type: 'stale_cache',
            details: 'Injected stale cache response',
        });
    }
    return { payload, signals };
}
function applyNoiseToUnknown(input, scenario) {
    if (!isRecord(input)) {
        return { payload: {}, signals: [{ type: 'adversarial_override', details: 'Input not record' }] };
    }
    return applyNoise(input, scenario);
}
