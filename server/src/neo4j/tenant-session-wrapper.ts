/**
 * Neo4j Tenant Session Wrapper
 *
 * Enforces tenant isolation for all Neo4j queries by:
 * 1. Requiring TenantContext for all operations
 * 2. Automatically injecting tenant_id into query parameters
 * 3. Validating that queries include tenant filtering
 * 4. Providing type-safe query execution
 */

import { Driver, Session, Result, Integer } from 'neo4j-driver';
import { TenantContext, MinimalTenantContext, validateTenantContext, TenantContextError } from '../security/tenant-context.js';
import { TenantId } from '../types/identity.js';

/**
 * Options for Neo4j session creation
 */
export interface TenantSessionOptions {
  database?: string;
  defaultAccessMode?: 'READ' | 'WRITE';
  bookmarks?: string | string[];
  fetchSize?: number | Integer;
  impersonatedUser?: string;
}

/**
 * Query execution result with tenant metadata
 */
export interface TenantQueryResult<T = any> extends Result {
  tenantId: TenantId;
  requestId: string;
}

/**
 * Tenant-aware Neo4j session wrapper
 *
 * Usage:
 * ```typescript
 * const session = new TenantNeo4jSession(driver, tenantContext);
 * const result = await session.run(`
 *   MATCH (n:Entity {tenant_id: $tenantId})
 *   WHERE n.id = $entityId
 *   RETURN n
 * `, { entityId: '123' });
 * await session.close();
 * ```
 */
export class TenantNeo4jSession {
  private session: Session;
  private context: TenantContext | MinimalTenantContext;
  private queriesExecuted: number = 0;

  constructor(
    driver: Driver,
    context: TenantContext | MinimalTenantContext,
    options?: TenantSessionOptions
  ) {
    validateTenantContext(context);
    this.context = context;

    this.session = driver.session({
      database: options?.database,
      defaultAccessMode: options?.defaultAccessMode === 'READ'
        ? require('neo4j-driver').session.READ
        : require('neo4j-driver').session.WRITE,
      bookmarks: options?.bookmarks,
      fetchSize: options?.fetchSize,
      impersonatedUser: options?.impersonatedUser,
    });
  }

  /**
   * Execute a Cypher query with tenant context enforcement
   *
   * Automatically injects: tenantId, requestId, traceId
   * Validates: Query must include tenant_id filtering
   */
  async run<T = any>(
    query: string,
    parameters?: Record<string, any>
  ): Promise<TenantQueryResult<T>> {
    this.validateQueryHasTenantFilter(query);

    // Merge tenant context into parameters
    const enrichedParameters = {
      ...parameters,
      tenantId: this.context.tenantId,
      requestId: this.context.requestId,
      traceId: this.context.traceId,
    };

    try {
      this.queriesExecuted++;
      const result = await this.session.run(query, enrichedParameters) as any;

      // Attach tenant metadata to result
      result.tenantId = this.context.tenantId;
      result.requestId = this.context.requestId;

      return result;
    } catch (error: any) {
      throw new Error(
        `Neo4j query failed for tenant ${this.context.tenantId}: ${error.message}\nQuery: ${query.substring(0, 200)}...`
      );
    }
  }

  /**
   * Execute a read transaction with tenant context
   */
  async executeRead<T>(
    work: (tx: any) => Promise<T>
  ): Promise<T> {
    return this.session.executeRead(async (tx: any) => {
      // Wrap transaction to inject tenant context
      const tenantAwareTx = this.wrapTransaction(tx);
      return work(tenantAwareTx);
    });
  }

  /**
   * Execute a write transaction with tenant context
   */
  async executeWrite<T>(
    work: (tx: any) => Promise<T>
  ): Promise<T> {
    return this.session.executeWrite(async (tx: any) => {
      // Wrap transaction to inject tenant context
      const tenantAwareTx = this.wrapTransaction(tx);
      return work(tenantAwareTx);
    });
  }

  /**
   * Close the session
   */
  async close(): Promise<void> {
    await this.session.close();
  }

  /**
   * Get tenant context
   */
  getTenantContext(): TenantContext | MinimalTenantContext {
    return this.context;
  }

  /**
   * Get statistics about session usage
   */
  getStats(): { queriesExecuted: number; tenantId: TenantId } {
    return {
      queriesExecuted: this.queriesExecuted,
      tenantId: this.context.tenantId,
    };
  }

