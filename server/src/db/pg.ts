import { Pool } from 'pg';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, register } from 'prom-client';

const tracer = trace.getTracer('maestro-postgres', '24.3.0');

// Region-aware database metrics
const dbConnectionsActive =
  (register.getSingleMetric(
    'db_connections_active_total',
  ) as Counter<string>) ||
  new Counter({
    name: 'db_connections_active_total',
    help: 'Total active database connections',
    labelNames: ['region', 'pool_type', 'tenant_id'],
  });

const dbQueryDuration =
  (register.getSingleMetric(
    'db_query_duration_seconds',
  ) as Histogram<string>) ||
  new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['region', 'pool_type', 'operation', 'tenant_id'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

const dbReplicationLag =
  (register.getSingleMetric(
    'db_replication_lag_seconds',
  ) as Histogram<string>) ||
  new Histogram({
    name: 'db_replication_lag_seconds',
    help: 'Database replication lag in seconds',
    labelNames: ['region', 'primary_region'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
  });

// Connection pools for read/write separation
const writePool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_WRITE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: `maestro-write-${process.env.CURRENT_REGION || 'unknown'}`,
});

const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : false,
  max: 30, // More read connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: `maestro-read-${process.env.CURRENT_REGION || 'unknown'}`,
});

// Legacy pool for backward compatibility
export const pool = writePool;

// Helper function to determine query type and select appropriate pool
function getPoolForQuery(
  query: string,
  forceWrite: boolean = false,
): { pool: Pool; poolType: string } {
  const operation = query.trim().split(' ')[0].toLowerCase();
  const isWriteOperation = [
    'insert',
    'update',
    'delete',
    'create',
    'alter',
    'drop',
    'truncate',
  ].includes(operation);

  if (
    forceWrite ||
    isWriteOperation ||
    process.env.READ_ONLY_REGION !== 'true'
  ) {
    return { pool: writePool, poolType: 'write' };
  } else {
    return { pool: readPool, poolType: 'read' };
  }
}

