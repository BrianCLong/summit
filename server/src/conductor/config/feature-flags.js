"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFeatureFlags = loadFeatureFlags;
exports.getFeatureFlags = getFeatureFlags;
exports.resetFeatureFlags = resetFeatureFlags;
exports.flagsSnapshot = flagsSnapshot;
exports.recordPricingRefreshBlocked = recordPricingRefreshBlocked;
// @ts-nocheck
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const federationMetrics_js_1 = require("../../metrics/federationMetrics.js");
const truthyValues = new Set(['true', '1', 'yes', 'y', 'on']);
const falsyValues = new Set(['false', '0', 'no', 'n', 'off']);
function parseBoolean(value, defaultValue) {
    if (typeof value !== 'string')
        return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (truthyValues.has(normalized))
        return true;
    if (falsyValues.has(normalized))
        return false;
    return defaultValue;
}
function loadFeatureFlags(env = process.env) {
    return {
        PRICE_AWARE_ENABLED: parseBoolean(env.PRICE_AWARE_ENABLED, true),
        PRICING_REFRESH_ENABLED: parseBoolean(env.PRICING_REFRESH_ENABLED, true),
        CAPACITY_FUTURES_ENABLED: parseBoolean(env.CAPACITY_FUTURES_ENABLED, true),
        PRICE_AWARE_FORCE_POOL_ID: env.PRICE_AWARE_FORCE_POOL_ID || undefined,
        PRICE_AWARE_FAIL_OPEN: parseBoolean(env.PRICE_AWARE_FAIL_OPEN, true),
    };
}
function updateFlagGauges(flags) {
    try {
        federationMetrics_js_1.featureFlagEnabledGauge.labels('PRICE_AWARE_ENABLED').set(flags.PRICE_AWARE_ENABLED ? 1 : 0);
        federationMetrics_js_1.featureFlagEnabledGauge.labels('PRICING_REFRESH_ENABLED').set(flags.PRICING_REFRESH_ENABLED ? 1 : 0);
        federationMetrics_js_1.featureFlagEnabledGauge.labels('CAPACITY_FUTURES_ENABLED').set(flags.CAPACITY_FUTURES_ENABLED ? 1 : 0);
        federationMetrics_js_1.featureFlagEnabledGauge.labels('PRICE_AWARE_FAIL_OPEN').set(flags.PRICE_AWARE_FAIL_OPEN ? 1 : 0);
    }
    catch (error) {
        logger_js_1.default.warn('Failed to publish feature flag gauges', {
            error: error.message,
        });
    }
}
let cachedFlags = loadFeatureFlags();
updateFlagGauges(cachedFlags);
function getFeatureFlags() {
    return cachedFlags;
}
function resetFeatureFlags(env = process.env) {
    cachedFlags = loadFeatureFlags(env);
    updateFlagGauges(cachedFlags);
    return cachedFlags;
}
function flagsSnapshot() {
    return { ...cachedFlags };
}
function recordPricingRefreshBlocked() {
    federationMetrics_js_1.pricingRefreshBlockedTotal.inc();
}
