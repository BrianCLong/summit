"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureStore = void 0;
// Mock for risk/FeatureStore
class FeatureStore {
    async getFeatures(_entityId, _window) {
        return {
            'feature_a': 1,
            'feature_b': 0.5,
        };
    }
}
exports.FeatureStore = FeatureStore;
exports.default = FeatureStore;
