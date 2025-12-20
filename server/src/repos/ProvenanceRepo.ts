import { Pool } from 'pg';

export type ProvenanceFilter = {
  reasonCodeIn?: string[];
  kindIn?: string[];
  sourceIn?: string[];
  from?: string;
  to?: string;
  contains?: string;
};

/**
 * Repository for accessing provenance and audit trail data.
 * Supports querying across multiple legacy schema versions (audit_events v1/v2, provenance).
 */
export class ProvenanceRepo {
  constructor(private pg: Pool) {}

  /**
   * Builds the WHERE clause and parameters for querying provenance data.
   * Handles complex filtering logic across multiple schema variations.
   *
   * @param scope - The scope of the query ('incident' or 'investigation').
   * @param id - The ID of the target entity.
   * @param filter - Optional filters for refining the results.
   * @returns An object containing the WHERE clause string and the array of parameters.
   */
  private buildWhere(
    scope: 'incident' | 'investigation',
    id: string,
    filter?: ProvenanceFilter,
  ) {
    const where: string[] = [];
    const params: any[] = [];

    // Scope matching across possible schemas
    // audit_events v1: action, target_type, target_id, metadata, created_at
    // audit_events v2: action, resource_type, resource_id, investigation_id, timestamp, resource_data/new_values/old_values
    // provenance (minimal): subject_type, subject_id, source, note, created_at
    const targetChecks = [
      `(target_type = $${params.push(scope)} AND target_id = $${params.push(id)})`,
      `(resource_type = $${params.push(scope)} AND resource_id = $${params.push(id)})`,
      `(investigation_id = $${params.push(id)})`,
      `(subject_type = $${params.push(scope === 'incident' ? 'incident' : 'investigation')} AND subject_id = $${params.push(id)})`,
      `(metadata::text ILIKE '%' || $${params.push(id)} || '%')`,
      `(resource_data::text ILIKE '%' || $${params.push(id)} || '%')`,
      `(new_values::text ILIKE '%' || $${params.push(id)} || '%')`,
      `(old_values::text ILIKE '%' || $${params.push(id)} || '%')`,
    ];
    where.push(`(${targetChecks.join(' OR ')})`);

    if (filter?.from) {
      where.push(
        `(COALESCE(created_at, timestamp) >= $${params.push(filter.from)})`,
      );
    }
    if (filter?.to) {
      where.push(
        `(COALESCE(created_at, timestamp) <= $${params.push(filter.to)})`,
      );
    }
    if (filter?.contains && filter.contains.trim().length >= 3) {
      const c = filter.contains.trim();
      where.push(`(
        COALESCE(action,'') || ' ' || COALESCE(target_type,'') || ' ' || COALESCE(resource_type,'') ILIKE '%' || $${params.push(c)} || '%' OR
        COALESCE(metadata::text,'') ILIKE '%' || $${params.push(c)} || '%' OR
        COALESCE(resource_data::text,'') ILIKE '%' || $${params.push(c)} || '%' OR
        COALESCE(new_values::text,'') ILIKE '%' || $${params.push(c)} || '%' OR
        COALESCE(old_values::text,'') ILIKE '%' || $${params.push(c)} || '%'
      )`);
    }
    if (filter?.reasonCodeIn?.length) {
      // metadata->>'reasonCode' IN (...)
      where.push(
        `(COALESCE(metadata->>'reasonCode','') = ANY($${params.push(filter.reasonCodeIn)}))`,
      );
    }
    if (filter?.kindIn?.length) {
      // action or resource_type as kind
      where.push(
        `((COALESCE(action,'') = ANY($${params.push(filter.kindIn)})) OR (COALESCE(resource_type,'') = ANY($${params.push(filter.kindIn)})))`,
      );
    }
    if (filter?.sourceIn?.length) {
      // provenance.source (if available)
      where.push(
        `(COALESCE(source,'') = ANY($${params.push(filter.sourceIn)}))`,
      );
    }

    return {
      where: where.length ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

  /**
   * Normalizes a raw database row into a standard API response shape.
   * Handles variations in column names across different schema versions.
   *
   * @param r - The raw database row.
   * @returns A normalized object with id, kind, createdAt, and metadata.
   */
  private mapRow(r: any) {
    // Normalize to API shape
    const createdAt = r.created_at || r.timestamp || new Date();
    const metadata =
      r.metadata ||
      r.resource_data ||
      r.new_values ||
      r.old_values ||
      (r.note ? { note: r.note } : {});
    const kind = r.action || r.resource_type || r.source || 'event';
    return {
      id: r.id,
      kind,
      createdAt:
        createdAt instanceof Date
          ? createdAt.toISOString()
          : new Date(createdAt).toISOString(),
      metadata,
    };
  }

  /**
   * Retrieves provenance records associated with a specific incident or investigation.
   * Queries multiple potential tables (audit_events, provenance) to find relevant records.
   *
   * @param scope - The context scope ('incident' or 'investigation').
   * @param id - The unique identifier of the entity.
   * @param filter - Optional filters.
   * @param first - Limit for pagination (default: 1000).
   * @param offset - Offset for pagination (default: 0).
   * @param tenantId - Optional tenant ID to scope the query.
   * @returns A list of normalized provenance records.
   */
  async by(
    scope: 'incident' | 'investigation',
    id: string,
    filter?: ProvenanceFilter,
    first = 1000,
    offset = 0,
    tenantId?: string | null,
  ) {
    const client = await this.pg.connect();
    try {
      const { where, params } = this.buildWhere(scope, id, filter);

      // Prefer audit_events if present; fallback to provenance
      const baseLimit = ` LIMIT $${params.push(first)} OFFSET $${params.push(offset)}`;
      const sqls: string[] = [];
      if (tenantId) {
        sqls.push(
          `SELECT id, action, target_type, target_id, metadata, created_at FROM audit_events ${where} AND tenant_id = $${params.push(tenantId)} ORDER BY COALESCE(created_at, NOW()) DESC${baseLimit}`,
          `SELECT id, action, resource_type, resource_id, resource_data, old_values, new_values, investigation_id, timestamp FROM audit_events ${where} AND tenant_id = $${params.push(tenantId)} ORDER BY COALESCE(timestamp, NOW()) DESC${baseLimit}`,
        );
      }
      // Non-tenant filtered fallbacks
      sqls.push(
        `SELECT id, action, target_type, target_id, metadata, created_at FROM audit_events ${where} ORDER BY COALESCE(created_at, NOW()) DESC${baseLimit}`,
        `SELECT id, action, resource_type, resource_id, resource_data, old_values, new_values, investigation_id, timestamp FROM audit_events ${where} ORDER BY COALESCE(timestamp, NOW()) DESC${baseLimit}`,
        `SELECT id, source, subject_type, subject_id, note, created_at FROM provenance ${where} ORDER BY created_at DESC${baseLimit}`,
      );

      for (const sql of sqls) {
        try {
          const res = await client.query(sql, params);
          if (res?.rows) return res.rows.map(this.mapRow);
        } catch (e: any) {
          // try next shape
          continue;
        }
      }
      return [];
    } finally {
      client.release();
    }
  }
}
