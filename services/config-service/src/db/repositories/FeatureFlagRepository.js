"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagRepository = exports.FeatureFlagRepository = void 0;
const postgres_js_1 = require("../postgres.js");
const redis_js_1 = require("../redis.js");
const logger_js_1 = require("../../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'FeatureFlagRepository' });
function rowToTargetingRule(row) {
    return {
        id: row.id,
        segmentId: row.segment_id,
        inlineConditions: row.inline_conditions,
        rolloutPercentage: parseFloat(row.rollout_percentage),
        value: row.value,
        priority: row.priority,
    };
}
function rowToFeatureFlag(row, rules = []) {
    return {
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        tenantId: row.tenant_id,
        enabled: row.enabled,
        defaultValue: row.default_value,
        valueType: row.value_type,
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
class FeatureFlagRepository {
    /**
     * Create a new feature flag.
     */
    async create(input, userId) {
        const result = await (0, postgres_js_1.query)(`INSERT INTO feature_flags (
        key, name, description, tenant_id, enabled, default_value, value_type,
        allowlist, blocklist, is_governance_protected, stale_after_days,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *`, [
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
        ]);
        const flag = rowToFeatureFlag(result.rows[0], []);
        log.info({ key: flag.key, id: flag.id }, 'Feature flag created');
        return flag;
    }
    /**
     * Update an existing feature flag.
     */
    async update(id, input, userId) {
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
        const result = await (0, postgres_js_1.query)(`UPDATE feature_flags SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`, values);
        if (result.rowCount === 0)
            return null;
        const rules = await this.getTargetingRules(id);
        const flag = rowToFeatureFlag(result.rows[0], rules);
        await this.invalidateCache(flag);
        log.info({ key: flag.key, id: flag.id }, 'Feature flag updated');
        return flag;
    }
    /**
     * Delete a feature flag.
     */
    async delete(id) {
        const existing = await this.findById(id);
        if (!existing)
            return false;
        const result = await (0, postgres_js_1.query)('DELETE FROM feature_flags WHERE id = $1', [id]);
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
    async findById(id) {
        const result = await (0, postgres_js_1.query)('SELECT * FROM feature_flags WHERE id = $1', [id]);
        if (!result.rows[0])
            return null;
        const rules = await this.getTargetingRules(id);
        return rowToFeatureFlag(result.rows[0], rules);
    }
    /**
     * Find a feature flag by key and tenant.
     */
    async findByKey(key, tenantId) {
        const cacheKeyStr = (0, redis_js_1.flagCacheKey)(key, tenantId);
        const cached = await (0, redis_js_1.cacheGet)(cacheKeyStr);
        if (cached) {
            log.debug({ key, tenantId }, 'Cache hit for feature flag');
            return cached;
        }
        // First try tenant-specific, then global
        let result = await (0, postgres_js_1.query)(`SELECT * FROM feature_flags
       WHERE key = $1 AND tenant_id = $2`, [key, tenantId]);
        if (!result.rows[0] && tenantId) {
            // Fall back to global flag
            result = await (0, postgres_js_1.query)(`SELECT * FROM feature_flags
         WHERE key = $1 AND tenant_id IS NULL`, [key]);
        }
        if (!result.rows[0])
            return null;
        const rules = await this.getTargetingRules(result.rows[0].id);
        const flag = rowToFeatureFlag(result.rows[0], rules);
        await (0, redis_js_1.cacheSet)(cacheKeyStr, flag);
        return flag;
    }
    /**
     * List all feature flags for a tenant.
     */
    async listByTenant(tenantId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        const includeGlobal = options?.includeGlobal ?? true;
        let whereClause;
        const params = [];
        if (includeGlobal && tenantId) {
            whereClause = 'WHERE tenant_id = $1 OR tenant_id IS NULL';
            params.push(tenantId);
        }
        else {
            whereClause = 'WHERE tenant_id IS NOT DISTINCT FROM $1';
            params.push(tenantId);
        }
        const countResult = await (0, postgres_js_1.query)(`SELECT COUNT(*) as count FROM feature_flags ${whereClause}`, params);
        const result = await (0, postgres_js_1.query)(`SELECT * FROM feature_flags ${whereClause}
       ORDER BY key
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        const flags = await Promise.all(result.rows.map(async (row) => {
            const rules = await this.getTargetingRules(row.id);
            return rowToFeatureFlag(row, rules);
        }));
        return {
            flags,
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Get targeting rules for a flag.
     */
    async getTargetingRules(flagId) {
        const result = await (0, postgres_js_1.query)(`SELECT * FROM flag_targeting_rules
       WHERE flag_id = $1
       ORDER BY priority DESC`, [flagId]);
        return result.rows.map(rowToTargetingRule);
    }
    /**
     * Add a targeting rule to a flag.
     */
    async addTargetingRule(flagId, input) {
        const result = await (0, postgres_js_1.query)(`INSERT INTO flag_targeting_rules (
        flag_id, segment_id, inline_conditions, rollout_percentage, value, priority
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`, [
            flagId,
            input.segmentId,
            input.inlineConditions ? JSON.stringify(input.inlineConditions) : null,
            input.rolloutPercentage,
            JSON.stringify(input.value),
            input.priority,
        ]);
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
    async removeTargetingRule(flagId, ruleId) {
        const result = await (0, postgres_js_1.query)('DELETE FROM flag_targeting_rules WHERE id = $1 AND flag_id = $2', [ruleId, flagId]);
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
    async toggle(id, enabled, userId) {
        return this.update(id, { enabled }, userId);
    }
    /**
     * Invalidate cache for a feature flag.
     */
    async invalidateCache(flag) {
        await (0, redis_js_1.cacheDelete)((0, redis_js_1.flagCacheKey)(flag.key, flag.tenantId));
        await (0, redis_js_1.cacheDelete)((0, redis_js_1.flagCacheKey)(flag.key, null)); // Also clear global cache
        await (0, redis_js_1.cacheDeletePattern)(`flag:${flag.key}:*`);
        await (0, redis_js_1.publishInvalidation)({
            type: 'flag',
            key: flag.key,
            tenantId: flag.tenantId,
            timestamp: Date.now(),
        });
    }
}
exports.FeatureFlagRepository = FeatureFlagRepository;
exports.featureFlagRepository = new FeatureFlagRepository();
