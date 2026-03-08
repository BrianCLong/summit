"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureStore_js_1 = require("../risk/FeatureStore.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('FeatureStore', () => {
    (0, globals_1.it)('returns default features', async () => {
        const store = new FeatureStore_js_1.FeatureStore();
        const f = await store.getFeatures('id', '24h');
        (0, globals_1.expect)(Object.keys(f)).toContain('alerts_24h');
    });
});
