// @ts-nocheck
/**
 * Plugin Registry
 *
 * Central registry for plugin discovery, registration, and metadata management.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module plugins/PluginRegistry
 */

import { Pool } from 'pg';
import {
  Plugin,
  PluginManifest,
  PluginRegistration,
  PluginStatus,
  PluginCategory,
  TenantPluginConfig,
} from './types/Plugin.js';
import { createDataEnvelope, DataEnvelope, GovernanceResult } from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface PluginSearchFilters {
  category?: PluginCategory;
  status?: PluginStatus;
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Plugin Registry Implementation
// ============================================================================

export class PluginRegistry {
  private pool: Pool;
  private plugins: Map<string, Plugin> = new Map();

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  }

  /**
   * Register a plugin in the registry
   */
  async register(
    manifest: PluginManifest,
    plugin: Plugin,
    actorId: string
  ): Promise<DataEnvelope<{ success: boolean; registration: PluginRegistration }>> {
    try {
      // Validate manifest
      const validation = this.validateManifest(manifest);
      if (!validation.valid) {
        return createDataEnvelope(
          { success: false, registration: null as any },
          { source: 'PluginRegistry', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'plugin-registration',
            reason: `Invalid manifest: ${validation.errors?.join(', ')}`,
            evaluator: 'PluginRegistry',
          }
        );
      }

      // Check for existing plugin
      const existing = await this.pool.query(
        'SELECT id FROM plugins WHERE id = $1',
        [manifest.id]
      );

      const now = new Date().toISOString();

      if (existing.rows.length > 0) {
        // Update existing
        await this.pool.query(
          `UPDATE plugins SET
            name = $2,
            version = $3,
            description = $4,
            author = $5,
            category = $6,
            manifest = $7,
            updated_at = $8
          WHERE id = $1`,
          [
            manifest.id,
            manifest.name,
            manifest.version,
            manifest.description,
            manifest.author,
            manifest.category,
            JSON.stringify(manifest),
            now,
          ]
        );
      } else {
        // Insert new
        await this.pool.query(
          `INSERT INTO plugins (id, name, version, description, author, category, manifest, status, installed_by, installed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            manifest.id,
            manifest.name,
            manifest.version,
            manifest.description,
            manifest.author,
            manifest.category,
            JSON.stringify(manifest),
            'registered',
            actorId,
            now,
          ]
        );
      }

      // Store plugin instance in memory
      this.plugins.set(manifest.id, plugin);

      const registration: PluginRegistration = {
        id: manifest.id,
        manifest,
        status: 'registered',
        installedAt: now,
        installedBy: actorId,
        executionCount: 0,
        errorCount: 0,
        version: manifest.version,
      };

      logger.info({ pluginId: manifest.id }, 'Plugin registered');

      return createDataEnvelope(
        { success: true, registration },
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-registration',
          reason: 'Plugin registered successfully',
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId: manifest.id }, 'Failed to register plugin');
      throw error;
    }
  }

  /**
   * Get a plugin by ID
   */
  async getPlugin(
    pluginId: string,
    actorId: string
  ): Promise<DataEnvelope<PluginRegistration | null>> {
    try {
      const result = await this.pool.query(
        `SELECT
          id, name, version, description, author, category, manifest, status,
          installed_at, installed_by, enabled_at, enabled_by,
          last_executed_at, execution_count, error_count, last_error
        FROM plugins WHERE id = $1`,
        [pluginId]
      );

      if (result.rows.length === 0) {
        return createDataEnvelope(
          null,
          { source: 'PluginRegistry', actor: actorId },
          {
            result: GovernanceResult.ALLOW,
            policyId: 'plugin-read',
            reason: 'Plugin not found',
            evaluator: 'PluginRegistry',
          }
        );
      }

      const row = result.rows[0];
      const registration: PluginRegistration = {
        id: row.id,
        manifest: row.manifest,
        status: row.status,
        installedAt: row.installed_at,
        installedBy: row.installed_by,
        enabledAt: row.enabled_at,
        enabledBy: row.enabled_by,
        lastExecutedAt: row.last_executed_at,
        executionCount: parseInt(row.execution_count, 10),
        errorCount: parseInt(row.error_count, 10),
        lastError: row.last_error,
        version: row.version,
      };

      return createDataEnvelope(
        registration,
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-read',
          reason: 'Plugin retrieved',
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId }, 'Failed to get plugin');
      throw error;
    }
  }

  /**
   * List all registered plugins
   */
  async listPlugins(
    filters: PluginSearchFilters,
    actorId: string
  ): Promise<DataEnvelope<{ plugins: PluginRegistration[]; total: number }>> {
    try {
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 20;
      const offset = (page - 1) * pageSize;

      let whereClause = 'WHERE 1=1';
      const params: unknown[] = [];
      let paramIndex = 1;

      if (filters.category) {
        whereClause += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Count total
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM plugins ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Get plugins
      params.push(pageSize, offset);
      const result = await this.pool.query(
        `SELECT
          id, name, version, description, author, category, manifest, status,
          installed_at, installed_by, enabled_at, enabled_by,
          last_executed_at, execution_count, error_count, last_error
        FROM plugins
        ${whereClause}
        ORDER BY name
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      );

      const plugins: PluginRegistration[] = result.rows.map((row: any) => ({
        id: row.id,
        manifest: row.manifest,
        status: row.status,
        installedAt: row.installed_at,
        installedBy: row.installed_by,
        enabledAt: row.enabled_at,
        enabledBy: row.enabled_by,
        lastExecutedAt: row.last_executed_at,
        executionCount: parseInt(row.execution_count, 10),
        errorCount: parseInt(row.error_count, 10),
        lastError: row.last_error,
        version: row.version,
      }));

      return createDataEnvelope(
        { plugins, total },
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-list',
          reason: 'Plugins listed',
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error }, 'Failed to list plugins');
      throw error;
    }
  }

  /**
   * Update plugin status
   */
  async updateStatus(
    pluginId: string,
    status: PluginStatus,
    actorId: string
  ): Promise<DataEnvelope<{ success: boolean }>> {
    try {
      const updates: string[] = ['status = $2', 'updated_at = $3'];
      const params: unknown[] = [pluginId, status, new Date().toISOString()];
      let paramIndex = 4;

      if (status === 'enabled') {
        updates.push(`enabled_at = $${paramIndex++}`, `enabled_by = $${paramIndex++}`);
        params.push(new Date().toISOString(), actorId);
      }

      await this.pool.query(
        `UPDATE plugins SET ${updates.join(', ')} WHERE id = $1`,
        params
      );

      logger.info({ pluginId, status }, 'Plugin status updated');

      return createDataEnvelope(
        { success: true },
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-update',
          reason: `Plugin status updated to ${status}`,
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId }, 'Failed to update plugin status');
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(
    pluginId: string,
    actorId: string
  ): Promise<DataEnvelope<{ success: boolean }>> {
    try {
      // Remove from database
      await this.pool.query('DELETE FROM plugins WHERE id = $1', [pluginId]);

      // Remove from memory
      this.plugins.delete(pluginId);

      logger.info({ pluginId }, 'Plugin unregistered');

      return createDataEnvelope(
        { success: true },
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-unregister',
          reason: 'Plugin unregistered',
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId }, 'Failed to unregister plugin');
      throw error;
    }
  }

  /**
   * Get plugin instance
   */
  getPluginInstance(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get tenant-specific plugin configuration
   */
  async getTenantConfig(
    pluginId: string,
    tenantId: string,
    actorId: string
  ): Promise<DataEnvelope<TenantPluginConfig | null>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM plugin_tenant_config WHERE plugin_id = $1 AND tenant_id = $2`,
        [pluginId, tenantId]
      );

      if (result.rows.length === 0) {
        return createDataEnvelope(
          null,
          { source: 'PluginRegistry', actor: actorId },
          {
            result: GovernanceResult.ALLOW,
            policyId: 'plugin-config-read',
            reason: 'No tenant config found',
            evaluator: 'PluginRegistry',
          }
        );
      }

      const row = result.rows[0];
      return createDataEnvelope(
        {
          pluginId: row.plugin_id,
          tenantId: row.tenant_id,
          enabled: row.enabled,
          config: row.config,
          permissions: row.permissions,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          updatedBy: row.updated_by,
        },
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-config-read',
          reason: 'Tenant config retrieved',
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId, tenantId }, 'Failed to get tenant config');
      throw error;
    }
  }

  /**
   * Save tenant-specific plugin configuration
   */
  async saveTenantConfig(
    pluginId: string,
    tenantId: string,
    config: Record<string, unknown>,
    enabled: boolean,
    actorId: string
  ): Promise<DataEnvelope<{ success: boolean }>> {
    try {
      const now = new Date().toISOString();

      await this.pool.query(
        `INSERT INTO plugin_tenant_config (plugin_id, tenant_id, config, enabled, created_at, created_by, updated_at, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $5, $6)
        ON CONFLICT (plugin_id, tenant_id)
        DO UPDATE SET config = $3, enabled = $4, updated_at = $5, updated_by = $6`,
        [pluginId, tenantId, JSON.stringify(config), enabled, now, actorId]
      );

      logger.info({ pluginId, tenantId }, 'Tenant plugin config saved');

      return createDataEnvelope(
        { success: true },
        { source: 'PluginRegistry', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'plugin-config-write',
          reason: 'Tenant config saved',
          evaluator: 'PluginRegistry',
        }
      );
    } catch (error: any) {
      logger.error({ error, pluginId, tenantId }, 'Failed to save tenant config');
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private validateManifest(manifest: PluginManifest): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!manifest.id || !/^[a-z0-9-]+$/.test(manifest.id)) {
      errors.push('Invalid plugin ID (must be lowercase alphanumeric with hyphens)');
    }

    if (!manifest.name || manifest.name.length < 2) {
      errors.push('Plugin name is required');
    }

    if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Invalid version (must be semver)');
    }

    if (!manifest.author) {
      errors.push('Author is required');
    }

    if (!manifest.category) {
      errors.push('Category is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

// Export singleton
export const pluginRegistry = new PluginRegistry();
export default PluginRegistry;
