"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetrics = exports.RedisCache = exports.UnleashProvider = exports.LaunchDarklyProvider = exports.FeatureFlagService = void 0;
class FeatureFlagService {
    constructor() { }
    on() { }
    setMetrics() { }
    async initialize() { return Promise.resolve(); }
    async close() { return Promise.resolve(); }
}
exports.FeatureFlagService = FeatureFlagService;
class LaunchDarklyProvider {
}
exports.LaunchDarklyProvider = LaunchDarklyProvider;
class UnleashProvider {
}
exports.UnleashProvider = UnleashProvider;
class RedisCache {
}
exports.RedisCache = RedisCache;
class PrometheusMetrics {
}
exports.PrometheusMetrics = PrometheusMetrics;
