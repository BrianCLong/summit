"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pricing_signal_provider_js_1 = require("../pricing-signal-provider.js");
(0, globals_1.describe)('EnvJsonPricingSignalProvider', () => {
    const originalEnv = process.env.PRICING_SIGNALS_JSON;
    (0, globals_1.afterEach)(() => {
        if (originalEnv === undefined) {
            delete process.env.PRICING_SIGNALS_JSON;
        }
        else {
            process.env.PRICING_SIGNALS_JSON = originalEnv;
        }
    });
    test('parses env json and coerces values to numbers', async () => {
        process.env.PRICING_SIGNALS_JSON = JSON.stringify({
            'pool-a': {
                cpu_sec_usd: '0.01',
                gb_sec_usd: '0.02',
                egress_gb_usd: '0.03',
            },
        });
        const provider = new pricing_signal_provider_js_1.EnvJsonPricingSignalProvider();
        const signals = await provider.fetch();
        (0, globals_1.expect)(signals['pool-a'].cpu_sec_usd).toBeCloseTo(0.01);
        (0, globals_1.expect)(signals['pool-a'].gb_sec_usd).toBeCloseTo(0.02);
        (0, globals_1.expect)(signals['pool-a'].egress_gb_usd).toBeCloseTo(0.03);
    });
    test('skips invalid pricing numbers from env', async () => {
        process.env.PRICING_SIGNALS_JSON = JSON.stringify({
            'pool-a': {
                cpu_sec_usd: 'NaN',
                gb_sec_usd: 0.02,
                egress_gb_usd: 0.03,
            },
            'pool-b': {
                cpu_sec_usd: 0.01,
                gb_sec_usd: 0.02,
                egress_gb_usd: -1,
            },
            'pool-valid': {
                cpu_sec_usd: 0.0005,
                gb_sec_usd: 0.0004,
                egress_gb_usd: 0.05,
            },
        });
        const provider = new pricing_signal_provider_js_1.EnvJsonPricingSignalProvider();
        const signals = await provider.fetch();
        (0, globals_1.expect)(signals).toHaveProperty('pool-valid');
        (0, globals_1.expect)(signals).not.toHaveProperty('pool-a');
        (0, globals_1.expect)(signals).not.toHaveProperty('pool-b');
    });
    test('falls back to baseline when env is missing', async () => {
        delete process.env.PRICING_SIGNALS_JSON;
        const provider = new pricing_signal_provider_js_1.EnvJsonPricingSignalProvider();
        const signals = await provider.fetch();
        (0, globals_1.expect)(signals).toEqual(pricing_signal_provider_js_1.BASELINE_PRICING_SIGNALS);
    });
});
(0, globals_1.describe)('sanitizePricingSignals', () => {
    test('filters out invalid entries and reports them', () => {
        const { signals, invalid } = (0, pricing_signal_provider_js_1.sanitizePricingSignals)({
            known: { cpu_sec_usd: 0.1, gb_sec_usd: 0.2, egress_gb_usd: 0.3 },
            bad: { cpu_sec_usd: Infinity, gb_sec_usd: 0.2, egress_gb_usd: 0.3 },
        });
        (0, globals_1.expect)(signals).toHaveProperty('known');
        (0, globals_1.expect)(signals).not.toHaveProperty('bad');
        (0, globals_1.expect)(invalid).toContain('bad');
    });
});
