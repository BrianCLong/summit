"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsText = metricsText;
exports.metricsContentType = metricsContentType;
exports.defaultMetricsText = defaultMetricsText;
exports.legacyMetricsText = legacyMetricsText;
const promClient = __importStar(require("prom-client"));
const client = promClient.default || promClient;
const defaultRegistry = client.register;
const Registry = client.Registry;
// Lazy-load the legacy registry to avoid top-level await issues in test environments
let cachedLegacy;
async function getLegacyRegistry() {
    if (cachedLegacy !== undefined)
        return cachedLegacy;
    try {
        const mod = await Promise.resolve().then(() => __importStar(require('../monitoring/metrics.js')));
        cachedLegacy = (mod.registry ?? mod.default ?? null);
    }
    catch {
        cachedLegacy = null;
    }
    return cachedLegacy;
}
let cachedMerged = null;
async function getMerged() {
    if (cachedMerged)
        return cachedMerged;
    const legacy = await getLegacyRegistry();
    if (!legacy || legacy === defaultRegistry) {
        cachedMerged = defaultRegistry;
        return cachedMerged;
    }
    try {
        cachedMerged = Registry.merge([defaultRegistry, legacy]);
    }
    catch (e) {
        console.warn('[metrics] Registry.merge failed, serving defaultRegistry only:', e.message);
        cachedMerged = defaultRegistry;
    }
    return cachedMerged;
}
async function metricsText() {
    const reg = await getMerged();
    return reg.metrics();
}
function metricsContentType() {
    // contentType is identical across registries; use default
    return defaultRegistry.contentType || 'text/plain; version=0.0.4; charset=utf-8';
}
// Optional: expose individual registries for debugging routes
async function defaultMetricsText() {
    return defaultRegistry.metrics();
}
async function legacyMetricsText() {
    const legacy = await getLegacyRegistry();
    if (!legacy)
        return '# no legacy registry';
    return legacy.metrics();
}
