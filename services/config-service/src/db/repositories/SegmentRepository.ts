import { query, transaction } from '../postgres.js';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  segmentCacheKey,
  publishInvalidation,
} from '../redis.js';
import { logger } from '../../utils/logger.js';
import type { Segment, CreateSegmentInput, SegmentRule } from '../../types/index.js';

const log = logger.child({ module: 'SegmentRepository' });

interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string | null;
  rules: SegmentRule[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

function rowToSegment(row: SegmentRow): Segment {
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

export class SegmentRepository {
  /**
   * Create a new segment.
   */
  async create(input: CreateSegmentInput, userId: string): Promise<Segment> {
    const result = await query<SegmentRow>(
      `INSERT INTO segments (name, description, tenant_id, rules, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [
        input.name,
        input.description,
        input.tenantId,
        JSON.stringify(input.rules),
        userId,
      ],
    );

    const segment = rowToSegment(result.rows[0]);
    log.info({ name: segment.name, id: segment.id }, 'Segment created');
    return segment;
  }

  /**
   * Update an existing segment.
   */
  async update(
    id: string,
    input: Partial<CreateSegmentInput>,
    userId: string,
  ): Promise<Segment | null> {
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

    const result = await query<SegmentRow>(
      `UPDATE segments SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rowCount === 0) return null;

    const segment = rowToSegment(result.rows[0]);
    await this.invalidateCache(segment);
    log.info({ name: segment.name, id: segment.id }, 'Segment updated');
    return segment;
  }

  /**
   * Delete a segment.
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    const result = await query('DELETE FROM segments WHERE id = $1', [id]);

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
  async findById(id: string): Promise<Segment | null> {
    // Check cache first
    const cacheKeyStr = segmentCacheKey(id);
    const cached = await cacheGet<Segment>(cacheKeyStr);
    if (cached) {
      log.debug({ id }, 'Cache hit for segment');
      return cached;
    }

    const result = await query<SegmentRow>(
      'SELECT * FROM segments WHERE id = $1',
      [id],
    );

    if (!result.rows[0]) return null;

    const segment = rowToSegment(result.rows[0]);
    await cacheSet(cacheKeyStr, segment);
    return segment;
  }

  /**
   * Find a segment by name and tenant.
   */
  async findByName(
    name: string,
    tenantId: string | null,
  ): Promise<Segment | null> {
    const result = await query<SegmentRow>(
      `SELECT * FROM segments
       WHERE name = $1 AND tenant_id IS NOT DISTINCT FROM $2`,
      [name, tenantId],
    );

    return result.rows[0] ? rowToSegment(result.rows[0]) : null;
  }

  /**
   * List all segments for a tenant.
   */
  async listByTenant(
    tenantId: string | null,
    options?: { limit?: number; offset?: number },
  ): Promise<{ segments: Segment[]; total: number }> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM segments
       WHERE tenant_id IS NOT DISTINCT FROM $1`,
      [tenantId],
    );

    const result = await query<SegmentRow>(
      `SELECT * FROM segments
       WHERE tenant_id IS NOT DISTINCT FROM $1
       ORDER BY name
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );

    return {
      segments: result.rows.map(rowToSegment),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Find segments accessible to a tenant (including global segments).
   */
  async findAccessible(tenantId: string | null): Promise<Segment[]> {
    const result = await query<SegmentRow>(
      `SELECT * FROM segments
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY name`,
      [tenantId],
    );

    return result.rows.map(rowToSegment);
  }

  /**
   * Invalidate cache for a segment.
   */
  private async invalidateCache(segment: Segment): Promise<void> {
    await cacheDelete(segmentCacheKey(segment.id));
    await publishInvalidation({
      type: 'segment',
      key: segment.id,
      tenantId: segment.tenantId,
      timestamp: Date.now(),
    });
  }
}

export const segmentRepository = new SegmentRepository();
