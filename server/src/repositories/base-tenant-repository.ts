/**
 * Base Tenant Repository - Enforces tenant isolation at the data access layer
 *
 * All repositories SHOULD extend this class to ensure:
 * 1. Every query requires a tenant context
 * 2. All queries automatically filter by tenant_id
 * 3. Cross-tenant access is prevented at the database layer
 */

import { Pool } from 'pg';

// Define types locally to work around ESM module resolution issues with @types/pg
interface QueryResult<R = any> {
  rows: R[];
  rowCount?: number | null;
  command?: string;
  oid?: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
}

interface PoolClient {
  query<R = any>(queryText: string, values?: any[]): Promise<QueryResult<R>>;
  release(err?: Error | boolean): void;
}
import { getPostgresPool } from '../config/database.js';
import { TenantId } from '../types/identity.js';
import {
  TenantContext,
  MinimalTenantContext,
  validateTenantContext,
  assertSameTenant,
  TenantContextError,
} from '../security/tenant-context.js';

export interface TenantEntity {
  id: string;
  tenant_id: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Base repository with tenant isolation enforcement
 *
 * Features:
 * - Requires TenantContext for all operations
 * - Uses PostgreSQL session variables for defense-in-depth
 * - Automatic tenant_id filtering in all queries
 * - Type-safe CRUD operations
 */
export abstract class BaseTenantRepository<T extends TenantEntity> {
  protected pool: Pool;
  protected readonly tableName: string;

  constructor(tableName: string, pool?: Pool) {
    this.tableName = tableName;
    this.pool = pool || getPostgresPool();
  }

  /**
   * Execute a query with tenant context set in PostgreSQL session
   * This enables Row-Level Security (RLS) policies at the database level
   */
  protected async withTenantContext<R>(
    context: TenantContext | MinimalTenantContext,
    fn: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    validateTenantContext(context);

    const client = await this.pool.connect();
    try {
      // Set PostgreSQL session variables for RLS policies
      await client.query('SET LOCAL app.current_tenant = $1', [context.tenantId]);
      await client.query('SET LOCAL app.request_id = $1', [context.requestId]);

      if (context.traceId) {
        await client.query('SET LOCAL app.trace_id = $1', [context.traceId]);
      }

      return await fn(client);
    } finally {
      client.release();
    }
  }

  /**
   * Find a single record by ID, scoped to tenant
   */
  async findById(
    context: TenantContext | MinimalTenantContext,
    id: string
  ): Promise<T | null> {
    validateTenantContext(context);

    const result = await this.withTenantContext(context, (client) =>
      client.query<T>(
        `SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`,
        [id, context.tenantId]
      )
    );

    return result.rows[0] || null;
  }

  /**
   * Find all records scoped to tenant
   */
  async findAll(
    context: TenantContext | MinimalTenantContext,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<T[]> {
    validateTenantContext(context);

    const { limit, offset, orderBy = 'created_at', orderDirection = 'DESC' } = options || {};

    let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 ORDER BY ${orderBy} ${orderDirection}`;
    const params: any[] = [context.tenantId];

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }

    if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await this.withTenantContext(context, (client) =>
      client.query<T>(query, params)
    );

    return result.rows;
  }

  /**
   * Create a new record, automatically injecting tenant_id
   */
  async create(
    context: TenantContext | MinimalTenantContext,
    data: Omit<T, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<T> {
    validateTenantContext(context);

    const keys = Object.keys(data);
    const values = keys.map((k) => (data as any)[k]);

    // tenant_id is always the first parameter
    const placeholders = keys.map((_, i) => `$${i + 2}`);

    const query = `
      INSERT INTO ${this.tableName} (tenant_id, ${keys.join(', ')})
      VALUES ($1, ${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.withTenantContext(context, (client) =>
      client.query<T>(query, [context.tenantId, ...values])
    );

    if (!result.rows[0]) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }

    return result.rows[0];
  }

  /**
   * Update a record, enforcing tenant boundary
   */
  async update(
    context: TenantContext | MinimalTenantContext,
    id: string,
    data: Partial<Omit<T, 'id' | 'tenant_id' | 'created_at'>>
  ): Promise<T | null> {
    validateTenantContext(context);

    const keys = Object.keys(data);
    if (keys.length === 0) {
      return this.findById(context, id);
    }

    const setClause = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = keys.map((k) => (data as any)[k]);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    const result = await this.withTenantContext(context, (client) =>
      client.query<T>(query, [id, context.tenantId, ...values])
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a record, enforcing tenant boundary
   */
  async delete(
    context: TenantContext | MinimalTenantContext,
    id: string
  ): Promise<boolean> {
    validateTenantContext(context);

    const result = await this.withTenantContext(context, (client) =>
      client.query(
        `DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`,
        [id, context.tenantId]
      )
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Count records scoped to tenant
   */
  async count(context: TenantContext | MinimalTenantContext): Promise<number> {
    validateTenantContext(context);

    const result = await this.withTenantContext(context, (client) =>
      client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE tenant_id = $1`,
        [context.tenantId]
      )
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Execute a custom query with tenant context
   * Always include tenant_id in your WHERE clause!
   */
  protected async executeQuery<R = any>(
    context: TenantContext | MinimalTenantContext,
    query: string,
    params: any[]
  ): Promise<QueryResult<R>> {
    validateTenantContext(context);

    // Security check: ensure query includes tenant_id parameter
    if (!query.toLowerCase().includes('tenant_id')) {
      throw new TenantContextError(
        `Query must include tenant_id filter. Query: ${query.substring(0, 100)}...`
      );
    }

    return this.withTenantContext(context, (client) => client.query<R>(query, params));
  }

  /**
   * Verify that a record exists and belongs to the context tenant
   * Throws CrossTenantAccessError if tenant mismatch
   */
  protected async verifyTenantOwnership(
    context: TenantContext | MinimalTenantContext,
    id: string
  ): Promise<void> {
    const result = await this.withTenantContext(context, (client) =>
      client.query<{ tenant_id: string }>(
        `SELECT tenant_id FROM ${this.tableName} WHERE id = $1`,
        [id]
      )
    );

    if (result.rows.length === 0) {
      throw new Error(`Record ${id} not found in ${this.tableName}`);
    }

    assertSameTenant(context, result.rows[0].tenant_id, this.tableName, id);
  }
}
