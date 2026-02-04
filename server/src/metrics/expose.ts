import * as promClient from 'prom-client';

const client: any = (promClient as any).default || promClient;
const defaultRegistry = client.register;
const Registry = client.Registry;

// Lazy-load the legacy registry to avoid top-level await issues in test environments
let cachedLegacy: any | null | undefined;
async function getLegacyRegistry(): Promise<any | null> {
  if (cachedLegacy !== undefined) return cachedLegacy;
  try {
    const mod: any = await import('../monitoring/metrics.js');
    cachedLegacy = (mod.registry ?? mod.default ?? null);
  } catch {
    cachedLegacy = null;
  }
  return cachedLegacy;
}

let cachedMerged: any | null = null;
async function getMerged(): Promise<any> {
  if (cachedMerged) return cachedMerged;
  const legacy = await getLegacyRegistry();
  if (!legacy || legacy === defaultRegistry) {
    cachedMerged = defaultRegistry;
    return cachedMerged;
  }
  try {
    cachedMerged = Registry.merge([defaultRegistry, legacy]);
  } catch (e: any) {
    console.warn(
      '[metrics] Registry.merge failed, serving defaultRegistry only:',
      (e as Error).message,
    );
    cachedMerged = defaultRegistry;
  }
  return cachedMerged!;
}

export async function metricsText(): Promise<string> {
  const reg = await getMerged();
  return reg.metrics();
}

export function metricsContentType(): string {
  // contentType is identical across registries; use default
  return defaultRegistry.contentType || 'text/plain; version=0.0.4; charset=utf-8';
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
