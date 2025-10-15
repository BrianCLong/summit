import path from 'node:path';
import { Plugin, PluginContext } from './sdk';
import { PluginLoader } from './plugin-loader';
import { vaultReadKvV2 } from '../vault/helpers';
import { RedisCache } from '../cache/redis.js';
import { pluginInvocations, pluginErrors } from '../metrics/pluginMetrics.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

const registry = new Map<string, Plugin<any, any>>();
let customPluginLoader: PluginLoader | undefined;

export function register(name: string, plugin: Plugin) {
  registry.set(name, plugin);
}

export function get(name: string): Plugin | undefined {
  return registry.get(name);
}

export function registerBuiltins() {
  try { const { shodanIpLookup } = require('./shodan'); register(shodanIpLookup.name, shodanIpLookup); } catch {}
  try { const { vtHashLookup } = require('./virustotal'); register(vtHashLookup.name, vtHashLookup); } catch {}
  try { const { csQuery } = require('./crowdstrike'); register(csQuery.name, csQuery); } catch {}
}

export async function registerCustomPlugins(options?: { directory?: string; timeoutMs?: number }) {
  const directory = options?.directory ?? path.resolve(process.cwd(), 'server/plugins');
  const loader = new PluginLoader({
    rootDir: directory,
    defaultTimeoutMs: options?.timeoutMs,
    baseAllowedModules: [],
  });
  const loaded = await loader.loadAll();
  for (const plugin of loaded) {
    register(plugin.manifest.name, {
      name: plugin.manifest.name,
      run: async (inputs, ctx) => loader.execute(plugin.manifest.name, inputs, ctx),
    });
  }
  customPluginLoader = loader;
  return loader.listManifests();
}

export function getCustomPluginLoader() {
  return customPluginLoader;
}

export async function runPlugin(name: string, inputs: any, opts?: { tenant?: string }) {
  const p = registry.get(name);
  if (!p) throw new Error(`Plugin not found: ${name}`);
  const cache = new RedisCache();
  const ctx: PluginContext = {
    vault: { read: (path: string) => vaultReadKvV2(path) },
    cache: {
      get: async (k: string) => (await cache.get(k)) as any,
      set: async (k: string, v: any, ttl?: number) => cache.set(k, v, Math.max(1, Number(ttl || 300))),
    },
    logger: console as any,
  };
  const tenant = opts?.tenant || 'unknown';
  const span = otelService.createSpan('plugin.run', { 'plugin.name': name, 'tenant.id': tenant });
  try {
    const res = await p.run(inputs, ctx);
    pluginInvocations.labels(name, 'ok', tenant).inc();
    span?.setAttribute('plugin.status', 'ok');
    return res;
  } catch (e:any) {
    pluginInvocations.labels(name, 'error', tenant).inc();
    pluginErrors.labels(name, tenant).inc();
    span?.setAttribute('plugin.status', 'error');
    span?.recordException(e);
    throw e;
  } finally {
    span?.end();
  }
}
