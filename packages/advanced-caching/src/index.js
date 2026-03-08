"use strict";
/**
 * Advanced Multi-Tier Caching Package
 *
 * Provides enterprise-grade caching with:
 * - L1: In-memory LRU cache
 * - L2: Redis distributed cache
 * - L3: CDN edge caching
 * - Cache warming and preloading
 * - Stampede prevention
 * - Smart invalidation strategies
 * - Cache versioning
 * - TTL management
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
exports.CDNIntegration = exports.CacheVersionManager = exports.CacheInvalidator = exports.StampedeProtection = exports.CacheWarmer = exports.MultiTierCache = void 0;
var MultiTierCache_js_1 = require("./MultiTierCache.js");
Object.defineProperty(exports, "MultiTierCache", { enumerable: true, get: function () { return MultiTierCache_js_1.MultiTierCache; } });
var CacheWarmer_js_1 = require("./CacheWarmer.js");
Object.defineProperty(exports, "CacheWarmer", { enumerable: true, get: function () { return CacheWarmer_js_1.CacheWarmer; } });
var StampedeProtection_js_1 = require("./StampedeProtection.js");
Object.defineProperty(exports, "StampedeProtection", { enumerable: true, get: function () { return StampedeProtection_js_1.StampedeProtection; } });
var CacheInvalidator_js_1 = require("./CacheInvalidator.js");
Object.defineProperty(exports, "CacheInvalidator", { enumerable: true, get: function () { return CacheInvalidator_js_1.CacheInvalidator; } });
var CacheVersionManager_js_1 = require("./CacheVersionManager.js");
Object.defineProperty(exports, "CacheVersionManager", { enumerable: true, get: function () { return CacheVersionManager_js_1.CacheVersionManager; } });
var CDNIntegration_js_1 = require("./CDNIntegration.js");
Object.defineProperty(exports, "CDNIntegration", { enumerable: true, get: function () { return CDNIntegration_js_1.CDNIntegration; } });
__exportStar(require("./types.js"), exports);
