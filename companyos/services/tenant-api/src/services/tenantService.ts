/**
 * CompanyOS Tenant Service
 *
 * Business logic for tenant CRUD operations
 */

import { pool } from '../db/postgres.js';
import type {
  Tenant,
  TenantFeature,
  CreateTenantInput,
  UpdateTenantInput,
  SetFeatureFlagInput,
  EffectiveFeatureFlags,
  TENANT_FEATURE_FLAGS,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// Row to Tenant mapping
function rowToTenant(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    dataRegion: row.data_region,
    classification: row.classification,
    status: row.status,
    isActive: row.is_active,
    settings: row.settings || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function rowToFeature(row: any): TenantFeature {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    flagName: row.flag_name,
    enabled: row.enabled,
    config: row.config || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    updatedBy: row.updated_by,
  };
}

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(
    input: CreateTenantInput,
    actorId?: string,
  ): Promise<Tenant> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO companyos_tenants (
        id, name, slug, description, data_region, classification,
        status, is_active, settings, created_at, updated_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id,
      input.name,
      input.slug,
      input.description || null,
      input.dataRegion || 'us-east-1',
      input.classification || 'unclassified',
      'active',
      true,
      JSON.stringify(input.settings || {}),
      now,
      now,
      actorId || null,
    ];

    const result = await pool.query(query, values);
    return rowToTenant(result.rows[0]);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    const query = `SELECT * FROM companyos_tenants WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToTenant(result.rows[0]);
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const query = `SELECT * FROM companyos_tenants WHERE slug = $1`;
    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToTenant(result.rows[0]);
  }

  /**
   * List all tenants with pagination
   */
  async listTenants(options: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ tenants: Tenant[]; totalCount: number }> {
    const { limit = 50, offset = 0, status } = options;

    let whereClause = '';
    const values: any[] = [];

    if (status) {
      whereClause = 'WHERE status = $1';
      values.push(status);
    }

    const countQuery = `SELECT COUNT(*) FROM companyos_tenants ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT * FROM companyos_tenants
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const dataResult = await pool.query(dataQuery, [...values, limit, offset]);
    const tenants = dataResult.rows.map(rowToTenant);

    return { tenants, totalCount };
  }

  /**
   * Update a tenant
   */
  async updateTenant(
    id: string,
    input: UpdateTenantInput,
    actorId?: string,
  ): Promise<Tenant | null> {
    const existing = await this.getTenantById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.dataRegion !== undefined) {
      updates.push(`data_region = $${paramIndex++}`);
      values.push(input.dataRegion);
    }
    if (input.classification !== undefined) {
      updates.push(`classification = $${paramIndex++}`);
      values.push(input.classification);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
      // Also update is_active based on status
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.status === 'active');
    }
    if (input.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(input.settings));
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    updates.push(`updated_by = $${paramIndex++}`);
    values.push(actorId || null);

    values.push(id);

    const query = `
      UPDATE companyos_tenants
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return rowToTenant(result.rows[0]);
  }

  /**
   * Delete a tenant (soft delete by setting status to archived)
   */
  async deleteTenant(id: string, actorId?: string): Promise<boolean> {
    const query = `
      UPDATE companyos_tenants
      SET status = 'archived', is_active = false, updated_at = $1, updated_by = $2
      WHERE id = $3
      RETURNING id
    `;

    const result = await pool.query(query, [new Date(), actorId || null, id]);
    return result.rows.length > 0;
  }

  /**
   * Set a feature flag for a tenant
   */
  async setFeatureFlag(
    input: SetFeatureFlagInput,
    actorId?: string,
  ): Promise<TenantFeature> {
    const query = `
      INSERT INTO companyos_tenant_features (
        id, tenant_id, flag_name, enabled, config, created_at, updated_at, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tenant_id, flag_name)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        config = EXCLUDED.config,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
      RETURNING *
    `;

    const now = new Date();
    const values = [
      uuidv4(),
      input.tenantId,
      input.flagName,
      input.enabled,
      JSON.stringify(input.config || {}),
      now,
      now,
      actorId || null,
    ];

    const result = await pool.query(query, values);
    return rowToFeature(result.rows[0]);
  }

  /**
   * Get all feature flags for a tenant
   */
  async getTenantFeatures(tenantId: string): Promise<TenantFeature[]> {
    const query = `
      SELECT * FROM companyos_tenant_features
      WHERE tenant_id = $1
      ORDER BY flag_name
    `;

    const result = await pool.query(query, [tenantId]);
    return result.rows.map(rowToFeature);
  }

  /**
   * Get effective feature flags for a tenant (with defaults)
   */
  async getEffectiveFeatureFlags(
    tenantId: string,
  ): Promise<EffectiveFeatureFlags> {
    const features = await this.getTenantFeatures(tenantId);

    const flagMap: Record<string, boolean> = {};
    for (const feature of features) {
      flagMap[feature.flagName] = feature.enabled;
    }

    return {
      aiCopilotAccess: flagMap['ai_copilot_access'] ?? false,
      billingEnabled: flagMap['billing_enabled'] ?? false,
      advancedAnalytics: flagMap['advanced_analytics'] ?? false,
      exportEnabled: flagMap['export_enabled'] ?? true, // Default enabled
      apiAccess: flagMap['api_access'] ?? true, // Default enabled
      ssoEnabled: flagMap['sso_enabled'] ?? false,
      customBranding: flagMap['custom_branding'] ?? false,
      auditLogExport: flagMap['audit_log_export'] ?? false,
      raw: flagMap,
    };
  }
}

export const tenantService = new TenantService();