  /**
   * Validates that query includes tenant_id filtering
   * Throws TenantContextError if validation fails
   */
  private validateQueryHasTenantFilter(query: string): void {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ');

    // Check if query includes tenant_id parameter
    const hasTenantIdParam = normalizedQuery.includes('tenant_id: $tenantid') ||
                             normalizedQuery.includes('tenant_id:$tenantid') ||
                             normalizedQuery.includes('{tenant_id: $tenantid}') ||
                             normalizedQuery.includes('{tenant_id:$tenantid}');

    // Allow system queries without tenant filtering (migrations, schema setup)
    const isSystemQuery = normalizedQuery.startsWith('call db.') ||
                          normalizedQuery.startsWith('create constraint') ||
                          normalizedQuery.startsWith('create index') ||
                          normalizedQuery.startsWith('drop constraint') ||
                          normalizedQuery.startsWith('drop index');

    if (!hasTenantIdParam && !isSystemQuery) {
      throw new TenantContextError(
        `Neo4j query must include tenant_id filtering. Use {tenant_id: $tenantId} in your MATCH clause.\nQuery: ${query.substring(0, 150)}...`
      );
    }
  }

  /**
   * Wraps a transaction to inject tenant context
   */
  private wrapTransaction(tx: any): any {
    const originalRun = tx.run.bind(tx);

    return {
      ...tx,
      run: (query: string, parameters?: Record<string, any>) => {
        this.validateQueryHasTenantFilter(query);

        const enrichedParameters = {
          ...parameters,
          tenantId: this.context.tenantId,
          requestId: this.context.requestId,
          traceId: this.context.traceId,
        };

        return originalRun(query, enrichedParameters);
      },
    };
  }
}

/**
 * Factory function to create tenant-aware sessions
 *
 * @example
 * ```typescript
 * const session = createTenantSession(neo4jDriver, tenantContext);
 * try {
 *   const result = await session.run('MATCH (n:User {tenant_id: $tenantId}) RETURN n');
 *   // ... process result
 * } finally {
 *   await session.close();
 * }
 * ```
 */
export function createTenantSession(
  driver: Driver,
  context: TenantContext | MinimalTenantContext,
  options?: TenantSessionOptions
): TenantNeo4jSession {
  return new TenantNeo4jSession(driver, context, options);
}

/**
 * Helper function to execute a single query with automatic session management
 *
 * @example
 * ```typescript
 * const result = await executeTenantQuery(
 *   driver,
 *   tenantContext,
 *   'MATCH (n:Entity {tenant_id: $tenantId}) WHERE n.id = $id RETURN n',
 *   { id: '123' }
 * );
 * ```
 */
export async function executeTenantQuery<T = any>(
  driver: Driver,
  context: TenantContext | MinimalTenantContext,
  query: string,
  parameters?: Record<string, any>,
  options?: TenantSessionOptions
): Promise<TenantQueryResult<T>> {
  const session = createTenantSession(driver, context, options);
  try {
    return await session.run<T>(query, parameters);
  } finally {
    await session.close();
  }
}

/**
 * Helper to create a node with tenant_id automatically injected
 */
export async function createTenantNode(
  driver: Driver,
  context: TenantContext | MinimalTenantContext,
  label: string,
  properties: Record<string, any>
): Promise<TenantQueryResult> {
  const session = createTenantSession(driver, context);
  try {
    return await session.run(
      `CREATE (n:${label} {tenant_id: $tenantId, requestId: $requestId, traceId: $traceId, properties: $properties})
       RETURN n`,
      { properties }
    );
  } finally {
    await session.close();
  }
}

/**
 * Helper to find nodes scoped to tenant
 */
export async function findTenantNodes(
  driver: Driver,
  context: TenantContext | MinimalTenantContext,
  label: string,
  filter?: Record<string, any>
): Promise<TenantQueryResult> {
  const session = createTenantSession(driver, context);
  try {
    const filterClause = filter
      ? Object.keys(filter).map(key => `n.${key} = $${key}`).join(' AND ')
      : 'true';

    return await session.run(
      `MATCH (n:${label} {tenant_id: $tenantId})
       WHERE ${filterClause}
       RETURN n`,
      filter
    );
  } finally {
    await session.close();
  }
}
