import { register as defaultRegistry, Registry } from 'prom-client';
// Lazy-load the legacy registry to avoid top-level await issues in test environments
let cachedLegacy;
async function getLegacyRegistry() {
    if (cachedLegacy !== undefined)
        return cachedLegacy;
    try {
        const mod = await import('../monitoring/metrics.js');
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
export async function metricsText() {
    const reg = await getMerged();
    return reg.metrics();
}
export function metricsContentType() {
    // contentType is identical across registries; use default
    return defaultRegistry.contentType;
}
// Optional: expose individual registries for debugging routes
export async function defaultMetricsText() {
    return defaultRegistry.metrics();
}
export async function legacyMetricsText() {
    const legacy = await getLegacyRegistry();
    if (!legacy)
        return '# no legacy registry';
    return legacy.metrics();
}
//# sourceMappingURL=expose.js.map