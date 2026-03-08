"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const provider_js_1 = require("../../src/feature_flags/provider.js");
const registry_js_1 = require("../../src/feature_flags/registry.js");
const index_js_1 = require("../../src/feature_flags/index.js");
(0, globals_1.describe)('Feature Flags', () => {
    (0, globals_1.beforeEach)(() => {
        provider_js_1.FeatureFlagProvider.getInstance().clearOverrides();
    });
    (0, globals_1.it)('should return default value', () => {
        // NEW_SEARCH_ALGORITHM is false by default
        (0, globals_1.expect)((0, index_js_1.isEnabled)(registry_js_1.FeatureFlags.NEW_SEARCH_ALGORITHM)).toBe(false);
    });
    (0, globals_1.it)('should allow overrides', () => {
        provider_js_1.FeatureFlagProvider.getInstance().setOverride(registry_js_1.FeatureFlags.NEW_SEARCH_ALGORITHM, true);
        (0, globals_1.expect)((0, index_js_1.isEnabled)(registry_js_1.FeatureFlags.NEW_SEARCH_ALGORITHM)).toBe(true);
    });
    (0, globals_1.it)('should respect environment variables', () => {
        process.env.FLAG_BETA_DASHBOARD = 'true';
        // Re-initialize or clear to pick up env
        provider_js_1.FeatureFlagProvider.getInstance().clearOverrides();
        (0, globals_1.expect)((0, index_js_1.isEnabled)(registry_js_1.FeatureFlags.BETA_DASHBOARD)).toBe(true);
        delete process.env.FLAG_BETA_DASHBOARD;
    });
    (0, globals_1.it)('decorator should throw if disabled', () => {
        class TestClass {
            @(0, index_js_1.requireFlag)(registry_js_1.FeatureFlags.BETA_DASHBOARD)
            doSomething() {
                return 'done';
            }
        }
        const instance = new TestClass();
        (0, globals_1.expect)(() => instance.doSomething()).toThrow('Feature beta_dashboard is not enabled');
        provider_js_1.FeatureFlagProvider.getInstance().setOverride(registry_js_1.FeatureFlags.BETA_DASHBOARD, true);
        (0, globals_1.expect)(instance.doSomething()).toBe('done');
    });
});
