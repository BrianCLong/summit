import { register as defaultRegistry, Registry } from 'prom-client';

// Lazy-load the legacy registry to avoid top-level await issues in test environments
let cachedLegacy: Registry | null | undefined;
async function getLegacyRegistry(): Promise<Registry | null> {
  if (cachedLegacy !== undefined) return cachedLegacy;
  try {
    const mod: any = await import('../monitoring/metrics.js');
    cachedLegacy = (mod.registry ?? mod.default ?? null) as Registry | null;
  } catch {
    cachedLegacy = null;
  }
  return cachedLegacy;
}

let cachedMerged: Registry | null = null;
async function getMerged(): Promise<Registry> {
  if (cachedMerged) return cachedMerged;
  const legacy = await getLegacyRegistry();
  if (!legacy || legacy === (defaultRegistry as unknown as Registry)) {
    cachedMerged = defaultRegistry;
    return cachedMerged;
  }
  try {
    cachedMerged = Registry.merge([defaultRegistry, legacy]);
  } catch (e) {
    console.warn('[metrics] Registry.merge failed, serving defaultRegistry only:', (e as Error).message);
    cachedMerged = defaultRegistry;
  }
  return cachedMerged;
}

export async function metricsText(): Promise<string> {
  const reg = await getMerged();
  return reg.metrics();
}

export function metricsContentType(): string {
  // contentType is identical across registries; use default
  return defaultRegistry.contentType;
}

// Optional: expose individual registries for debugging routes
export async function defaultMetricsText(): Promise<string> {
  return defaultRegistry.metrics();
}
export async function legacyMetricsText(): Promise<string> {
  const legacy = await getLegacyRegistry();
  if (!legacy) return '# no legacy registry';
  return legacy.metrics();
}
