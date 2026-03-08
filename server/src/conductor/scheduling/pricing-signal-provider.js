"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvJsonPricingSignalProvider = exports.BASELINE_PRICING_SIGNALS = void 0;
exports.normalizePricingSignal = normalizePricingSignal;
exports.sanitizePricingSignals = sanitizePricingSignals;
const logger_js_1 = __importDefault(require("../../config/logger.js"));
exports.BASELINE_PRICING_SIGNALS = {
    'eu-west-1-pool-a': {
        cpu_sec_usd: 0.000015,
        gb_sec_usd: 0.00001,
        egress_gb_usd: 0.12,
    },
    'us-east-1-pool-a': {
        cpu_sec_usd: 0.000012,
        gb_sec_usd: 0.000009,
        egress_gb_usd: 0.09,
    },
};
function normalizePricingSignal(raw) {
    const cpu = Number(raw?.cpu_sec_usd);
    const gb = Number(raw?.gb_sec_usd);
    const egress = Number(raw?.egress_gb_usd);
    if (!Number.isFinite(cpu) ||
        !Number.isFinite(gb) ||
        !Number.isFinite(egress)) {
        return null;
    }
    if (cpu < 0 || gb < 0 || egress < 0) {
        return null;
    }
    return {
        cpu_sec_usd: cpu,
        gb_sec_usd: gb,
        egress_gb_usd: egress,
    };
}
function sanitizePricingSignals(rawSignals) {
    const sanitized = {};
    const invalid = [];
    if (!rawSignals || typeof rawSignals !== 'object') {
        return { signals: sanitized, invalid };
    }
    for (const [poolId, raw] of Object.entries(rawSignals)) {
        const normalized = normalizePricingSignal(raw);
        if (!normalized) {
            invalid.push(poolId);
            continue;
        }
        sanitized[poolId] = normalized;
    }
    return { signals: sanitized, invalid };
}
class EnvJsonPricingSignalProvider {
    envKey;
    constructor(envKey = 'PRICING_SIGNALS_JSON') {
        this.envKey = envKey;
    }
    async fetch() {
        const raw = process.env[this.envKey];
        if (!raw) {
            logger_js_1.default.info('Pricing signal env not set; using baseline pricing signals', { provider: 'env-json' });
            const baseline = { ...exports.BASELINE_PRICING_SIGNALS };
            Object.defineProperty(baseline, '__invalidPools', {
                value: [],
                enumerable: false,
            });
            return baseline;
        }
        try {
            const parsed = JSON.parse(raw);
            const { signals, invalid } = sanitizePricingSignals(parsed);
            if (invalid.length) {
                logger_js_1.default.warn('Invalid pricing signals skipped from env', {
                    invalidPools: invalid,
                });
            }
            if (Object.keys(signals).length === 0) {
                logger_js_1.default.warn('No valid pricing signals found in env; using baseline', { provider: 'env-json' });
                const baseline = { ...exports.BASELINE_PRICING_SIGNALS };
                Object.defineProperty(baseline, '__invalidPools', {
                    value: invalid,
                    enumerable: false,
                });
                return baseline;
            }
            const result = { ...signals };
            Object.defineProperty(result, '__invalidPools', {
                value: invalid,
                enumerable: false,
            });
            return result;
        }
        catch (error) {
            logger_js_1.default.warn('Failed to parse PRICING_SIGNALS_JSON, using baseline', {
                error: error.message,
            });
            const baseline = { ...exports.BASELINE_PRICING_SIGNALS };
            Object.defineProperty(baseline, '__invalidPools', {
                value: [],
                enumerable: false,
            });
            return baseline;
        }
    }
}
exports.EnvJsonPricingSignalProvider = EnvJsonPricingSignalProvider;
