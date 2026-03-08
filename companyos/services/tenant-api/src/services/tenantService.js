"use strict";
/**
 * CompanyOS Tenant Service
 *
 * Business logic for tenant CRUD operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantService = exports.TenantService = void 0;
const postgres_js_1 = require("../db/postgres.js");
const uuid_1 = require("uuid");
// Row to Tenant mapping
function rowToTenant(row) {
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
function rowToFeature(row) {
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
class TenantService {
    /**
     * Create a new tenant
     */
    async createTenant(input, actorId) {
        const id = (0, uuid_1.v4)();
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
        const result = await postgres_js_1.pool.query(query, values);
        return rowToTenant(result.rows[0]);
    }
    /**
     * Get tenant by ID
     */
    async getTenantById(id) {
        const query = `SELECT * FROM companyos_tenants WHERE id = $1`;
        const result = await postgres_js_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToTenant(result.rows[0]);
    }
    /**
     * Get tenant by slug
     */
    async getTenantBySlug(slug) {
        const query = `SELECT * FROM companyos_tenants WHERE slug = $1`;
        const result = await postgres_js_1.pool.query(query, [slug]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToTenant(result.rows[0]);
    }
    /**
     * List all tenants with pagination
     */
    async listTenants(options) {
        const { limit = 50, offset = 0, status } = options;
        let whereClause = '';
        const values = [];
        if (status) {
            whereClause = 'WHERE status = $1';
            values.push(status);
        }
        const countQuery = `SELECT COUNT(*) FROM companyos_tenants ${whereClause}`;
        const countResult = await postgres_js_1.pool.query(countQuery, values);
        const totalCount = parseInt(countResult.rows[0].count, 10);
        const dataQuery = `
      SELECT * FROM companyos_tenants
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
        const dataResult = await postgres_js_1.pool.query(dataQuery, [...values, limit, offset]);
        const tenants = dataResult.rows.map(rowToTenant);
        return { tenants, totalCount };
    }
    /**
     * Update a tenant
     */
    async updateTenant(id, input, actorId) {
        const existing = await this.getTenantById(id);
        if (!existing) {
            return null;
        }
        const updates = [];
        const values = [];
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
        const result = await postgres_js_1.pool.query(query, values);
        return rowToTenant(result.rows[0]);
    }
    /**
     * Delete a tenant (soft delete by setting status to archived)
     */
    async deleteTenant(id, actorId) {
        const query = `
      UPDATE companyos_tenants
      SET status = 'archived', is_active = false, updated_at = $1, updated_by = $2
      WHERE id = $3
      RETURNING id
    `;
        const result = await postgres_js_1.pool.query(query, [new Date(), actorId || null, id]);
        return result.rows.length > 0;
    }
    /**
     * Set a feature flag for a tenant
     */
    async setFeatureFlag(input, actorId) {
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
            (0, uuid_1.v4)(),
            input.tenantId,
            input.flagName,
            input.enabled,
            JSON.stringify(input.config || {}),
            now,
            now,
            actorId || null,
        ];
        const result = await postgres_js_1.pool.query(query, values);
        return rowToFeature(result.rows[0]);
    }
    /**
     * Get all feature flags for a tenant
     */
    async getTenantFeatures(tenantId) {
        const query = `
      SELECT * FROM companyos_tenant_features
      WHERE tenant_id = $1
      ORDER BY flag_name
    `;
        const result = await postgres_js_1.pool.query(query, [tenantId]);
        return result.rows.map(rowToFeature);
    }
    /**
     * Get effective feature flags for a tenant (with defaults)
     */
    async getEffectiveFeatureFlags(tenantId) {
        const features = await this.getTenantFeatures(tenantId);
        const flagMap = {};
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
exports.TenantService = TenantService;
exports.tenantService = new TenantService();
