"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const feature_flags_js_1 = require("../feature-flags.js");
(0, globals_1.describe)('feature flag configuration', () => {
    const originalEnv = { ...process.env };
    (0, globals_1.afterEach)(() => {
        process.env = { ...originalEnv };
        (0, feature_flags_js_1.resetFeatureFlags)();
    });
    test('parses common truthy and falsy variants', () => {
        const flags = (0, feature_flags_js_1.loadFeatureFlags)({
            PRICE_AWARE_ENABLED: 'no',
            PRICING_REFRESH_ENABLED: '0',
            CAPACITY_FUTURES_ENABLED: 'yes',
            PRICE_AWARE_FORCE_POOL_ID: 'pool-forced',
            PRICE_AWARE_FAIL_OPEN: 'false',
        });
        (0, globals_1.expect)(flags.PRICE_AWARE_ENABLED).toBe(false);
        (0, globals_1.expect)(flags.PRICING_REFRESH_ENABLED).toBe(false);
        (0, globals_1.expect)(flags.CAPACITY_FUTURES_ENABLED).toBe(true);
        (0, globals_1.expect)(flags.PRICE_AWARE_FORCE_POOL_ID).toBe('pool-forced');
        (0, globals_1.expect)(flags.PRICE_AWARE_FAIL_OPEN).toBe(false);
    });
    test('falls back to defaults when env vars are missing', () => {
        const flags = (0, feature_flags_js_1.loadFeatureFlags)({});
        (0, globals_1.expect)(flags.PRICE_AWARE_ENABLED).toBe(true);
        (0, globals_1.expect)(flags.PRICING_REFRESH_ENABLED).toBe(true);
        (0, globals_1.expect)(flags.CAPACITY_FUTURES_ENABLED).toBe(true);
        (0, globals_1.expect)(flags.PRICE_AWARE_FORCE_POOL_ID).toBeUndefined();
        (0, globals_1.expect)(flags.PRICE_AWARE_FAIL_OPEN).toBe(true);
    });
});
