"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRepository = exports.ConfigRepository = void 0;
const postgres_js_1 = require("../postgres.js");
const redis_js_1 = require("../redis.js");
const logger_js_1 = require("../../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'ConfigRepository' });
function rowToConfigItem(row) {
    return {
        id: row.id,
        key: row.key,
        value: row.value,
        valueType: row.value_type,
        level: row.level,
        environment: row.environment,
        tenantId: row.tenant_id,
        userId: row.user_id,
        description: row.description,
        isSecret: row.is_secret,
        isGovernanceProtected: row.is_governance_protected,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
    };
}
class ConfigRepository {
    /**
     * Create a new config item.
     */
    async create(input, userId) {
        const result = await (0, postgres_js_1.query)(`INSERT INTO config_items (
        key, value, value_type, level, environment, tenant_id, user_id,
        description, is_secret, is_governance_protected, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      RETURNING *`, [
            input.key,
            JSON.stringify(input.value),
            input.valueType,
            input.level,
            input.environment,
            input.tenantId,
            input.userId,
            input.description,
            input.isSecret,
            input.isGovernanceProtected,
            userId,
        ]);
        const item = rowToConfigItem(result.rows[0]);
        await this.invalidateCache(item);
        log.info({ key: item.key, id: item.id }, 'Config item created');
        return item;
    }
    /**
     * Update an existing config item.
     */
    async update(id, input, userId) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (input.value !== undefined) {
            updates.push(`value = $${paramIndex++}`);
            values.push(JSON.stringify(input.value));
        }
        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }
        if (input.isSecret !== undefined) {
            updates.push(`is_secret = $${paramIndex++}`);
            values.push(input.isSecret);
        }
        if (input.isGovernanceProtected !== undefined) {
            updates.push(`is_governance_protected = $${paramIndex++}`);
            values.push(input.isGovernanceProtected);
        }
        if (updates.length === 0)
            return existing;
        updates.push(`version = version + 1`);
        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${paramIndex++}`);
        values.push(userId);
        values.push(id);
        const result = await (0, postgres_js_1.query)(`UPDATE config_items SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`, values);
        if (result.rowCount === 0)
            return null;
        const item = rowToConfigItem(result.rows[0]);
        await this.invalidateCache(item);
        log.info({ key: item.key, id: item.id }, 'Config item updated');
        return item;
    }
    /**
     * Delete a config item.
     */
    async delete(id) {
        const existing = await this.findById(id);
        if (!existing)
            return false;
        const result = await (0, postgres_js_1.query)('DELETE FROM config_items WHERE id = $1', [id]);
        if (result.rowCount && result.rowCount > 0) {
            await this.invalidateCache(existing);
            log.info({ key: existing.key, id }, 'Config item deleted');
            return true;
        }
        return false;
    }
    /**
     * Find a config item by ID.
     */
    async findById(id) {
        const result = await (0, postgres_js_1.query)('SELECT * FROM config_items WHERE id = $1', [id]);
        return result.rows[0] ? rowToConfigItem(result.rows[0]) : null;
    }
    /**
     * Find all config items matching the given key and context.
     * Returns items at all hierarchy levels for resolution.
     */
    async findByKeyAndContext(key, context) {
        const result = await (0, postgres_js_1.query)(`SELECT * FROM config_items
       WHERE key = $1
         AND (environment IS NULL OR environment = $2)
         AND (tenant_id IS NULL OR tenant_id = $3)
         AND (user_id IS NULL OR user_id = $4)
       ORDER BY
         CASE level
           WHEN 'user' THEN 4
           WHEN 'tenant' THEN 3
           WHEN 'environment' THEN 2
           WHEN 'global' THEN 1
         END DESC`, [key, context.environment || null, context.tenantId || null, context.userId || null]);
        return result.rows.map(rowToConfigItem);
    }
    /**
     * Resolve a config value using hierarchy precedence.
     * Checks cache first, then database.
     */
    async resolveValue(key, context) {
        const cacheKeyStr = (0, redis_js_1.configCacheKey)(key, context.tenantId, context.environment, context.userId);
        // Check cache first
        const cached = await (0, redis_js_1.cacheGet)(cacheKeyStr);
        if (cached) {
            log.debug({ key, cacheKey: cacheKeyStr }, 'Cache hit for config');
            return { value: cached.value, item: cached };
        }
        // Get all matching items from database
        const items = await this.findByKeyAndContext(key, context);
        if (items.length === 0) {
            return { value: undefined, item: null };
        }
        // Items are already sorted by precedence (highest first)
        // Find the most specific match
        const resolved = this.selectBestMatch(items, context);
        if (resolved) {
            // Cache the resolved item
            await (0, redis_js_1.cacheSet)(cacheKeyStr, resolved);
            return { value: resolved.value, item: resolved };
        }
        return { value: undefined, item: null };
    }
    /**
     * Select the best matching config item based on context.
     */
    selectBestMatch(items, context) {
        // Priority: user > tenant > environment > global
        for (const item of items) {
            if (item.level === 'user' && item.userId === context.userId) {
                return item;
            }
            if (item.level === 'tenant' && item.tenantId === context.tenantId) {
                return item;
            }
            if (item.level === 'environment' &&
                item.environment === context.environment) {
                return item;
            }
            if (item.level === 'global') {
                return item;
            }
        }
        return null;
    }
    /**
     * List all config items for a tenant.
     */
    async listByTenant(tenantId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        const countResult = await (0, postgres_js_1.query)(`SELECT COUNT(*) as count FROM config_items
       WHERE tenant_id IS NOT DISTINCT FROM $1`, [tenantId]);
        const result = await (0, postgres_js_1.query)(`SELECT * FROM config_items
       WHERE tenant_id IS NOT DISTINCT FROM $1
       ORDER BY key, level
       LIMIT $2 OFFSET $3`, [tenantId, limit, offset]);
        return {
            items: result.rows.map(rowToConfigItem),
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Bulk upsert config items.
     */
    async bulkUpsert(items, userId) {
        if (items.length === 0)
            return [];
        return (0, postgres_js_1.transaction)(async (client) => {
            const results = [];
            for (const input of items) {
                const result = await client.query(`INSERT INTO config_items (
            key, value, value_type, level, environment, tenant_id, user_id,
            description, is_secret, is_governance_protected, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
          ON CONFLICT (key, level, environment, tenant_id, user_id)
          DO UPDATE SET
            value = EXCLUDED.value,
            description = COALESCE(EXCLUDED.description, config_items.description),
            is_secret = EXCLUDED.is_secret,
            is_governance_protected = EXCLUDED.is_governance_protected,
            version = config_items.version + 1,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          RETURNING *`, [
                    input.key,
                    JSON.stringify(input.value),
                    input.valueType,
                    input.level,
                    input.environment,
                    input.tenantId,
                    input.userId,
                    input.description,
                    input.isSecret,
                    input.isGovernanceProtected,
                    userId,
                ]);
                if (result.rows[0]) {
                    results.push(rowToConfigItem(result.rows[0]));
                }
            }
            // Invalidate cache for all affected items
            for (const item of results) {
                await this.invalidateCache(item);
            }
            log.info({ count: results.length }, 'Bulk upsert completed');
            return results;
        });
    }
    /**
     * Invalidate cache for a config item.
     */
    async invalidateCache(item) {
        // Delete specific cache entry
        const cacheKeyStr = (0, redis_js_1.configCacheKey)(item.key, item.tenantId, item.environment, item.userId);
        await (0, redis_js_1.cacheDelete)(cacheKeyStr);
        // Also delete any broader cache entries for this key
        await (0, redis_js_1.cacheDeletePattern)(`config:${item.key}:*`);
        // Publish invalidation for distributed cache
        await (0, redis_js_1.publishInvalidation)({
            type: 'config',
            key: item.key,
            tenantId: item.tenantId,
            timestamp: Date.now(),
        });
    }
}
exports.ConfigRepository = ConfigRepository;
exports.configRepository = new ConfigRepository();
