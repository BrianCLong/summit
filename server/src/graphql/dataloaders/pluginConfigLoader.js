"use strict";
/**
 * Plugin Config DataLoader - Batch loading for plugin configurations
 * Prevents N+1 query issues when fetching tenant plugin configurations
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module graphql/dataloaders/pluginConfigLoader
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPluginConfigLoader = createPluginConfigLoader;
exports.createAllPluginsForTenantLoader = createAllPluginsForTenantLoader;
exports.createEnabledPluginsLoader = createEnabledPluginsLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'plugin-config-dataloader-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'PluginConfigLoader',
    };
}
// ============================================================================
// Batch Load Functions
// ============================================================================
/**
 * Batch function for loading plugin configs by plugin ID
 */
async function batchLoadPluginConfigs(pluginIds, context) {
    const { redis, tenantId, pgPool } = context;
    const configMap = new Map();
    const missingIds = [];
    // 1. Try to load from Redis cache first
    if (redis) {
        try {
            const keys = pluginIds.map((id) => `plugin-config:${tenantId}:${id}`);
            const cachedValues = await redis.mget(keys);
            cachedValues.forEach((val, index) => {
                if (val) {
                    try {
                        const config = JSON.parse(val);
                        configMap.set(pluginIds[index], {
                            ...config,
                            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded from cache'),
                        });
                    }
                    catch {
                        missingIds.push(pluginIds[index]);
                    }
                }
                else {
                    missingIds.push(pluginIds[index]);
                }
            });
        }
        catch (error) {
            logger_js_1.default.warn({ error }, 'Redis cache error in pluginConfigLoader');
            missingIds.push(...pluginIds.filter(id => !configMap.has(id)));
        }
    }
    else {
        missingIds.push(...pluginIds);
    }
    // 2. Load missing configs from PostgreSQL
    if (missingIds.length > 0) {
        const client = context.pgClient || await pgPool.connect();
        const shouldRelease = !context.pgClient;
        try {
            const startTime = Date.now();
            const result = await client.query(`
        SELECT
          ptc.id,
          ptc.tenant_id,
          ptc.plugin_id,
          ptc.plugin_version,
          ptc.config,
          ptc.secret_refs,
          ptc.enabled,
          ptc.permissions,
          ptc.resource_limits,
          ptc.installed_at,
          ptc.updated_at,
          ptc.installed_by,
          ptc.status,
          ptc.metadata
        FROM plugin_tenant_config ptc
        WHERE ptc.tenant_id = $1 AND ptc.plugin_id = ANY($2)
        `, [tenantId, missingIds]);
            const dbConfigs = new Map();
            for (const row of result.rows) {
                const config = {
                    id: row.id,
                    tenantId: row.tenant_id,
                    pluginId: row.plugin_id,
                    pluginVersion: row.plugin_version,
                    config: row.config || {},
                    secrets: row.secret_refs || [],
                    enabled: row.enabled,
                    permissions: row.permissions || [],
                    resourceLimits: row.resource_limits || {
                        maxMemoryMB: 256,
                        maxCpuMs: 5000,
                        maxNetworkCallsPerMinute: 60,
                        maxStorageMB: 100,
                        timeoutMs: 30000,
                    },
                    installedAt: row.installed_at,
                    updatedAt: row.updated_at,
                    installedBy: row.installed_by,
                    status: row.status,
                    metadata: row.metadata || {},
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded from database'),
                };
                dbConfigs.set(config.pluginId, config);
                configMap.set(config.pluginId, config);
            }
            // Cache the newly fetched configs
            if (redis && dbConfigs.size > 0) {
                const pipeline = redis.pipeline();
                for (const [pluginId, config] of dbConfigs.entries()) {
                    const { governanceVerdict, secrets, ...cacheData } = config;
                    // Don't cache secrets even as references
                    pipeline.setex(`plugin-config:${tenantId}:${pluginId}`, 120, // 2 minutes TTL
                    JSON.stringify({ ...cacheData, secrets: [] }));
                }
                await pipeline.exec();
            }
            const duration = Date.now() - startTime;
            logger_js_1.default.debug({
                batchSize: missingIds.length,
                found: dbConfigs.size,
                duration,
            }, 'Plugin config batch load completed');
        }
        catch (error) {
            logger_js_1.default.error({ error, pluginIds: missingIds }, 'Error in plugin config batch loader');
        }
        finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }
    // Return configs in the same order as requested IDs (null if not found)
    return pluginIds.map((id) => configMap.get(id) || null);
}
/**
 * Batch function for loading all plugin configs for tenants
 */
