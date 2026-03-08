"use strict";
// @ts-nocheck
/**
 * Plugin Manager
 *
 * Manages plugin lifecycle, execution, and governance integration.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module plugins/PluginManager
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginManager = exports.PluginManager = void 0;
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const PluginRegistry_js_1 = require("./PluginRegistry.js");
const PluginSandbox_js_1 = require("./PluginSandbox.js");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Plugin Manager Implementation
// ============================================================================
class PluginManager {
    pool;
    registry;
    sandbox;
    eventSubscriptions = new Map();
    constructor(pool) {
        this.pool = pool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.registry = new PluginRegistry_js_1.PluginRegistry(this.pool);
        this.sandbox = new PluginSandbox_js_1.PluginSandbox();
    }
    /**
     * Install a plugin
     */
    async installPlugin(manifest, plugin, principal) {
        try {
            // Check if principal has permission to install plugins
            if (!this.hasCapability(principal, 'admin:full')) {
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, pluginId: manifest.id }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.DENY,
                    policyId: 'plugin-install',
                    reason: 'Insufficient permissions to install plugins',
                    evaluator: 'PluginManager',
                });
            }
            // Register the plugin
            const result = await this.registry.register(manifest, plugin, principal.id);
            if (!result.data.success) {
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, pluginId: manifest.id }, { source: 'PluginManager', actor: principal.id }, result.governance);
            }
            // Update status to installed
            await this.registry.updateStatus(manifest.id, 'installed', principal.id);
            // Initialize plugin
            const context = this.createContext(principal, {});
            await plugin.initialize(context);
            // Register event subscriptions
            if (manifest.hooks) {
                for (const hook of manifest.hooks) {
                    this.subscribeToEvent(manifest.id, hook.event);
                }
            }
            // Audit log
            await this.logAudit({
                pluginId: manifest.id,
                tenantId: principal.tenantId,
                action: 'install',
                actorId: principal.id,
                success: true,
                governanceVerdict: data_envelope_js_1.GovernanceResult.ALLOW,
            });
            logger_js_1.default.info({ pluginId: manifest.id }, 'Plugin installed');
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true, pluginId: manifest.id }, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'plugin-install',
                reason: 'Plugin installed successfully',
                evaluator: 'PluginManager',
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, pluginId: manifest.id }, 'Failed to install plugin');
            throw error;
        }
    }
    /**
     * Enable a plugin for a tenant
     */
    async enablePlugin(pluginId, tenantId, config, principal) {
        try {
            // Get plugin
            const pluginResult = await this.registry.getPlugin(pluginId, principal.id);
            if (!pluginResult.data) {
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.DENY,
                    policyId: 'plugin-enable',
                    reason: 'Plugin not found',
                    evaluator: 'PluginManager',
                });
            }
            const plugin = this.registry.getPluginInstance(pluginId);
            if (!plugin) {
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.DENY,
                    policyId: 'plugin-enable',
                    reason: 'Plugin not loaded',
                    evaluator: 'PluginManager',
                });
            }
            // Validate config
            if (plugin.validateConfig) {
                const validation = await plugin.validateConfig(config);
                if (!validation.valid) {
                    return (0, data_envelope_js_1.createDataEnvelope)({ success: false }, { source: 'PluginManager', actor: principal.id }, {
                        result: data_envelope_js_1.GovernanceResult.DENY,
                        policyId: 'plugin-enable',
                        reason: `Invalid config: ${validation.errors?.join(', ')}`,
                        evaluator: 'PluginManager',
                    });
                }
            }
            // Save tenant config
            await this.registry.saveTenantConfig(pluginId, tenantId, config, true, principal.id);
            // Update global status if not already enabled
            if (pluginResult.data.status !== 'enabled') {
                await this.registry.updateStatus(pluginId, 'enabled', principal.id);
            }
            // Audit log
            await this.logAudit({
                pluginId,
                tenantId,
                action: 'enable',
                actorId: principal.id,
                success: true,
                governanceVerdict: data_envelope_js_1.GovernanceResult.ALLOW,
            });
            logger_js_1.default.info({ pluginId, tenantId }, 'Plugin enabled for tenant');
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true }, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'plugin-enable',
                reason: 'Plugin enabled',
                evaluator: 'PluginManager',
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, pluginId }, 'Failed to enable plugin');
            throw error;
        }
    }
    /**
     * Disable a plugin for a tenant
     */
    async disablePlugin(pluginId, tenantId, principal) {
        try {
            await this.registry.saveTenantConfig(pluginId, tenantId, {}, false, principal.id);
            const plugin = this.registry.getPluginInstance(pluginId);
            if (plugin?.cleanup) {
                const context = this.createContext(principal, {});
                await plugin.cleanup(context);
            }
            // Audit log
            await this.logAudit({
                pluginId,
                tenantId,
                action: 'disable',
                actorId: principal.id,
                success: true,
                governanceVerdict: data_envelope_js_1.GovernanceResult.ALLOW,
            });
            logger_js_1.default.info({ pluginId, tenantId }, 'Plugin disabled for tenant');
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true }, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'plugin-disable',
                reason: 'Plugin disabled',
                evaluator: 'PluginManager',
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, pluginId }, 'Failed to disable plugin');
            throw error;
        }
    }
    /**
     * Execute a plugin action
     */
    async executeAction(pluginId, action, params, principal, options = {}) {
        const startTime = Date.now();
        const correlationId = (0, uuid_1.v4)();
        try {
            // Get tenant config
            const configResult = await this.registry.getTenantConfig(pluginId, principal.tenantId, principal.id);
            if (!configResult.data?.enabled) {
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, error: 'Plugin not enabled for this tenant' }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.DENY,
                    policyId: 'plugin-execute',
                    reason: 'Plugin not enabled for tenant',
                    evaluator: 'PluginManager',
                });
            }
            // Get plugin instance
            const plugin = this.registry.getPluginInstance(pluginId);
            if (!plugin) {
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, error: 'Plugin not loaded' }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.DENY,
                    policyId: 'plugin-execute',
                    reason: 'Plugin not loaded',
                    evaluator: 'PluginManager',
                });
            }
            // Create execution context
            const context = {
                tenantId: principal.tenantId,
                principal,
                config: configResult.data.config,
                correlationId,
                timestamp: new Date().toISOString(),
                simulation: options.simulation,
            };
            // Execute in sandbox
            const result = await this.sandbox.execute(plugin, action, params, context, options.timeout || 30000);
            const duration = Date.now() - startTime;
            // Update execution stats
            await this.updateExecutionStats(pluginId, result.success);
            // Audit log
            await this.logAudit({
                pluginId,
                tenantId: principal.tenantId,
                action,
                actorId: principal.id,
                success: result.success,
                duration,
                input: params,
                output: result.data,
                error: result.error,
                governanceVerdict: result.success ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.DENY,
            });
            logger_js_1.default.info({ pluginId, action, duration, success: result.success }, 'Plugin action executed');
            return (0, data_envelope_js_1.createDataEnvelope)(result, { source: 'PluginManager', actor: principal.id }, {
                result: result.success ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.DENY,
                policyId: 'plugin-execute',
                reason: result.success ? 'Action executed successfully' : result.error || 'Execution failed',
                evaluator: 'PluginManager',
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            await this.updateExecutionStats(pluginId, false);
            await this.logAudit({
                pluginId,
                tenantId: principal.tenantId,
                action,
                actorId: principal.id,
                success: false,
                duration,
                error: error.message,
                governanceVerdict: data_envelope_js_1.GovernanceResult.DENY,
            });
            logger_js_1.default.error({ error, pluginId, action }, 'Plugin execution failed');
            return (0, data_envelope_js_1.createDataEnvelope)({ success: false, error: error.message }, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.DENY,
                policyId: 'plugin-execute',
                reason: error.message,
                evaluator: 'PluginManager',
            });
        }
    }
    /**
     * Emit an event to all subscribed plugins
     */
    async emitEvent(event, payload, source, tenantId) {
        const subscribers = this.eventSubscriptions.get(event);
        if (!subscribers || subscribers.size === 0)
            return;
        for (const pluginId of subscribers) {
            try {
                const plugin = this.registry.getPluginInstance(pluginId);
                if (!plugin?.onEvent)
                    continue;
                // Check if plugin is enabled for tenant
                const configResult = await this.registry.getTenantConfig(pluginId, tenantId, 'system');
                if (!configResult.data?.enabled)
                    continue;
                const context = {
                    tenantId,
                    principal: {
                        kind: 'service',
                        id: 'system',
                        tenantId,
                        roles: ['system'],
                        scopes: [],
                    },
                    config: configResult.data.config,
                    correlationId: (0, uuid_1.v4)(),
                    timestamp: new Date().toISOString(),
                };
                await plugin.onEvent(event, payload, context);
            }
            catch (error) {
                logger_js_1.default.error({ error, pluginId, event }, 'Plugin event handler error');
            }
        }
    }
    /**
     * Uninstall a plugin
     */
    async uninstallPlugin(pluginId, principal) {
        try {
            const plugin = this.registry.getPluginInstance(pluginId);
            if (plugin?.cleanup) {
                const context = this.createContext(principal, {});
                await plugin.cleanup(context);
            }
            // Remove event subscriptions
            for (const [, subscribers] of this.eventSubscriptions) {
                subscribers.delete(pluginId);
            }
            // Unregister
            await this.registry.unregister(pluginId, principal.id);
            // Remove tenant configs
            await this.pool.query('DELETE FROM plugin_tenant_config WHERE plugin_id = $1', [pluginId]);
            // Audit log
            await this.logAudit({
                pluginId,
                tenantId: principal.tenantId,
                action: 'uninstall',
                actorId: principal.id,
                success: true,
                governanceVerdict: data_envelope_js_1.GovernanceResult.ALLOW,
            });
            logger_js_1.default.info({ pluginId }, 'Plugin uninstalled');
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true }, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'plugin-uninstall',
                reason: 'Plugin uninstalled',
                evaluator: 'PluginManager',
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, pluginId }, 'Failed to uninstall plugin');
            throw error;
        }
    }
    /**
     * Get plugin health status
     */
    async getHealthStatus(pluginId, principal) {
        try {
            const plugin = this.registry.getPluginInstance(pluginId);
            if (!plugin) {
                return (0, data_envelope_js_1.createDataEnvelope)({ healthy: false, message: 'Plugin not loaded' }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.ALLOW,
                    policyId: 'plugin-health',
                    reason: 'Health check completed',
                    evaluator: 'PluginManager',
                });
            }
            if (!plugin.healthCheck) {
                return (0, data_envelope_js_1.createDataEnvelope)({ healthy: true, message: 'No health check defined' }, { source: 'PluginManager', actor: principal.id }, {
                    result: data_envelope_js_1.GovernanceResult.ALLOW,
                    policyId: 'plugin-health',
                    reason: 'Health check completed',
                    evaluator: 'PluginManager',
                });
            }
            const health = await plugin.healthCheck();
            return (0, data_envelope_js_1.createDataEnvelope)(health, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'plugin-health',
                reason: 'Health check completed',
                evaluator: 'PluginManager',
            });
        }
        catch (error) {
            return (0, data_envelope_js_1.createDataEnvelope)({ healthy: false, message: error.message }, { source: 'PluginManager', actor: principal.id }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'plugin-health',
                reason: 'Health check failed',
                evaluator: 'PluginManager',
            });
        }
    }
    // --------------------------------------------------------------------------
    // Helper Methods
    // --------------------------------------------------------------------------
    createContext(principal, config) {
        return {
            tenantId: principal.tenantId,
            principal,
            config,
            correlationId: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
        };
    }
    subscribeToEvent(pluginId, event) {
        if (!this.eventSubscriptions.has(event)) {
            this.eventSubscriptions.set(event, new Set());
        }
        this.eventSubscriptions.get(event).add(pluginId);
    }
    hasCapability(principal, capability) {
        // Simplified capability check - would integrate with RBAC in production
        return principal.roles.includes('ADMIN') || principal.roles.includes('admin');
    }
    async updateExecutionStats(pluginId, success) {
        const updateField = success ? 'execution_count' : 'error_count';
        await this.pool.query(`UPDATE plugins SET ${updateField} = ${updateField} + 1, last_executed_at = $2 WHERE id = $1`, [pluginId, new Date().toISOString()]);
    }
    async logAudit(entry) {
        try {
            await this.pool.query(`INSERT INTO plugin_audit_log (id, plugin_id, tenant_id, action, actor_id, timestamp, duration, success, input, output, error, governance_verdict)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                (0, uuid_1.v4)(),
                entry.pluginId,
                entry.tenantId,
                entry.action,
                entry.actorId,
                new Date().toISOString(),
                entry.duration || 0,
                entry.success ?? true,
                entry.input ? JSON.stringify(entry.input) : null,
                entry.output ? JSON.stringify(entry.output) : null,
                entry.error || null,
                entry.governanceVerdict || data_envelope_js_1.GovernanceResult.ALLOW,
            ]);
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Failed to log plugin audit');
        }
    }
}
exports.PluginManager = PluginManager;
// Export singleton
exports.pluginManager = new PluginManager();
exports.default = PluginManager;
