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

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginExecutionResult,
  PluginEvent,
  PluginAuditEntry,
  PluginCapability,
  PluginStatus,
} from './types/Plugin.js';
import { PluginRegistry } from './PluginRegistry.js';
import { PluginSandbox } from './PluginSandbox.js';
import { createDataEnvelope, DataEnvelope, GovernanceResult } from '../types/data-envelope.js';
import { Principal } from '../types/identity.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface ExecuteOptions {
  timeout?: number;
  simulation?: boolean;
  skipGovernance?: boolean;
}

export interface PluginEventPayload {
  event: PluginEvent;
  data: Record<string, unknown>;
  source: string;
  timestamp: string;
}

// ============================================================================
// Plugin Manager Implementation
// ============================================================================

export class PluginManager {
  private pool: Pool;
  private registry: PluginRegistry;
  private sandbox: PluginSandbox;
  private eventSubscriptions: Map<PluginEvent, Set<string>> = new Map();

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({ connectionString: process.env.DATABASE_URL });
    this.registry = new PluginRegistry(this.pool);
    this.sandbox = new PluginSandbox();
  }

  /**
   * Install a plugin
   */
  async installPlugin(
    manifest: PluginManifest,
    plugin: Plugin,
    principal: Principal
  ): Promise<DataEnvelope<{ success: boolean; pluginId: string }>> {
    try {
      // Check if principal has permission to install plugins
      if (!this.hasCapability(principal, 'admin:full')) {
        return createDataEnvelope(
          { success: false, pluginId: manifest.id },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.DENY,
            policyId: 'plugin-install',
            reason: 'Insufficient permissions to install plugins',
            evaluator: 'PluginManager',
          }
        );
      }

      // Register the plugin
      const result = await this.registry.register(manifest, plugin, principal.id);
      if (!result.data.success) {
        return createDataEnvelope(
          { success: false, pluginId: manifest.id },
          { source: 'PluginManager', actor: principal.id },
          result.governance
        );
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
        governanceVerdict: GovernanceResult.ALLOW,
      });

      logger.info({ pluginId: manifest.id }, 'Plugin installed');

      return createDataEnvelope(
        { success: true, pluginId: manifest.id },
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-install',
          reason: 'Plugin installed successfully',
          evaluator: 'PluginManager',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId: manifest.id }, 'Failed to install plugin');
      throw error;
    }
  }

  /**
   * Enable a plugin for a tenant
   */
  async enablePlugin(
    pluginId: string,
    tenantId: string,
    config: Record<string, unknown>,
    principal: Principal
  ): Promise<DataEnvelope<{ success: boolean }>> {
    try {
      // Get plugin
      const pluginResult = await this.registry.getPlugin(pluginId, principal.id);
      if (!pluginResult.data) {
        return createDataEnvelope(
          { success: false },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.DENY,
            policyId: 'plugin-enable',
            reason: 'Plugin not found',
            evaluator: 'PluginManager',
          }
        );
      }

      const plugin = this.registry.getPluginInstance(pluginId);
      if (!plugin) {
        return createDataEnvelope(
          { success: false },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.DENY,
            policyId: 'plugin-enable',
            reason: 'Plugin not loaded',
            evaluator: 'PluginManager',
          }
        );
      }

      // Validate config
      if (plugin.validateConfig) {
        const validation = await plugin.validateConfig(config);
        if (!validation.valid) {
          return createDataEnvelope(
            { success: false },
            { source: 'PluginManager', actor: principal.id },
            {
              result: GovernanceResult.DENY,
              policyId: 'plugin-enable',
              reason: `Invalid config: ${validation.errors?.join(', ')}`,
              evaluator: 'PluginManager',
            }
          );
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
        governanceVerdict: GovernanceResult.ALLOW,
      });

      logger.info({ pluginId, tenantId }, 'Plugin enabled for tenant');

      return createDataEnvelope(
        { success: true },
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-enable',
          reason: 'Plugin enabled',
          evaluator: 'PluginManager',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId }, 'Failed to enable plugin');
      throw error;
    }
  }

  /**
   * Disable a plugin for a tenant
   */
  async disablePlugin(
    pluginId: string,
    tenantId: string,
    principal: Principal
  ): Promise<DataEnvelope<{ success: boolean }>> {
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
        governanceVerdict: GovernanceResult.ALLOW,
      });

      logger.info({ pluginId, tenantId }, 'Plugin disabled for tenant');

      return createDataEnvelope(
        { success: true },
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-disable',
          reason: 'Plugin disabled',
          evaluator: 'PluginManager',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId }, 'Failed to disable plugin');
      throw error;
    }
  }

  /**
   * Execute a plugin action
   */
  async executeAction(
    pluginId: string,
    action: string,
    params: Record<string, unknown>,
    principal: Principal,
    options: ExecuteOptions = {}
  ): Promise<DataEnvelope<PluginExecutionResult>> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    try {
      // Get tenant config
      const configResult = await this.registry.getTenantConfig(pluginId, principal.tenantId, principal.id);
      if (!configResult.data?.enabled) {
        return createDataEnvelope(
          { success: false, error: 'Plugin not enabled for this tenant' },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.DENY,
            policyId: 'plugin-execute',
            reason: 'Plugin not enabled for tenant',
            evaluator: 'PluginManager',
          }
        );
      }

      // Get plugin instance
      const plugin = this.registry.getPluginInstance(pluginId);
      if (!plugin) {
        return createDataEnvelope(
          { success: false, error: 'Plugin not loaded' },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.DENY,
            policyId: 'plugin-execute',
            reason: 'Plugin not loaded',
            evaluator: 'PluginManager',
          }
        );
      }

      // Create execution context
      const context: PluginContext = {
        tenantId: principal.tenantId,
        principal,
        config: configResult.data.config,
        correlationId,
        timestamp: new Date().toISOString(),
        simulation: options.simulation,
      };

      // Execute in sandbox
      const result = await this.sandbox.execute(
        plugin,
        action,
        params,
        context,
        options.timeout || 30000
      );

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
        output: result.data as Record<string, unknown>,
        error: result.error,
        governanceVerdict: result.success ? GovernanceResult.ALLOW : GovernanceResult.DENY,
      });

      logger.info({ pluginId, action, duration, success: result.success }, 'Plugin action executed');

      return createDataEnvelope(
        result,
        { source: 'PluginManager', actor: principal.id },
        {
          result: result.success ? GovernanceResult.ALLOW : GovernanceResult.DENY,
          policyId: 'plugin-execute',
          reason: result.success ? 'Action executed successfully' : result.error || 'Execution failed',
          evaluator: 'PluginManager',
        }
      );
    } catch (error: any) {
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
        governanceVerdict: GovernanceResult.DENY,
      });

      logger.error({ error, pluginId, action }, 'Plugin execution failed');

      return createDataEnvelope(
        { success: false, error: error.message },
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.DENY,
          policyId: 'plugin-execute',
          reason: error.message,
          evaluator: 'PluginManager',
        }
      );
    }
  }

  /**
   * Emit an event to all subscribed plugins
   */
  async emitEvent(
    event: PluginEvent,
    payload: Record<string, unknown>,
    source: string,
    tenantId: string
  ): Promise<void> {
    const subscribers = this.eventSubscriptions.get(event);
    if (!subscribers || subscribers.size === 0) return;

    for (const pluginId of subscribers) {
      try {
        const plugin = this.registry.getPluginInstance(pluginId);
        if (!plugin?.onEvent) continue;

        // Check if plugin is enabled for tenant
        const configResult = await this.registry.getTenantConfig(pluginId, tenantId, 'system');
        if (!configResult.data?.enabled) continue;

        const context: PluginContext = {
          tenantId,
          principal: {
            kind: 'service',
            id: 'system',
            tenantId,
            roles: ['system'],
            scopes: [],
          },
          config: configResult.data.config,
          correlationId: uuidv4(),
          timestamp: new Date().toISOString(),
        };

        await plugin.onEvent(event, payload, context);
      } catch (error: any) {
        logger.error({ error, pluginId, event }, 'Plugin event handler error');
      }
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(
    pluginId: string,
    principal: Principal
  ): Promise<DataEnvelope<{ success: boolean }>> {
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
        governanceVerdict: GovernanceResult.ALLOW,
      });

      logger.info({ pluginId }, 'Plugin uninstalled');

      return createDataEnvelope(
        { success: true },
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-uninstall',
          reason: 'Plugin uninstalled',
          evaluator: 'PluginManager',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId }, 'Failed to uninstall plugin');
      throw error;
    }
  }

  /**
   * Get plugin health status
   */
  async getHealthStatus(
    pluginId: string,
    principal: Principal
  ): Promise<DataEnvelope<{ healthy: boolean; message?: string }>> {
    try {
      const plugin = this.registry.getPluginInstance(pluginId);
      if (!plugin) {
        return createDataEnvelope(
          { healthy: false, message: 'Plugin not loaded' },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.ALLOW,
            policyId: 'plugin-health',
            reason: 'Health check completed',
            evaluator: 'PluginManager',
          }
        );
      }

      if (!plugin.healthCheck) {
        return createDataEnvelope(
          { healthy: true, message: 'No health check defined' },
          { source: 'PluginManager', actor: principal.id },
          {
            result: GovernanceResult.ALLOW,
            policyId: 'plugin-health',
            reason: 'Health check completed',
            evaluator: 'PluginManager',
          }
        );
      }

      const health = await plugin.healthCheck();

      return createDataEnvelope(
        health,
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-health',
          reason: 'Health check completed',
          evaluator: 'PluginManager',
        }
      );
    } catch (error: any) {
      return createDataEnvelope(
        { healthy: false, message: error.message },
        { source: 'PluginManager', actor: principal.id },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-health',
          reason: 'Health check failed',
          evaluator: 'PluginManager',
        }
      );
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private createContext(principal: Principal, config: Record<string, unknown>): PluginContext {
    return {
      tenantId: principal.tenantId,
      principal,
      config,
      correlationId: uuidv4(),
      timestamp: new Date().toISOString(),
    };
  }

  private subscribeToEvent(pluginId: string, event: PluginEvent): void {
    if (!this.eventSubscriptions.has(event)) {
      this.eventSubscriptions.set(event, new Set());
    }
    this.eventSubscriptions.get(event)!.add(pluginId);
  }

  private hasCapability(principal: Principal, capability: PluginCapability): boolean {
    // Simplified capability check - would integrate with RBAC in production
    return principal.roles.includes('ADMIN') || principal.roles.includes('admin');
  }

  private async updateExecutionStats(pluginId: string, success: boolean): Promise<void> {
    const updateField = success ? 'execution_count' : 'error_count';
    await this.pool.query(
      `UPDATE plugins SET ${updateField} = ${updateField} + 1, last_executed_at = $2 WHERE id = $1`,
      [pluginId, new Date().toISOString()]
    );
  }

  private async logAudit(entry: Partial<PluginAuditEntry> & { pluginId: string; tenantId: string; action: string; actorId: string }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO plugin_audit_log (id, plugin_id, tenant_id, action, actor_id, timestamp, duration, success, input, output, error, governance_verdict)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          uuidv4(),
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
          entry.governanceVerdict || GovernanceResult.ALLOW,
        ]
      );
    } catch (error: any) {
      logger.error({ error }, 'Failed to log plugin audit');
    }
  }
}

// Export singleton
export const pluginManager = new PluginManager();
export default PluginManager;
