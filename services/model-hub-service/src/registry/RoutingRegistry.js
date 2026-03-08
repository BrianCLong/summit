"use strict";
/**
 * Routing Rule and Tenant Binding Registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routingRegistry = exports.RoutingRegistry = void 0;
const connection_js_1 = require("../db/connection.js");
const id_js_1 = require("../utils/id.js");
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
// ============================================================================
// Row Transformations
// ============================================================================
function rowToRoutingRule(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        priority: row.priority,
        conditions: row.conditions,
        conditionLogic: row.condition_logic,
        targetModelVersionId: row.target_model_version_id,
        fallbackModelVersionId: row.fallback_model_version_id || undefined,
        isEnabled: row.is_enabled,
        validFrom: row.valid_from || undefined,
        validUntil: row.valid_until || undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
    };
}
function rowToTenantBinding(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        capability: row.capability,
        modelVersionId: row.model_version_id,
        policyProfileId: row.policy_profile_id || undefined,
        isEnabled: row.is_enabled,
        priority: row.priority,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
    };
}
class RoutingRegistry {
    // ==========================================================================
    // Routing Rule Operations
    // ==========================================================================
    async createRoutingRule(input, client) {
        const id = (0, id_js_1.generateId)();
        const now = new Date();
        const query = `
      INSERT INTO model_hub_routing_rules (
        id, name, description, priority, conditions, condition_logic,
        target_model_version_id, fallback_model_version_id,
        is_enabled, valid_from, valid_until, metadata,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
        const params = [
            id,
            input.name,
            input.description || null,
            input.priority || 1000,
            JSON.stringify(input.conditions),
            input.conditionLogic || 'all',
            input.targetModelVersionId,
            input.fallbackModelVersionId || null,
            input.isEnabled !== false,
            input.validFrom || null,
            input.validUntil || null,
            input.metadata || {},
            now,
            now,
            input.createdBy,
        ];
        const result = await connection_js_1.db.query(query, params, client);
        const rule = rowToRoutingRule(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Routing rule created',
            routingRuleId: rule.id,
            ruleName: rule.name,
        });
        return rule;
    }
    async getRoutingRule(id, client) {
        const query = 'SELECT * FROM model_hub_routing_rules WHERE id = $1';
        const result = await connection_js_1.db.query(query, [id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('RoutingRule', id);
        }
        return rowToRoutingRule(result.rows[0]);
    }
    async listRoutingRules(options = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.isEnabled !== undefined) {
            conditions.push(`is_enabled = $${paramIndex++}`);
            params.push(options.isEnabled);
        }
        if (options.targetModelVersionId) {
            conditions.push(`target_model_version_id = $${paramIndex++}`);
            params.push(options.targetModelVersionId);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM model_hub_routing_rules ${whereClause}`;
        const countResult = await connection_js_1.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const query = `
      SELECT * FROM model_hub_routing_rules
      ${whereClause}
      ORDER BY priority ASC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const result = await connection_js_1.db.query(query, [...params, limit, offset]);
        const rules = result.rows.map(rowToRoutingRule);
        return { rules, total };
    }
    async getActiveRoutingRules(client) {
        const now = new Date();
        const query = `
      SELECT * FROM model_hub_routing_rules
      WHERE is_enabled = true
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_until IS NULL OR valid_until >= $1)
      ORDER BY priority ASC
    `;
        const result = await connection_js_1.db.query(query, [now], client);
        return result.rows.map(rowToRoutingRule);
    }
    async updateRoutingRule(id, input, client) {
        // Verify rule exists
        await this.getRoutingRule(id, client);
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(input.name);
        }
        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(input.description);
        }
        if (input.priority !== undefined) {
            updates.push(`priority = $${paramIndex++}`);
            params.push(input.priority);
        }
        if (input.conditions !== undefined) {
            updates.push(`conditions = $${paramIndex++}`);
            params.push(JSON.stringify(input.conditions));
        }
        if (input.conditionLogic !== undefined) {
            updates.push(`condition_logic = $${paramIndex++}`);
            params.push(input.conditionLogic);
        }
        if (input.targetModelVersionId !== undefined) {
            updates.push(`target_model_version_id = $${paramIndex++}`);
            params.push(input.targetModelVersionId);
        }
        if (input.fallbackModelVersionId !== undefined) {
            updates.push(`fallback_model_version_id = $${paramIndex++}`);
            params.push(input.fallbackModelVersionId);
        }
        if (input.isEnabled !== undefined) {
            updates.push(`is_enabled = $${paramIndex++}`);
            params.push(input.isEnabled);
        }
        if (input.validFrom !== undefined) {
            updates.push(`valid_from = $${paramIndex++}`);
            params.push(input.validFrom);
        }
        if (input.validUntil !== undefined) {
            updates.push(`valid_until = $${paramIndex++}`);
            params.push(input.validUntil);
        }
        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            params.push(input.metadata);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());
        params.push(id);
        const query = `
      UPDATE model_hub_routing_rules
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await connection_js_1.db.query(query, params, client);
        const rule = rowToRoutingRule(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Routing rule updated',
            routingRuleId: rule.id,
            ruleName: rule.name,
        });
        return rule;
    }
    async deleteRoutingRule(id, client) {
        // Verify rule exists
        await this.getRoutingRule(id, client);
        const query = 'DELETE FROM model_hub_routing_rules WHERE id = $1';
        await connection_js_1.db.query(query, [id], client);
        logger_js_1.logger.info({
            message: 'Routing rule deleted',
            routingRuleId: id,
        });
    }
    // ==========================================================================
    // Tenant Binding Operations
    // ==========================================================================
    async createTenantBinding(input, client) {
        const id = (0, id_js_1.generateId)();
        const now = new Date();
        // Check for duplicate binding
        const existing = await this.getTenantBindingForCapability(input.tenantId, input.capability, input.modelVersionId, client);
        if (existing) {
            throw new errors_js_1.ConflictError(`Tenant binding already exists for tenant '${input.tenantId}', capability '${input.capability}', and model version '${input.modelVersionId}'`);
        }
        const query = `
      INSERT INTO model_hub_tenant_bindings (
        id, tenant_id, capability, model_version_id,
        policy_profile_id, is_enabled, priority, metadata,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const params = [
            id,
            input.tenantId,
            input.capability,
            input.modelVersionId,
            input.policyProfileId || null,
            input.isEnabled !== false,
            input.priority || 0,
            input.metadata || {},
            now,
            now,
            input.createdBy,
        ];
        const result = await connection_js_1.db.query(query, params, client);
        const binding = rowToTenantBinding(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Tenant binding created',
            tenantBindingId: binding.id,
            tenantId: binding.tenantId,
            capability: binding.capability,
        });
        return binding;
    }
    async getTenantBinding(id, client) {
        const query = 'SELECT * FROM model_hub_tenant_bindings WHERE id = $1';
        const result = await connection_js_1.db.query(query, [id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('TenantModelBinding', id);
        }
        return rowToTenantBinding(result.rows[0]);
    }
    async getTenantBindingForCapability(tenantId, capability, modelVersionId, client) {
        const query = `
      SELECT * FROM model_hub_tenant_bindings
      WHERE tenant_id = $1 AND capability = $2 AND model_version_id = $3
    `;
        const result = await connection_js_1.db.query(query, [tenantId, capability, modelVersionId], client);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToTenantBinding(result.rows[0]);
    }
    async getActiveTenantBindingsForCapability(tenantId, capability, client) {
        const query = `
      SELECT * FROM model_hub_tenant_bindings
      WHERE tenant_id = $1 AND capability = $2 AND is_enabled = true
      ORDER BY priority DESC
    `;
        const result = await connection_js_1.db.query(query, [tenantId, capability], client);
        return result.rows.map(rowToTenantBinding);
    }
    async listTenantBindings(options = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.tenantId) {
            conditions.push(`tenant_id = $${paramIndex++}`);
            params.push(options.tenantId);
        }
        if (options.capability) {
            conditions.push(`capability = $${paramIndex++}`);
            params.push(options.capability);
        }
        if (options.modelVersionId) {
            conditions.push(`model_version_id = $${paramIndex++}`);
            params.push(options.modelVersionId);
        }
        if (options.isEnabled !== undefined) {
            conditions.push(`is_enabled = $${paramIndex++}`);
            params.push(options.isEnabled);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM model_hub_tenant_bindings ${whereClause}`;
        const countResult = await connection_js_1.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const query = `
      SELECT * FROM model_hub_tenant_bindings
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const result = await connection_js_1.db.query(query, [...params, limit, offset]);
        const bindings = result.rows.map(rowToTenantBinding);
        return { bindings, total };
    }
    async updateTenantBinding(id, input, client) {
        // Verify binding exists
        await this.getTenantBinding(id, client);
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (input.policyProfileId !== undefined) {
            updates.push(`policy_profile_id = $${paramIndex++}`);
            params.push(input.policyProfileId);
        }
        if (input.isEnabled !== undefined) {
            updates.push(`is_enabled = $${paramIndex++}`);
            params.push(input.isEnabled);
        }
        if (input.priority !== undefined) {
            updates.push(`priority = $${paramIndex++}`);
            params.push(input.priority);
        }
        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            params.push(input.metadata);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());
        params.push(id);
        const query = `
      UPDATE model_hub_tenant_bindings
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await connection_js_1.db.query(query, params, client);
        const binding = rowToTenantBinding(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Tenant binding updated',
            tenantBindingId: binding.id,
            tenantId: binding.tenantId,
        });
        return binding;
    }
    async deleteTenantBinding(id, client) {
        // Verify binding exists
        await this.getTenantBinding(id, client);
        const query = 'DELETE FROM model_hub_tenant_bindings WHERE id = $1';
        await connection_js_1.db.query(query, [id], client);
        logger_js_1.logger.info({
            message: 'Tenant binding deleted',
            tenantBindingId: id,
        });
    }
}
exports.RoutingRegistry = RoutingRegistry;
// Export singleton instance
exports.routingRegistry = new RoutingRegistry();
