"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagProvider = void 0;
const registry_js_1 = require("./registry.js");
class FeatureFlagProvider {
    static instance;
    overrides = new Map();
    constructor() {
        this.loadEnvOverrides();
    }
    static getInstance() {
        if (!FeatureFlagProvider.instance) {
            FeatureFlagProvider.instance = new FeatureFlagProvider();
        }
        return FeatureFlagProvider.instance;
    }
    loadEnvOverrides() {
        // Load from process.env, looking for FLAG_ prefix
        // e.g. FLAG_NEW_SEARCH_ALGORITHM=true
        for (const key of Object.keys(process.env)) {
            if (key.startsWith('FLAG_')) {
                const flagName = key.replace('FLAG_', '').toLowerCase();
                // Match against known flags if strictly required, or allow dynamic
                // For now, we map back to the registry values if possible
                const knownFlag = Object.values(registry_js_1.FeatureFlags).find((f) => f.replace(/_/g, '').toLowerCase() === flagName.replace(/_/g, '').toLowerCase());
                if (knownFlag) {
                    this.overrides.set(knownFlag, process.env[key] === 'true');
                }
            }
        }
    }
    isEnabled(flag, context) {
        // 1. Runtime/Env overrides
        if (this.overrides.has(flag)) {
            return this.overrides.get(flag);
        }
        // 2. Config overrides (could be injected, skipping for now as per minimal scope)
        // 3. Defaults
        return registry_js_1.DEFAULT_FLAGS[flag] ?? false;
    }
    // Helper to set overrides programmatically (useful for tests)
    setOverride(flag, value) {
        this.overrides.set(flag, value);
    }
    clearOverrides() {
        this.overrides.clear();
        this.loadEnvOverrides();
    }
}
exports.FeatureFlagProvider = FeatureFlagProvider;
