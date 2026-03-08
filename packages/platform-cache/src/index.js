"use strict";
/**
 * @intelgraph/platform-cache
 *
 * Unified caching abstraction for Summit platform.
 * Implements Prompt 20: Caching and Memoization Strategy
 *
 * Features:
 * - Multi-layer caching (local LRU + distributed Redis)
 * - Consistent key generation
 * - TTL and invalidation support
 * - Metrics and monitoring
 * - Type-safe operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKeyBuilder = exports.createCacheManager = exports.CacheManager = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./cache-client.js"), exports);
__exportStar(require("./cache-manager.js"), exports);
__exportStar(require("./key-builder.js"), exports);
__exportStar(require("./providers/index.js"), exports);
// Convenience re-exports
var cache_manager_js_1 = require("./cache-manager.js");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_js_1.CacheManager; } });
Object.defineProperty(exports, "createCacheManager", { enumerable: true, get: function () { return cache_manager_js_1.createCacheManager; } });
var key_builder_js_1 = require("./key-builder.js");
Object.defineProperty(exports, "CacheKeyBuilder", { enumerable: true, get: function () { return key_builder_js_1.CacheKeyBuilder; } });
