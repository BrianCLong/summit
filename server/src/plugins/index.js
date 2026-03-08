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
exports.register = register;
exports.get = get;
exports.registerBuiltins = registerBuiltins;
exports.runPlugin = runPlugin;
const service_js_1 = require("../marketplace/service.js");
const runtime_js_1 = require("./runtime.js");
const types_js_1 = require("./types.js");
// Legacy registry for built-ins
const legacyRegistry = new Map();
function register(name, plugin) {
    legacyRegistry.set(name, plugin);
}
function get(name) {
    return legacyRegistry.get(name);
}
function registerBuiltins() {
    try {
        const { shodanIpLookup } = require('./shodan');
        register(shodanIpLookup.name, shodanIpLookup);
    }
    catch { }
    try {
        const { vtHashLookup } = require('./virustotal');
        register(vtHashLookup.name, vtHashLookup);
    }
    catch { }
    try {
        const { csQuery } = require('./crowdstrike');
        register(csQuery.name, csQuery);
    }
    catch { }
}
// Lazy-load dependencies to avoid top-level import errors in tests
let RedisCache;
let vaultReadKvV2;
let pluginInvocations;
let pluginErrors;
let otelService;
async function loadDependencies() {
    if (!RedisCache) {
        const redisModule = await Promise.resolve().then(() => __importStar(require('../cache/redis.js')));
        RedisCache = redisModule.RedisService;
    }
    if (!vaultReadKvV2) {
        const vaultModule = await Promise.resolve().then(() => __importStar(require('../vault/helpers.js')));
        vaultReadKvV2 = vaultModule.vaultReadKvV2;
    }
    if (!pluginInvocations) {
        const metricsModule = await Promise.resolve().then(() => __importStar(require('../metrics/pluginMetrics.js')));
        pluginInvocations = metricsModule.pluginInvocations;
        pluginErrors = metricsModule.pluginErrors;
    }
    if (!otelService) {
        const otelModule = await Promise.resolve().then(() => __importStar(require('../middleware/observability/otel-tracing.js')));
        otelService = otelModule.otelService;
    }
}
async function runPlugin(idOrName, inputs, opts) {
    const deps = opts?.dependencies || {};
    // Initialize default dependencies if not provided
    let cacheClient;
    if (!deps.cache) {
        await loadDependencies();
        cacheClient = new RedisCache();
    }
    const cache = deps.cache || {
        get: async (k) => (await cacheClient.get(k)),
        set: async (k, v, ttl) => {
            await cacheClient.set(k, v, Math.max(1, Number(ttl || 300)));
        },
    };
    if (!deps.vault)
        await loadDependencies();
    const vault = deps.vault || { read: (path) => vaultReadKvV2(path) };
    if (!deps.metrics)
        await loadDependencies();
    const metrics = deps.metrics || {
        invocations: pluginInvocations,
        errors: pluginErrors
    };
    if (!deps.tracer)
        await loadDependencies();
    const tracer = deps.tracer || otelService;
    const tenant = opts?.tenant || 'unknown';
    const span = tracer.createSpan('plugin.run', {
        'plugin.id': idOrName,
        'tenant.id': tenant,
    });
    const baseContext = {
        vault,
        cache,
        logger: console,
        // Add real implementations for capabilities if needed
        fetch: global.fetch,
    };
    try {
        // 1. Check Marketplace for Managed Plugins
        const marketplace = service_js_1.MarketplaceService.getInstance();
        const managedPlugin = marketplace.getPlugin(idOrName);
        if (managedPlugin) {
            // 2. Enforce Status
            if (managedPlugin.status !== types_js_1.PluginStatus.APPROVED && managedPlugin.status !== types_js_1.PluginStatus.IN_REVIEW) {
                throw new Error(`Plugin ${idOrName} is not approved for execution (Status: ${managedPlugin.status})`);
            }
            // Audit Execution Start
            marketplace.audit(idOrName, 'PLUGIN_EXECUTION_START', { tenant });
            // 3. Run in Sandbox
            const res = await runtime_js_1.PluginRuntime.run(managedPlugin.code, managedPlugin.manifest, inputs, baseContext);
            marketplace.audit(idOrName, 'PLUGIN_EXECUTION_SUCCESS', { tenant });
            metrics.invocations.labels(idOrName, 'ok', tenant).inc();
            span?.setAttribute('plugin.status', 'ok');
            return res;
        }
        else {
            // 4. Fallback to Legacy (Internal)
            const p = legacyRegistry.get(idOrName);
            if (!p)
                throw new Error(`Plugin not found: ${idOrName}`);
            // Warn: executing legacy plugin without strict sandbox capabilities if not managed
            // Ideally internal legacy plugins also run via runtime but we kept legacy path for now.
            const ctx = {
                vault: baseContext.vault,
                cache: baseContext.cache,
                logger: baseContext.logger,
            };
            const res = await p.run(inputs, ctx);
            metrics.invocations.labels(idOrName, 'ok', tenant).inc();
            span?.setAttribute('plugin.status', 'ok');
            return res;
        }
    }
    catch (e) {
        // Audit Execution Failure
        if (service_js_1.MarketplaceService.getInstance().getPlugin(idOrName)) {
            service_js_1.MarketplaceService.getInstance().audit(idOrName, 'PLUGIN_EXECUTION_FAILURE', { tenant, error: e.message });
        }
        metrics.invocations.labels(idOrName, 'error', tenant).inc();
        metrics.errors.labels(idOrName, tenant).inc();
        span?.setAttribute('plugin.status', 'error');
        span?.recordException(e);
        throw e;
    }
    finally {
        span?.end();
    }
}
