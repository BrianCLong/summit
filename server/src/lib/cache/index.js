"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const multi_tier_cache_js_1 = require("./multi-tier-cache.js");
/**
 * A singleton instance of the MultiTierCache.
 * This ensures that the same cache instance is used throughout the application,
 * which is crucial for consistency and efficient resource management.
 */
exports.cache = new multi_tier_cache_js_1.MultiTierCache();
