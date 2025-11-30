/**
 * Routing Rule and Tenant Binding Registry
 */

import { PoolClient } from 'pg';
import { db } from '../db/connection.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import {
  RoutingRule,
  RoutingCondition,
  CreateRoutingRuleInput,
  TenantModelBinding,
  CreateTenantBindingInput,
  ModelCapability,
} from '../types/index.js';

// ============================================================================
// Database Row Types
// ============================================================================

interface RoutingRuleRow {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  conditions: RoutingCondition[];
  condition_logic: string;
  target_model_version_id: string;
  fallback_model_version_id: string | null;
  is_enabled: boolean;
  valid_from: Date | null;
  valid_until: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

interface TenantBindingRow {
  id: string;
  tenant_id: string;
  capability: string;
  model_version_id: string;
  policy_profile_id: string | null;
  is_enabled: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

// ============================================================================
// Row Transformations
// ============================================================================

function rowToRoutingRule(row: RoutingRuleRow): RoutingRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    priority: row.priority,
    conditions: row.conditions,
    conditionLogic: row.condition_logic as 'all' | 'any',
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

function rowToTenantBinding(row: TenantBindingRow): TenantModelBinding {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    capability: row.capability as ModelCapability,
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

// ============================================================================
// Routing Registry Class
// ============================================================================

export interface ListRoutingRulesOptions {
  isEnabled?: boolean;
  targetModelVersionId?: string;
  limit?: number;
  offset?: number;
}

export interface ListTenantBindingsOptions {
  tenantId?: string;
  capability?: ModelCapability;
  modelVersionId?: string;
  isEnabled?: boolean;
  limit?: number;
  offset?: number;
}

export class RoutingRegistry {
  // ==========================================================================
  // Routing Rule Operations
  // ==========================================================================

  async createRoutingRule(input: CreateRoutingRuleInput, client?: PoolClient): Promise<RoutingRule> {
    const id = generateId();
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

    const result = await db.query<RoutingRuleRow>(query, params, client);
    const rule = rowToRoutingRule(result.rows[0]);

    logger.info({
      message: 'Routing rule created',
      routingRuleId: rule.id,
      ruleName: rule.name,
    });

    return rule;
  }

  async getRoutingRule(id: string, client?: PoolClient): Promise<RoutingRule> {
    const query = 'SELECT * FROM model_hub_routing_rules WHERE id = $1';
    const result = await db.query<RoutingRuleRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('RoutingRule', id);
    }

    return rowToRoutingRule(result.rows[0]);
  }

  async listRoutingRules(options: ListRoutingRulesOptions = {}): Promise<{
    rules: RoutingRule[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
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
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_routing_rules
      ${whereClause}
      ORDER BY priority ASC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<RoutingRuleRow>(query, [...params, limit, offset]);
    const rules = result.rows.map(rowToRoutingRule);

    return { rules, total };
  }

  async getActiveRoutingRules(client?: PoolClient): Promise<RoutingRule[]> {
    const now = new Date();
    const query = `
      SELECT * FROM model_hub_routing_rules
      WHERE is_enabled = true
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_until IS NULL OR valid_until >= $1)
      ORDER BY priority ASC
    `;

    const result = await db.query<RoutingRuleRow>(query, [now], client);
    return result.rows.map(rowToRoutingRule);
  }

  async updateRoutingRule(
    id: string,
    input: Partial<CreateRoutingRuleInput>,
    client?: PoolClient,
  ): Promise<RoutingRule> {
    // Verify rule exists
    await this.getRoutingRule(id, client);

    const updates: string[] = [];
    const params: unknown[] = [];
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

    const result = await db.query<RoutingRuleRow>(query, params, client);
    const rule = rowToRoutingRule(result.rows[0]);

    logger.info({
      message: 'Routing rule updated',
      routingRuleId: rule.id,
      ruleName: rule.name,
    });

    return rule;
  }

  async deleteRoutingRule(id: string, client?: PoolClient): Promise<void> {
    // Verify rule exists
    await this.getRoutingRule(id, client);

    const query = 'DELETE FROM model_hub_routing_rules WHERE id = $1';
    await db.query(query, [id], client);

    logger.info({
      message: 'Routing rule deleted',
      routingRuleId: id,
    });
  }

  // ==========================================================================
  // Tenant Binding Operations
  // ==========================================================================

  async createTenantBinding(
    input: CreateTenantBindingInput,
    client?: PoolClient,
  ): Promise<TenantModelBinding> {
    const id = generateId();
    const now = new Date();

    // Check for duplicate binding
    const existing = await this.getTenantBindingForCapability(
      input.tenantId,
      input.capability,
      input.modelVersionId,
      client,
    );
    if (existing) {
      throw new ConflictError(
        `Tenant binding already exists for tenant '${input.tenantId}', capability '${input.capability}', and model version '${input.modelVersionId}'`,
      );
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

    const result = await db.query<TenantBindingRow>(query, params, client);
    const binding = rowToTenantBinding(result.rows[0]);

    logger.info({
      message: 'Tenant binding created',
      tenantBindingId: binding.id,
      tenantId: binding.tenantId,
      capability: binding.capability,
    });

    return binding;
  }

  async getTenantBinding(id: string, client?: PoolClient): Promise<TenantModelBinding> {
    const query = 'SELECT * FROM model_hub_tenant_bindings WHERE id = $1';
    const result = await db.query<TenantBindingRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('TenantModelBinding', id);
    }

    return rowToTenantBinding(result.rows[0]);
  }

  async getTenantBindingForCapability(
    tenantId: string,
    capability: ModelCapability,
    modelVersionId: string,
    client?: PoolClient,
  ): Promise<TenantModelBinding | null> {
    const query = `
      SELECT * FROM model_hub_tenant_bindings
      WHERE tenant_id = $1 AND capability = $2 AND model_version_id = $3
    `;
    const result = await db.query<TenantBindingRow>(query, [tenantId, capability, modelVersionId], client);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToTenantBinding(result.rows[0]);
  }

  async getActiveTenantBindingsForCapability(
    tenantId: string,
    capability: ModelCapability,
    client?: PoolClient,
  ): Promise<TenantModelBinding[]> {
    const query = `
      SELECT * FROM model_hub_tenant_bindings
      WHERE tenant_id = $1 AND capability = $2 AND is_enabled = true
      ORDER BY priority DESC
    `;
    const result = await db.query<TenantBindingRow>(query, [tenantId, capability], client);
    return result.rows.map(rowToTenantBinding);
  }

  async listTenantBindings(options: ListTenantBindingsOptions = {}): Promise<{
    bindings: TenantModelBinding[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
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
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_tenant_bindings
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<TenantBindingRow>(query, [...params, limit, offset]);
    const bindings = result.rows.map(rowToTenantBinding);

    return { bindings, total };
  }

  async updateTenantBinding(
    id: string,
    input: Partial<CreateTenantBindingInput>,
    client?: PoolClient,
  ): Promise<TenantModelBinding> {
    // Verify binding exists
    await this.getTenantBinding(id, client);

    const updates: string[] = [];
    const params: unknown[] = [];
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

    const result = await db.query<TenantBindingRow>(query, params, client);
    const binding = rowToTenantBinding(result.rows[0]);

    logger.info({
      message: 'Tenant binding updated',
      tenantBindingId: binding.id,
      tenantId: binding.tenantId,
    });

    return binding;
  }

  async deleteTenantBinding(id: string, client?: PoolClient): Promise<void> {
    // Verify binding exists
    await this.getTenantBinding(id, client);

    const query = 'DELETE FROM model_hub_tenant_bindings WHERE id = $1';
    await db.query(query, [id], client);

    logger.info({
      message: 'Tenant binding deleted',
      tenantBindingId: id,
    });
  }
}

// Export singleton instance
export const routingRegistry = new RoutingRegistry();
