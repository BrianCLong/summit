"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.segmentRepository = exports.SegmentRepository = void 0;
const postgres_js_1 = require("../postgres.js");
const redis_js_1 = require("../redis.js");
const logger_js_1 = require("../../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'SegmentRepository' });
function rowToSegment(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        tenantId: row.tenant_id,
        rules: row.rules,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
    };
}
class SegmentRepository {
    /**
     * Create a new segment.
     */
    async create(input, userId) {
        const result = await (0, postgres_js_1.query)(`INSERT INTO segments (name, description, tenant_id, rules, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`, [
            input.name,
            input.description,
            input.tenantId,
            JSON.stringify(input.rules),
            userId,
        ]);
        const segment = rowToSegment(result.rows[0]);
        log.info({ name: segment.name, id: segment.id }, 'Segment created');
        return segment;
    }
    /**
     * Update an existing segment.
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
        if (input.rules !== undefined) {
            updates.push(`rules = $${paramIndex++}`);
            values.push(JSON.stringify(input.rules));
        }
        if (updates.length === 0) {
            return this.findById(id);
        }
        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${paramIndex++}`);
        values.push(userId);
        values.push(id);
        const result = await (0, postgres_js_1.query)(`UPDATE segments SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`, values);
        if (result.rowCount === 0)
            return null;
        const segment = rowToSegment(result.rows[0]);
        await this.invalidateCache(segment);
        log.info({ name: segment.name, id: segment.id }, 'Segment updated');
        return segment;
    }
    /**
     * Delete a segment.
     */
    async delete(id) {
        const existing = await this.findById(id);
        if (!existing)
            return false;
        const result = await (0, postgres_js_1.query)('DELETE FROM segments WHERE id = $1', [id]);
        if (result.rowCount && result.rowCount > 0) {
            await this.invalidateCache(existing);
            log.info({ name: existing.name, id }, 'Segment deleted');
            return true;
        }
        return false;
    }
    /**
     * Find a segment by ID.
     */
    async findById(id) {
        // Check cache first
        const cacheKeyStr = (0, redis_js_1.segmentCacheKey)(id);
        const cached = await (0, redis_js_1.cacheGet)(cacheKeyStr);
        if (cached) {
            log.debug({ id }, 'Cache hit for segment');
            return cached;
        }
        const result = await (0, postgres_js_1.query)('SELECT * FROM segments WHERE id = $1', [id]);
        if (!result.rows[0])
            return null;
        const segment = rowToSegment(result.rows[0]);
        await (0, redis_js_1.cacheSet)(cacheKeyStr, segment);
        return segment;
    }
    /**
     * Find a segment by name and tenant.
     */
    async findByName(name, tenantId) {
        const result = await (0, postgres_js_1.query)(`SELECT * FROM segments
       WHERE name = $1 AND tenant_id IS NOT DISTINCT FROM $2`, [name, tenantId]);
        return result.rows[0] ? rowToSegment(result.rows[0]) : null;
    }
    /**
     * List all segments for a tenant.
     */
    async listByTenant(tenantId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        const countResult = await (0, postgres_js_1.query)(`SELECT COUNT(*) as count FROM segments
       WHERE tenant_id IS NOT DISTINCT FROM $1`, [tenantId]);
        const result = await (0, postgres_js_1.query)(`SELECT * FROM segments
       WHERE tenant_id IS NOT DISTINCT FROM $1
       ORDER BY name
       LIMIT $2 OFFSET $3`, [tenantId, limit, offset]);
        return {
            segments: result.rows.map(rowToSegment),
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Find segments accessible to a tenant (including global segments).
     */
    async findAccessible(tenantId) {
        const result = await (0, postgres_js_1.query)(`SELECT * FROM segments
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY name`, [tenantId]);
        return result.rows.map(rowToSegment);
    }
    /**
     * Invalidate cache for a segment.
     */
    async invalidateCache(segment) {
        await (0, redis_js_1.cacheDelete)((0, redis_js_1.segmentCacheKey)(segment.id));
        await (0, redis_js_1.publishInvalidation)({
            type: 'segment',
            key: segment.id,
            tenantId: segment.tenantId,
            timestamp: Date.now(),
        });
    }
}
exports.SegmentRepository = SegmentRepository;
exports.segmentRepository = new SegmentRepository();