export const pg = {
  // Legacy method with automatic pool selection
  oneOrNone: async (
    query: string,
    params: any[] = [],
    options?: {
      region?: string;
      routerHint?: string;
      tenantId?: string;
      forceWrite?: boolean;
    },
  ) => {
    return tracer.startActiveSpan('postgres.query', async (span: Span) => {
      const operation = query.split(' ')[0].toLowerCase();
      const { pool: selectedPool, poolType } = getPoolForQuery(
        query,
        options?.forceWrite,
      );
      const currentRegion = process.env.CURRENT_REGION || 'unknown';

      span.setAttributes({
        'db.system': 'postgresql',
        'db.statement': query,
        'db.operation': operation,
        'db.pool_type': poolType,
        'db.region': currentRegion,
        tenant_id: options?.tenantId || 'unknown',
      });

      // Enhanced tenant scoping validation
      const scopedQuery = validateAndScopeQuery(
        query,
        params,
        options?.tenantId,
      );
      const startTime = Date.now();

      try {
        dbConnectionsActive.inc({
          region: currentRegion,
          pool_type: poolType,
          tenant_id: options?.tenantId || 'unknown',
        });

        const result = await selectedPool.query(
          scopedQuery.query,
          scopedQuery.params,
        );

        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          {
            region: currentRegion,
            pool_type: poolType,
            operation,
            tenant_id: options?.tenantId || 'unknown',
          },
          duration,
        );

        span.setAttributes({
          'db.rows_affected': result.rowCount || 0,
          'db.tenant_scoped': scopedQuery.wasScoped,
          'db.query_duration': duration,
        });

        return result.rows[0] || null;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  // Explicit read-only method
  read: async (
    query: string,
    params: any[] = [],
    options?: { region?: string; tenantId?: string },
  ) => {
    return tracer.startActiveSpan('postgres.read', async (span: Span) => {
      const operation = query.split(' ')[0].toLowerCase();
      const currentRegion = process.env.CURRENT_REGION || 'unknown';

      // Ensure this is a read operation
      if (!['select', 'with'].includes(operation)) {
        throw new Error(
          `Read method called with write operation: ${operation}`,
        );
      }

      span.setAttributes({
        'db.system': 'postgresql',
        'db.statement': query,
        'db.operation': operation,
        'db.pool_type': 'read',
        'db.region': currentRegion,
        tenant_id: options?.tenantId || 'unknown',
      });

      const scopedQuery = validateAndScopeQuery(
        query,
        params,
        options?.tenantId,
      );
      const startTime = Date.now();

      try {
        dbConnectionsActive.inc({
          region: currentRegion,
          pool_type: 'read',
          tenant_id: options?.tenantId || 'unknown',
        });

        const result = await readPool.query(
          scopedQuery.query,
          scopedQuery.params,
        );

        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          {
            region: currentRegion,
            pool_type: 'read',
            operation,
            tenant_id: options?.tenantId || 'unknown',
          },
          duration,
        );

        span.setAttributes({
          'db.rows_affected': result.rowCount || 0,
          'db.tenant_scoped': scopedQuery.wasScoped,
          'db.query_duration': duration,
        });

        return result.rows[0] || null;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  // Explicit write method
  write: async (
    query: string,
    params: any[] = [],
    options?: { region?: string; tenantId?: string },
  ) => {
    return tracer.startActiveSpan('postgres.write', async (span: Span) => {
      const operation = query.split(' ')[0].toLowerCase();
      const currentRegion = process.env.CURRENT_REGION || 'unknown';

      // Block writes in read-only regions unless this is a failover scenario
      if (
        process.env.READ_ONLY_REGION === 'true' &&
        !process.env.FAILOVER_MODE
      ) {
        throw new Error(
          `Write operations not allowed in read-only region: ${currentRegion}`,
        );
      }

      span.setAttributes({
        'db.system': 'postgresql',
        'db.statement': query,
        'db.operation': operation,
        'db.pool_type': 'write',
        'db.region': currentRegion,
        tenant_id: options?.tenantId || 'unknown',
      });

      const scopedQuery = validateAndScopeQuery(
        query,
        params,
        options?.tenantId,
      );
      const startTime = Date.now();

      try {
        dbConnectionsActive.inc({
          region: currentRegion,
          pool_type: 'write',
          tenant_id: options?.tenantId || 'unknown',
        });

        const result = await writePool.query(
          scopedQuery.query,
          scopedQuery.params,
        );

        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          {
            region: currentRegion,
            pool_type: 'write',
            operation,
            tenant_id: options?.tenantId || 'unknown',
          },
          duration,
        );

        span.setAttributes({
          'db.rows_affected': result.rowCount || 0,
          'db.tenant_scoped': scopedQuery.wasScoped,
          'db.query_duration': duration,
        });

        return result.rows[0] || null;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  // Read many records
  readMany: async (
    query: string,
    params: any[] = [],
    options?: { region?: string; tenantId?: string },
  ) => {
    return tracer.startActiveSpan('postgres.read_many', async (span: Span) => {
      const operation = query.split(' ')[0].toLowerCase();
      const currentRegion = process.env.CURRENT_REGION || 'unknown';

      if (!['select', 'with'].includes(operation)) {
        throw new Error(
          `ReadMany method called with write operation: ${operation}`,
        );
      }

      span.setAttributes({
        'db.system': 'postgresql',
        'db.statement': query,
        'db.operation': operation,
        'db.pool_type': 'read',
        'db.region': currentRegion,
        tenant_id: options?.tenantId || 'unknown',
      });

      const scopedQuery = validateAndScopeQuery(
        query,
        params,
        options?.tenantId,
      );
      const startTime = Date.now();

      try {
        const result = await readPool.query(
          scopedQuery.query,
          scopedQuery.params,
        );

        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          {
            region: currentRegion,
            pool_type: 'read',
            operation,
            tenant_id: options?.tenantId || 'unknown',
          },
          duration,
        );

        span.setAttributes({
          'db.rows_affected': result.rowCount || 0,
          'db.tenant_scoped': scopedQuery.wasScoped,
          'db.query_duration': duration,
        });

        return result.rows;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  many: async (
    query: string,
    params: any[] = [],
    options?: { region?: string; routerHint?: string; tenantId?: string },
  ) => {
    return tracer.startActiveSpan('postgres.query.many', async (span: Span) => {
      span.setAttributes({
        'db.system': 'postgresql',
        'db.statement': query,
        'db.operation': query.split(' ')[0].toLowerCase(),
        tenant_id: options?.tenantId || 'unknown',
      });

      // Enhanced tenant scoping validation
      const scopedQuery = validateAndScopeQuery(
        query,
        params,
        options?.tenantId,
      );

      try {
        const result = await pool.query(scopedQuery.query, scopedQuery.params);
        span.setAttributes({
          'db.rows_affected': result.rowCount || 0,
          'db.tenant_scoped': scopedQuery.wasScoped,
        });
        return result.rows;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  // Tenant-scoped transaction support
  withTenant: async <T>(
    tenantId: string,
    callback: (scopedPg: any) => Promise<T>,
  ): Promise<T> => {
    return tracer.startActiveSpan(
      'postgres.with_tenant',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          'db.system': 'postgresql',
        });

        const scopedPg = {
          oneOrNone: (query: string, params: any[] = []) =>
            pg.oneOrNone(query, params, { tenantId }),
          many: (query: string, params: any[] = []) =>
            pg.many(query, params, { tenantId }),
        };

        try {
          return await callback(scopedPg);
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  },

  healthCheck: async () => {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
      return false;
    }
  },

  close: async () => {
    await pool.end();
  },
};

interface ScopedQuery {
  query: string;
  params: any[];
  wasScoped: boolean;
}

// Tenant scoping validation and enforcement
function validateAndScopeQuery(
  query: string,
  params: any[],
  tenantId?: string,
): ScopedQuery {
  const lowerQuery = query.toLowerCase().trim();

  // Tables that require tenant scoping
  const tenantScopedTables = [
    'coherence_scores',
    'audit_logs',
    'user_sessions',
    'api_keys',
  ];

  // Check if query affects tenant-scoped tables
  const affectedTable = tenantScopedTables.find((table) =>
    lowerQuery.includes(table),
  );

  if (!affectedTable) {
    // Query doesn't affect tenant-scoped tables
    return { query, params, wasScoped: false };
  }

  // For tenant-scoped tables, tenantId is required
  if (!tenantId) {
    throw new Error(`Tenant ID required for queries on ${affectedTable}`);
  }

  // Check if query already has tenant scoping
  if (lowerQuery.includes('tenant_id') && lowerQuery.includes('$')) {
    // Assume query is already properly scoped
    return { query, params, wasScoped: true };
  }

  // Auto-scope the query based on operation type
  if (lowerQuery.startsWith('select')) {
    return scopeSelectQuery(query, params, tenantId, affectedTable);
  } else if (lowerQuery.startsWith('insert')) {
    return scopeInsertQuery(query, params, tenantId, affectedTable);
  } else if (lowerQuery.startsWith('update')) {
    return scopeUpdateQuery(query, params, tenantId, affectedTable);
  } else if (lowerQuery.startsWith('delete')) {
    return scopeDeleteQuery(query, params, tenantId, affectedTable);
  }

  // Fallback for unrecognized query patterns
  console.warn(
    `Unable to auto-scope query for table ${affectedTable}: ${query}`,
  );
  return { query, params, wasScoped: false };
}

function scopeSelectQuery(
  query: string,
  params: any[],
  tenantId: string,
  table: string,
): ScopedQuery {
  const lowerQuery = query.toLowerCase();

  // Add WHERE clause or AND condition for tenant_id
  if (lowerQuery.includes('where')) {
    // Add AND tenant_id = $n condition
    const scopedQuery = query + ` AND tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  } else {
    // Add WHERE tenant_id = $n condition
    const scopedQuery = query + ` WHERE tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  }
}

function scopeInsertQuery(
  query: string,
  params: any[],
  tenantId: string,
  table: string,
): ScopedQuery {
  // For INSERT queries, ensure tenant_id is included in VALUES
  // This is a simplified implementation - in production would need more sophisticated parsing
  console.warn(
    `INSERT query tenant scoping needs manual verification: ${query}`,
  );
  return { query, params, wasScoped: false };
}

function scopeUpdateQuery(
  query: string,
  params: any[],
  tenantId: string,
  table: string,
): ScopedQuery {
  const lowerQuery = query.toLowerCase();

  // Add WHERE tenant_id condition to UPDATE
  if (lowerQuery.includes('where')) {
    const scopedQuery = query + ` AND tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  } else {
    const scopedQuery = query + ` WHERE tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  }
}

function scopeDeleteQuery(
  query: string,
  params: any[],
  tenantId: string,
  table: string,
): ScopedQuery {
  const lowerQuery = query.toLowerCase();

  // Add WHERE tenant_id condition to DELETE
  if (lowerQuery.includes('where')) {
    const scopedQuery = query + ` AND tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  } else {
    const scopedQuery = query + ` WHERE tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  }
}
