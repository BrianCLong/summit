import { Plugin, PluginContext } from './sdk';
import { MarketplaceService } from '../marketplace/service';
import { PluginRuntime } from './runtime';
import { PluginStatus } from './types';
import { TrustTier } from '../marketplace/types';

// Legacy registry for built-ins
const legacyRegistry = new Map<string, Plugin<any, any>>();

export function register<TInput = any, TOutput = any>(name: string, plugin: Plugin<TInput, TOutput>) {
  legacyRegistry.set(name, plugin);
}

export function get<TInput = any, TOutput = any>(name: string): Plugin<TInput, TOutput> | undefined {
  return legacyRegistry.get(name);
}

export function registerBuiltins() {
  try {
    const { shodanIpLookup } = require('./shodan');
    register(shodanIpLookup.name, shodanIpLookup);
  } catch { }
  try {
    const { vtHashLookup } = require('./virustotal');
    register(vtHashLookup.name, vtHashLookup);
  } catch { }
  try {
    const { csQuery } = require('./crowdstrike');
    register(csQuery.name, csQuery);
  } catch { }
}

export interface PluginDependencies {
  vault?: { read: (path: string) => Promise<any> };
  cache?: { get: (k: string) => Promise<any>; set: (k: string, v: any, ttl?: number) => Promise<void> };
  metrics?: {
    invocations: { labels: (id: string, status: string, tenant: string) => { inc: () => void } };
    errors: { labels: (id: string, tenant: string) => { inc: () => void } };
  };
  tracer?: {
    createSpan: (name: string, attributes?: any) => { setAttribute: (k: string, v: any) => void; recordException: (e: any) => void; end: () => void; } | undefined
  };
}

// Lazy-load dependencies to avoid top-level import errors in tests
let RedisCache: any;
let vaultReadKvV2: any;
let pluginInvocations: any;
let pluginErrors: any;
let otelService: any;

async function loadDependencies() {
  if (!RedisCache) {
    const redisModule = await import('../cache/redis.js');
    RedisCache = redisModule.RedisService;
  }
  if (!vaultReadKvV2) {
    const vaultModule = await import('../vault/helpers.js');
    vaultReadKvV2 = vaultModule.vaultReadKvV2;
  }
  if (!pluginInvocations) {
    const metricsModule = await import('../metrics/pluginMetrics.js');
    pluginInvocations = metricsModule.pluginInvocations;
    pluginErrors = metricsModule.pluginErrors;
  }
  if (!otelService) {
    const otelModule = await import('../middleware/observability/otel-tracing.js');
    otelService = otelModule.otelService;
  }
}

export async function runPlugin(
  idOrName: string,
  inputs: any,
  opts?: {
    tenant?: string;
    dependencies?: PluginDependencies;
  },
) {
  const deps = opts?.dependencies || {};

  // Initialize default dependencies if not provided
  let cacheClient: any;
  if (!deps.cache) {
    await loadDependencies();
    cacheClient = new RedisCache();
  }

  const cache = deps.cache || {
    get: async (k: string) => (await cacheClient.get(k)) as any,
    set: async (k: string, v: any, ttl?: number) => {
      await cacheClient.set(k, v, Math.max(1, Number(ttl || 300)));
    },
  };

  if (!deps.vault) await loadDependencies();
  const vault = deps.vault || { read: (path: string) => vaultReadKvV2(path) };

  if (!deps.metrics) await loadDependencies();
  const metrics = deps.metrics || {
    invocations: pluginInvocations,
    errors: pluginErrors
  };

  if (!deps.tracer) await loadDependencies();
  const tracer = deps.tracer || otelService;

  const tenant = opts?.tenant || 'unknown';
  const span = tracer.createSpan('plugin.run', {
    'plugin.id': idOrName,
    'tenant.id': tenant,
  });

  const baseContext = {
    vault,
    cache,
    logger: console as any,
    // Add real implementations for capabilities if needed
    fetch: global.fetch,
  };

  try {
    // 1. Check Marketplace for Managed Plugins
    const marketplace = MarketplaceService.getInstance();
    const managedPlugin = marketplace.getPlugin(idOrName);

    if (managedPlugin) {
      // 2. Enforce Status
      if (managedPlugin.status !== PluginStatus.APPROVED && managedPlugin.status !== PluginStatus.IN_REVIEW) {
        throw new Error(`Plugin ${idOrName} is not approved for execution (Status: ${managedPlugin.status})`);
      }

      // Audit Execution Start
      marketplace.audit(idOrName, 'PLUGIN_EXECUTION_START', { tenant });

      // 3. Run in Sandbox
      const res = await PluginRuntime.run(managedPlugin.code, managedPlugin.manifest, inputs, baseContext);

      marketplace.audit(idOrName, 'PLUGIN_EXECUTION_SUCCESS', { tenant });
      metrics.invocations.labels(idOrName, 'ok', tenant).inc();
      span?.setAttribute('plugin.status', 'ok');
      return res;

    } else {
      // 4. Fallback to Legacy (Internal)
      const p = legacyRegistry.get(idOrName);
      if (!p) throw new Error(`Plugin not found: ${idOrName}`);

      // Warn: executing legacy plugin without strict sandbox capabilities if not managed
      // Ideally internal legacy plugins also run via runtime but we kept legacy path for now.

      const ctx: PluginContext = {
        vault: baseContext.vault,
        cache: baseContext.cache,
        logger: baseContext.logger,
      };

      const res = await p.run(inputs, ctx);
      metrics.invocations.labels(idOrName, 'ok', tenant).inc();
      span?.setAttribute('plugin.status', 'ok');
      return res;
    }

  } catch (e: any) {
    // Audit Execution Failure
    if (MarketplaceService.getInstance().getPlugin(idOrName)) {
      MarketplaceService.getInstance().audit(idOrName, 'PLUGIN_EXECUTION_FAILURE', { tenant, error: e.message });
    }

    metrics.invocations.labels(idOrName, 'error', tenant).inc();
    metrics.errors.labels(idOrName, tenant).inc();
    span?.setAttribute('plugin.status', 'error');
    span?.recordException(e);
    throw e;
  } finally {
    span?.end();
  }
}
