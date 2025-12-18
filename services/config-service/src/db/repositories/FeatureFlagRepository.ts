import { query, transaction, getClient } from '../postgres.js';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  flagCacheKey,
  publishInvalidation,
} from '../redis.js';
import { logger } from '../../utils/logger.js';
import type {
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  FlagTargetingRule,
  AddTargetingRuleInput,
  SegmentCondition,
} from '../../types/index.js';

const log = logger.child({ module: 'FeatureFlagRepository' });

interface FeatureFlagRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tenant_id: string | null;
  enabled: boolean;
  default_value: unknown;
  value_type: string;
  allowlist: string[];
  blocklist: string[];
  is_governance_protected: boolean;
  stale_after_days: number | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

interface TargetingRuleRow {
  id: string;
  flag_id: string;
  segment_id: string | null;
  inline_conditions: SegmentCondition[] | null;
  rollout_percentage: string;
  value: unknown;
  priority: number;
  created_at: Date;
}

function rowToTargetingRule(row: TargetingRuleRow): FlagTargetingRule {
  return {
    id: row.id,
    segmentId: row.segment_id,
    inlineConditions: row.inline_conditions,
    rolloutPercentage: parseFloat(row.rollout_percentage),
    value: row.value,
    priority: row.priority,
  };
}

function rowToFeatureFlag(
  row: FeatureFlagRow,
  rules: FlagTargetingRule[] = [],
): FeatureFlag {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    tenantId: row.tenant_id,
    enabled: row.enabled,
    defaultValue: row.default_value,
    valueType: row.value_type as FeatureFlag['valueType'],
    targetingRules: rules,
    allowlist: row.allowlist || [],
    blocklist: row.blocklist || [],
    isGovernanceProtected: row.is_governance_protected,
    staleAfterDays: row.stale_after_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export class FeatureFlagRepository {
  /**
   * Create a new feature flag.
   */
  async create(
    input: CreateFeatureFlagInput,
    userId: string,
  ): Promise<FeatureFlag> {
    const result = await query<FeatureFlagRow>(
      `INSERT INTO feature_flags (
        key, name, description, tenant_id, enabled, default_value, value_type,
        allowlist, blocklist, is_governance_protected, stale_after_days,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *`,
      [
        input.key,
        input.name,
        input.description,
        input.tenantId,
        input.enabled,
        JSON.stringify(input.defaultValue),
        input.valueType,
        JSON.stringify(input.allowlist),
        JSON.stringify(input.blocklist),
        input.isGovernanceProtected,
        input.staleAfterDays,
        userId,
      ],
    );

    const flag = rowToFeatureFlag(result.rows[0], []);
    log.info({ key: flag.key, id: flag.id }, 'Feature flag created');
    return flag;
  }

  /**
   * Update an existing feature flag.
   */
  async update(
    id: string,
    input: UpdateFeatureFlagInput,
    userId: string,
  ): Promise<FeatureFlag | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(input.enabled);
    }
    if (input.defaultValue !== undefined) {
      updates.push(`default_value = $${paramIndex++}`);
      values.push(JSON.stringify(input.defaultValue));
    }
    if (input.allowlist !== undefined) {
      updates.push(`allowlist = $${paramIndex++}`);
      values.push(JSON.stringify(input.allowlist));
    }
    if (input.blocklist !== undefined) {
      updates.push(`blocklist = $${paramIndex++}`);
      values.push(JSON.stringify(input.blocklist));
    }
    if (input.isGovernanceProtected !== undefined) {
      updates.push(`is_governance_protected = $${paramIndex++}`);
      values.push(input.isGovernanceProtected);
    }
    if (input.staleAfterDays !== undefined) {
      updates.push(`stale_after_days = $${paramIndex++}`);
      values.push(input.staleAfterDays);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(userId);
    values.push(id);

    const result = await query<FeatureFlagRow>(
      `UPDATE feature_flags SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rowCount === 0) return null;

    const rules = await this.getTargetingRules(id);
    const flag = rowToFeatureFlag(result.rows[0], rules);
    await this.invalidateCache(flag);
    log.info({ key: flag.key, id: flag.id }, 'Feature flag updated');
    return flag;
  }

  /**
   * Delete a feature flag.
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    const result = await query('DELETE FROM feature_flags WHERE id = $1', [id]);

    if (result.rowCount && result.rowCount > 0) {
      await this.invalidateCache(existing);
      log.info({ key: existing.key, id }, 'Feature flag deleted');
      return true;
    }
    return false;
  }

  /**
   * Find a feature flag by ID.
   */
  async findById(id: string): Promise<FeatureFlag | null> {
    const result = await query<FeatureFlagRow>(
      'SELECT * FROM feature_flags WHERE id = $1',
      [id],
    );

    if (!result.rows[0]) return null;

    const rules = await this.getTargetingRules(id);
    return rowToFeatureFlag(result.rows[0], rules);
  }

  /**
   * Find a feature flag by key and tenant.
   */
  async findByKey(
    key: string,
    tenantId: string | null,
  ): Promise<FeatureFlag | null> {
    const cacheKeyStr = flagCacheKey(key, tenantId);
    const cached = await cacheGet<FeatureFlag>(cacheKeyStr);
    if (cached) {
      log.debug({ key, tenantId }, 'Cache hit for feature flag');
      return cached;
    }

    // First try tenant-specific, then global
    let result = await query<FeatureFlagRow>(
      `SELECT * FROM feature_flags
       WHERE key = $1 AND tenant_id = $2`,
      [key, tenantId],
    );

    if (!result.rows[0] && tenantId) {
      // Fall back to global flag
      result = await query<FeatureFlagRow>(
        `SELECT * FROM feature_flags
         WHERE key = $1 AND tenant_id IS NULL`,
        [key],
      );
    }

    if (!result.rows[0]) return null;

    const rules = await this.getTargetingRules(result.rows[0].id);
    const flag = rowToFeatureFlag(result.rows[0], rules);
    await cacheSet(cacheKeyStr, flag);
    return flag;
  }

  /**
   * List all feature flags for a tenant.
   */
  async listByTenant(
    tenantId: string | null,
    options?: { limit?: number; offset?: number; includeGlobal?: boolean },
  ): Promise<{ flags: FeatureFlag[]; total: number }> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const includeGlobal = options?.includeGlobal ?? true;

    let whereClause: string;
    const params: unknown[] = [];

    if (includeGlobal && tenantId) {
      whereClause = 'WHERE tenant_id = $1 OR tenant_id IS NULL';
      params.push(tenantId);
    } else {
      whereClause = 'WHERE tenant_id IS NOT DISTINCT FROM $1';
      params.push(tenantId);
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM feature_flags ${whereClause}`,
      params,
    );

    const result = await query<FeatureFlagRow>(
      `SELECT * FROM feature_flags ${whereClause}
       ORDER BY key
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const flags = await Promise.all(
      result.rows.map(async (row) => {
        const rules = await this.getTargetingRules(row.id);
        return rowToFeatureFlag(row, rules);
      }),
    );

    return {
      flags,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get targeting rules for a flag.
   */
  private async getTargetingRules(flagId: string): Promise<FlagTargetingRule[]> {
    const result = await query<TargetingRuleRow>(
      `SELECT * FROM flag_targeting_rules
       WHERE flag_id = $1
       ORDER BY priority DESC`,
      [flagId],
    );

    return result.rows.map(rowToTargetingRule);
  }

  /**
   * Add a targeting rule to a flag.
   */
  async addTargetingRule(
    flagId: string,
    input: AddTargetingRuleInput,
  ): Promise<FlagTargetingRule> {
    const result = await query<TargetingRuleRow>(
      `INSERT INTO flag_targeting_rules (
        flag_id, segment_id, inline_conditions, rollout_percentage, value, priority
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        flagId,
        input.segmentId,
        input.inlineConditions ? JSON.stringify(input.inlineConditions) : null,
        input.rolloutPercentage,
        JSON.stringify(input.value),
        input.priority,
      ],
    );

    const flag = await this.findById(flagId);
    if (flag) {
      await this.invalidateCache(flag);
    }

    log.info({ flagId, ruleId: result.rows[0].id }, 'Targeting rule added');
    return rowToTargetingRule(result.rows[0]);
  }

  /**
   * Remove a targeting rule from a flag.
   */
  async removeTargetingRule(flagId: string, ruleId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM flag_targeting_rules WHERE id = $1 AND flag_id = $2',
      [ruleId, flagId],
    );

    if (result.rowCount && result.rowCount > 0) {
      const flag = await this.findById(flagId);
      if (flag) {
        await this.invalidateCache(flag);
      }
      log.info({ flagId, ruleId }, 'Targeting rule removed');
      return true;
    }
    return false;
  }

  /**
   * Toggle a feature flag on/off.
   */
  async toggle(id: string, enabled: boolean, userId: string): Promise<FeatureFlag | null> {
    return this.update(id, { enabled }, userId);
  }

  /**
   * Invalidate cache for a feature flag.
   */
  private async invalidateCache(flag: FeatureFlag): Promise<void> {
    await cacheDelete(flagCacheKey(flag.key, flag.tenantId));
    await cacheDelete(flagCacheKey(flag.key, null)); // Also clear global cache
    await cacheDeletePattern(`flag:${flag.key}:*`);
    await publishInvalidation({
      type: 'flag',
      key: flag.key,
      tenantId: flag.tenantId,
      timestamp: Date.now(),
    });
  }
}

export const featureFlagRepository = new FeatureFlagRepository();