async function batchLoadAllPluginConfigsForTenant(tenantIds, context) {
    const { pgPool } = context;
    const client = context.pgClient || await pgPool.connect();
    const shouldRelease = !context.pgClient;
    try {
        const result = await client.query(`
      SELECT
        ptc.id,
        ptc.tenant_id,
        ptc.plugin_id,
        ptc.plugin_version,
        ptc.config,
        ptc.secret_refs,
        ptc.enabled,
        ptc.permissions,
        ptc.resource_limits,
        ptc.installed_at,
        ptc.updated_at,
        ptc.installed_by,
        ptc.status,
        ptc.metadata
      FROM plugin_tenant_config ptc
      WHERE ptc.tenant_id = ANY($1)
      ORDER BY ptc.installed_at DESC
      `, [tenantIds]);
        // Group configs by tenant ID
        const configsByTenant = new Map();
        for (const row of result.rows) {
            const config = {
                id: row.id,
                tenantId: row.tenant_id,
                pluginId: row.plugin_id,
                pluginVersion: row.plugin_version,
                config: row.config || {},
                secrets: row.secret_refs || [],
                enabled: row.enabled,
                permissions: row.permissions || [],
                resourceLimits: row.resource_limits || {
                    maxMemoryMB: 256,
                    maxCpuMs: 5000,
                    maxNetworkCallsPerMinute: 60,
                    maxStorageMB: 100,
                    timeoutMs: 30000,
                },
                installedAt: row.installed_at,
                updatedAt: row.updated_at,
                installedBy: row.installed_by,
                status: row.status,
                metadata: row.metadata || {},
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Loaded by tenant'),
            };
            const existing = configsByTenant.get(config.tenantId) || [];
            existing.push(config);
            configsByTenant.set(config.tenantId, existing);
        }
        return tenantIds.map((tenantId) => configsByTenant.get(tenantId) || []);
    }
    catch (error) {
        logger_js_1.default.error({ error, tenantIds }, 'Error loading all plugin configs');
        return tenantIds.map(() => new Error('Failed to load plugin configs'));
    }
    finally {
        if (shouldRelease) {
            client.release();
        }
    }
}
/**
 * Batch function for loading enabled plugins for tenants
 */
async function batchLoadEnabledPlugins(tenantIds, context) {
    const { pgPool } = context;
    const client = context.pgClient || await pgPool.connect();
    const shouldRelease = !context.pgClient;
    try {
        const result = await client.query(`
      SELECT
        ptc.id,
        ptc.tenant_id,
        ptc.plugin_id,
        ptc.plugin_version,
        ptc.config,
        ptc.secret_refs,
        ptc.enabled,
        ptc.permissions,
        ptc.resource_limits,
        ptc.installed_at,
        ptc.updated_at,
        ptc.installed_by,
        ptc.status,
        ptc.metadata
      FROM plugin_tenant_config ptc
      WHERE ptc.tenant_id = ANY($1)
        AND ptc.enabled = true
        AND ptc.status = 'active'
      ORDER BY ptc.installed_at DESC
      `, [tenantIds]);
        // Group configs by tenant ID
        const configsByTenant = new Map();
        for (const row of result.rows) {
            const config = {
                id: row.id,
                tenantId: row.tenant_id,
                pluginId: row.plugin_id,
                pluginVersion: row.plugin_version,
                config: row.config || {},
                secrets: row.secret_refs || [],
                enabled: row.enabled,
                permissions: row.permissions || [],
                resourceLimits: row.resource_limits || {
                    maxMemoryMB: 256,
                    maxCpuMs: 5000,
                    maxNetworkCallsPerMinute: 60,
                    maxStorageMB: 100,
                    timeoutMs: 30000,
                },
                installedAt: row.installed_at,
                updatedAt: row.updated_at,
                installedBy: row.installed_by,
                status: row.status,
                metadata: row.metadata || {},
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Enabled plugin loaded'),
            };
            const existing = configsByTenant.get(config.tenantId) || [];
            existing.push(config);
            configsByTenant.set(config.tenantId, existing);
        }
        return tenantIds.map((tenantId) => configsByTenant.get(tenantId) || []);
    }
    catch (error) {
        logger_js_1.default.error({ error, tenantIds }, 'Error loading enabled plugins');
        return tenantIds.map(() => new Error('Failed to load enabled plugins'));
    }
    finally {
        if (shouldRelease) {
            client.release();
        }
    }
}
// ============================================================================
// Loader Creation
// ============================================================================
/**
 * Creates a new Plugin Config DataLoader
 */
function createPluginConfigLoader(context) {
    return new dataloader_1.default(
    // @ts-ignore
    (pluginIds) => batchLoadPluginConfigs(pluginIds, context), {
        cache: true,
        maxBatchSize: 50,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * Creates a DataLoader for loading all plugins for a tenant
 */
function createAllPluginsForTenantLoader(context) {
    return new dataloader_1.default((tenantIds) => batchLoadAllPluginConfigsForTenant(tenantIds, context), {
        cache: true,
        maxBatchSize: 20,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * Creates a DataLoader for loading enabled plugins for a tenant
 */
function createEnabledPluginsLoader(context) {
    return new dataloader_1.default((tenantIds) => batchLoadEnabledPlugins(tenantIds, context), {
        cache: true,
        maxBatchSize: 20,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
exports.default = createPluginConfigLoader;
