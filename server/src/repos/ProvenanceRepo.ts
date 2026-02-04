import { Pool } from 'pg';

export type ProvenanceFilter = {
  reasonCodeIn?: string[];
  kindIn?: string[];
  sourceIn?: string[];
  from?: string;
  to?: string;
  contains?: string;
};

export class ProvenanceRepo {
  constructor(private pg: Pool) { }

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

  private buildTenantWhere(
    filter: ProvenanceFilter | undefined,
    options: { timeColumn: string; searchColumns?: string[] },
  ) {
    const where: string[] = [];
    const params: any[] = [];

    if (filter?.from) {
      where.push(
        `(${options.timeColumn} >= $${params.push(filter.from)})`,
      );
    }
    if (filter?.to) {
      where.push(
        `(${options.timeColumn} <= $${params.push(filter.to)})`,
      );
    }
    if (filter?.contains && filter.contains.trim().length >= 3) {
      const c = filter.contains.trim();
      const searchColumns =
        options.searchColumns && options.searchColumns.length
          ? options.searchColumns
          : ['metadata', 'resource_data', 'new_values', 'old_values'];
      const searchConditions = searchColumns.map(
        (column) => `COALESCE(${column}::text,'') ILIKE '%' || $${params.push(c)} || '%'`,
      );
      where.push(`(
        COALESCE(action,'') || ' ' || COALESCE(target_type,'') || ' ' || COALESCE(resource_type,'') ILIKE '%' || $${params.push(c)} || '%' OR
        ${searchConditions.join(' OR ')}
      )`);
    }

    return {
      where: where.length ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

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
    const tenantId =
      r.tenant_id ||
      (metadata && typeof metadata === 'object' && metadata.tenantId) ||
      (metadata && typeof metadata === 'object' && metadata.tenant_id) ||
      null;
    const normalizedMetadata =
      metadata && typeof metadata === 'object'
        ? { ...metadata, ...(tenantId ? { tenantId } : {}) }
        : metadata;
    return {
      id: r.id,
      kind,
      tenantId: tenantId || undefined,
      createdAt:
        createdAt instanceof Date
          ? createdAt.toISOString()
          : new Date(createdAt).toISOString(),
      metadata: normalizedMetadata,
    };
  }

  private appendTenantScope(
    where: string,
    params: any[],
    tenantId?: string | null,
  ) {
    if (!tenantId) return { where, params };
    const scopedParams = [...params, tenantId];
    const tenantWhere = where
      ? `${where} AND tenant_id = $${scopedParams.length}`
      : `WHERE tenant_id = $${scopedParams.length}`;
    return { where: tenantWhere, params: scopedParams };
  }

  private withPaging(params: any[], first: number, offset: number) {
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    return {
      clause: ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params: [...params, first, offset],
    };
  }

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
      const queries: Array<{ sql: string; params: any[] }> = [];

      const addQuery = (
        baseSql: string,
        orderBy: string,
        scoped: boolean,
      ) => {
        const scopedWhere = scoped
          ? this.appendTenantScope(where, params, tenantId)
          : { where, params };
        const { clause, params: withPaging } = this.withPaging(
          scopedWhere.params,
          first,
          offset,
        );
        queries.push({
          sql: `${baseSql} ${scopedWhere.where} ${orderBy}${clause}`,
          params: withPaging,
        });
      };

      if (tenantId) {
        addQuery(
          'SELECT id, action, resource_type, resource_id, details AS metadata, timestamp AS created_at, tenant_id FROM audit_events',
          'ORDER BY COALESCE(created_at, NOW()) DESC',
          true,
        );
        addQuery(
          'SELECT id, action, target_type, target_id, metadata, created_at, tenant_id FROM audit_events',
          'ORDER BY COALESCE(created_at, NOW()) DESC',
          true,
        );
        addQuery(
          'SELECT id, action, resource_type, resource_id, resource_data, old_values, new_values, investigation_id, timestamp, tenant_id FROM audit_events',
          'ORDER BY COALESCE(timestamp, NOW()) DESC',
          true,
        );
        addQuery(
          'SELECT id, source, subject_type, subject_id, note, created_at, tenant_id FROM provenance',
          'ORDER BY created_at DESC',
          true,
        );
      } else {
        addQuery(
          'SELECT id, action, resource_type, resource_id, details AS metadata, timestamp AS created_at FROM audit_events',
          'ORDER BY COALESCE(created_at, NOW()) DESC',
          false,
        );
        addQuery(
          'SELECT id, action, target_type, target_id, metadata, created_at FROM audit_events',
          'ORDER BY COALESCE(created_at, NOW()) DESC',
          false,
        );
        addQuery(
          'SELECT id, action, resource_type, resource_id, resource_data, old_values, new_values, investigation_id, timestamp FROM audit_events',
          'ORDER BY COALESCE(timestamp, NOW()) DESC',
          false,
        );
        addQuery(
          'SELECT id, source, subject_type, subject_id, note, created_at FROM provenance',
          'ORDER BY created_at DESC',
          false,
        );
      }

      for (const { sql, params: queryParams } of queries) {
        try {
          const res = await client.query(sql, queryParams);
          const mapped = res?.rows?.map(this.mapRow) ?? [];
          if (mapped.length) return mapped;
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

  async getTenantStats(
    tenantId: string,
    filter?: ProvenanceFilter,
  ): Promise<{ count: number; lastEventAt: string | null }> {
    const client = await this.pg.connect();
    try {
      const statsQueries: Array<{
        sql: string;
        params: any[];
        timeColumn: string;
        searchColumns: string[];
      }> = [
        {
          sql: `SELECT COUNT(*) as count, MAX(timestamp) as last_event_at
            FROM audit_events`,
          params: [],
          timeColumn: 'timestamp',
          searchColumns: ['details'],
        },
        {
          sql: `SELECT COUNT(*) as count, MAX(created_at) as last_event_at
            FROM audit_events`,
          params: [],
          timeColumn: 'created_at',
          searchColumns: ['metadata'],
        },
        {
          sql: `SELECT COUNT(*) as count, MAX(timestamp) as last_event_at
            FROM audit_events`,
          params: [],
          timeColumn: 'timestamp',
          searchColumns: ['resource_data', 'old_values', 'new_values'],
        },
        {
          sql: `SELECT COUNT(*) as count, MAX(created_at) as last_event_at
            FROM provenance`,
          params: [],
          timeColumn: 'created_at',
          searchColumns: ['note'],
        },
      ];

      for (const query of statsQueries) {
        const { where, params } = this.buildTenantWhere(filter, {
          timeColumn: query.timeColumn,
          searchColumns: query.searchColumns,
        });
        const scopedWhere = this.appendTenantScope(where, params, tenantId);

        try {
          const res = await client.query(
            `${query.sql} ${scopedWhere.where}`,
            scopedWhere.params,
          );
          if (res.rows.length > 0) {
            const count = parseInt(res.rows[0].count, 10);
            if (count > 0) {
              const lastEventAt = res.rows[0].last_event_at
                ? (res.rows[0].last_event_at instanceof Date
                  ? res.rows[0].last_event_at.toISOString()
                  : new Date(res.rows[0].last_event_at).toISOString())
                : null;
              return { count, lastEventAt };
            }
          }
        } catch (e: any) {
          // Only catch schema mismatch errors (undefined table/column)
          if (e.code === '42P01' || e.code === '42703') {
            continue;
          }
          throw e;
        }
      }
      return { count: 0, lastEventAt: null };
    } finally {
      client.release();
    }
  }

  async byTenant(
    tenantId: string,
    filter?: ProvenanceFilter,
    first = 1000,
    offset = 0,
  ) {
    const client = await this.pg.connect();
    try {
      const queries: Array<{
        sql: string;
        params: any[];
        timeColumn: string;
        searchColumns: string[];
      }> = [
        {
          sql: `SELECT id, action, resource_type, resource_id, details AS metadata, timestamp AS created_at, tenant_id
            FROM audit_events`,
          params: [],
          timeColumn: 'timestamp',
          searchColumns: ['details'],
        },
        {
          sql: `SELECT id, action, target_type, target_id, metadata, created_at, tenant_id
            FROM audit_events`,
          params: [],
          timeColumn: 'created_at',
          searchColumns: ['metadata'],
        },
        {
          sql: `SELECT id, action, resource_type, resource_id, resource_data, old_values, new_values, investigation_id, timestamp, tenant_id
            FROM audit_events`,
          params: [],
          timeColumn: 'timestamp',
          searchColumns: ['resource_data', 'old_values', 'new_values'],
        },
        {
          sql: `SELECT id, source, subject_type, subject_id, note, created_at, tenant_id
            FROM provenance`,
          params: [],
          timeColumn: 'created_at',
          searchColumns: ['note'],
        },
      ];

      for (const query of queries) {
        const { where, params } = this.buildTenantWhere(filter, {
          timeColumn: query.timeColumn,
          searchColumns: query.searchColumns,
        });
        const scopedWhere = this.appendTenantScope(where, params, tenantId);
        const { clause, params: withPaging } = this.withPaging(
          scopedWhere.params,
          first,
          offset,
        );
        try {
          const res = await client.query(
            `${query.sql} ${scopedWhere.where} ORDER BY ${query.timeColumn} DESC${clause}`,
            withPaging,
          );
          const mapped = res?.rows?.map(this.mapRow) ?? [];
          if (mapped.length) return mapped;
        } catch (e: any) {
          continue;
        }
      }
      return [];
    } finally {
      client.release();
    }
  }
}
