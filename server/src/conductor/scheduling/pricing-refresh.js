"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshPricing = refreshPricing;
// @ts-nocheck
const pg_1 = require("pg");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const pricing_signal_provider_js_1 = require("./pricing-signal-provider.js");
const prometheus_js_1 = require("../observability/prometheus.js");
const defaultPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const defaultProvider = new pricing_signal_provider_js_1.EnvJsonPricingSignalProvider();
async function refreshPricing(options = {}) {
    const pool = options.pool ?? defaultPool;
    const provider = options.provider ?? defaultProvider;
    const effectiveAt = options.effectiveAt ?? new Date();
    const start = Date.now();
    let skippedPools = 0;
    try {
        const rawSignals = await provider.fetch();
        const providerInvalid = Array.isArray(rawSignals.__invalidPools)
            ? rawSignals.__invalidPools.length
            : 0;
        const { signals, invalid } = (0, pricing_signal_provider_js_1.sanitizePricingSignals)(rawSignals);
        skippedPools += invalid.length + providerInvalid;
        const { rows } = await pool.query('SELECT id FROM pool_registry');
        const knownPools = new Set(rows.map((r) => r.id));
        const entries = [];
        for (const [poolId, signal] of Object.entries(signals)) {
            if (!knownPools.has(poolId)) {
                skippedPools += 1;
                continue;
            }
            entries.push([poolId, signal]);
        }
        if (entries.length) {
            const values = [];
            const placeholders = entries.map(([poolId, signal], idx) => {
                const base = idx * 5;
                values.push(poolId, Number(signal.cpu_sec_usd), Number(signal.gb_sec_usd), Number(signal.egress_gb_usd), effectiveAt);
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
            });
            const sql = `
        INSERT INTO pool_pricing (pool_id, cpu_sec_usd, gb_sec_usd, egress_gb_usd, effective_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (pool_id) DO UPDATE SET
          cpu_sec_usd = EXCLUDED.cpu_sec_usd,
          gb_sec_usd = EXCLUDED.gb_sec_usd,
          egress_gb_usd = EXCLUDED.egress_gb_usd,
          effective_at = EXCLUDED.effective_at
      `;
            await pool.query(sql, values);
        }
        prometheus_js_1.pricingRefreshTotal.inc({ status: 'success' });
        prometheus_js_1.pricingRefreshLastSuccessTimestamp.set(effectiveAt.getTime() / 1000);
        const durationMs = Date.now() - start;
        logger_js_1.default.info('Pricing refresh completed', {
            actor: options.actor,
            tenantId: options.tenantId,
            updatedPools: entries.length,
            skippedPools,
            durationMs,
            effectiveAt: effectiveAt.toISOString(),
        });
        return {
            updatedPools: entries.length,
            skippedPools,
            effectiveAt,
        };
    }
    catch (error) {
        prometheus_js_1.pricingRefreshTotal.inc({ status: 'error' });
        logger_js_1.default.error('Pricing refresh failed', {
            actor: options.actor,
            tenantId: options.tenantId,
            error: error.message,
        });
        throw error;
    }
}
