"use strict";
/**
 * Base Tenant Repository - Enforces tenant isolation at the data access layer
 *
 * All repositories SHOULD extend this class to ensure:
 * 1. Every query requires a tenant context
 * 2. All queries automatically filter by tenant_id
 * 3. Cross-tenant access is prevented at the database layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTenantRepository = void 0;
const database_js_1 = require("../config/database.js");
const tenant_context_js_1 = require("../security/tenant-context.js");
/**
 * Base repository with tenant isolation enforcement
 *
 * Features:
 * - Requires TenantContext for all operations
 * - Uses PostgreSQL session variables for defense-in-depth
 * - Automatic tenant_id filtering in all queries
 * - Type-safe CRUD operations
 */
class BaseTenantRepository {
    pool;
    tableName;
    constructor(tableName, pool) {
        this.tableName = tableName;
        this.pool = pool || (0, database_js_1.getPostgresPool)();
    }
    /**
     * Execute a query with tenant context set in PostgreSQL session
     * This enables Row-Level Security (RLS) policies at the database level
     */
    async withTenantContext(context, fn) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const client = await this.pool.connect();
        try {
            // Set PostgreSQL session variables for RLS policies
            await client.query('SET LOCAL app.current_tenant = $1', [context.tenantId]);
            await client.query('SET LOCAL app.request_id = $1', [context.requestId]);
            if (context.traceId) {
                await client.query('SET LOCAL app.trace_id = $1', [context.traceId]);
            }
            return await fn(client);
        }
        finally {
            client.release();
        }
    }
    /**
     * Find a single record by ID, scoped to tenant
     */
    async findById(context, id) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const result = await this.withTenantContext(context, (client) => client.query(`SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`, [id, context.tenantId]));
        return result.rows[0] || null;
    }
    /**
     * Find all records scoped to tenant
     */
    async findAll(context, options) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const { limit, offset, orderBy = 'created_at', orderDirection = 'DESC' } = options || {};
        let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 ORDER BY ${orderBy} ${orderDirection}`;
        const params = [context.tenantId];
        if (limit) {
            params.push(limit);
            query += ` LIMIT $${params.length}`;
        }
        if (offset) {
            params.push(offset);
            query += ` OFFSET $${params.length}`;
        }
        const result = await this.withTenantContext(context, (client) => client.query(query, params));
        return result.rows;
    }
    /**
     * Create a new record, automatically injecting tenant_id
     */
    async create(context, data) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const keys = Object.keys(data);
        const values = keys.map((k) => data[k]);
        // tenant_id is always the first parameter
        const placeholders = keys.map((_, i) => `$${i + 2}`);
        const query = `
      INSERT INTO ${this.tableName} (tenant_id, ${keys.join(', ')})
      VALUES ($1, ${placeholders.join(', ')})
      RETURNING *
    `;
        const result = await this.withTenantContext(context, (client) => client.query(query, [context.tenantId, ...values]));
        if (!result.rows[0]) {
            throw new Error(`Failed to create record in ${this.tableName}`);
        }
        return result.rows[0];
    }
    /**
     * Update a record, enforcing tenant boundary
     */
    async update(context, id, data) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return this.findById(context, id);
        }
        const setClause = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
        const values = keys.map((k) => data[k]);
        const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;
        const result = await this.withTenantContext(context, (client) => client.query(query, [id, context.tenantId, ...values]));
        return result.rows[0] || null;
    }
    /**
     * Delete a record, enforcing tenant boundary
     */
    async delete(context, id) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const result = await this.withTenantContext(context, (client) => client.query(`DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`, [id, context.tenantId]));
        return (result.rowCount ?? 0) > 0;
    }
    /**
     * Count records scoped to tenant
     */
    async count(context) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        const result = await this.withTenantContext(context, (client) => client.query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE tenant_id = $1`, [context.tenantId]));
        return parseInt(result.rows[0].count, 10);
    }
    /**
     * Execute a custom query with tenant context
     * Always include tenant_id in your WHERE clause!
     */
    async executeQuery(context, query, params) {
        (0, tenant_context_js_1.validateTenantContext)(context);
        // Security check: ensure query includes tenant_id parameter
        if (!query.toLowerCase().includes('tenant_id')) {
            throw new tenant_context_js_1.TenantContextError(`Query must include tenant_id filter. Query: ${query.substring(0, 100)}...`);
        }
        return this.withTenantContext(context, (client) => client.query(query, params));
    }
    /**
     * Verify that a record exists and belongs to the context tenant
     * Throws CrossTenantAccessError if tenant mismatch
     */
    async verifyTenantOwnership(context, id) {
        const result = await this.withTenantContext(context, (client) => client.query(`SELECT tenant_id FROM ${this.tableName} WHERE id = $1`, [id]));
        if (result.rows.length === 0) {
            throw new Error(`Record ${id} not found in ${this.tableName}`);
        }
        (0, tenant_context_js_1.assertSameTenant)(context, result.rows[0].tenant_id, this.tableName, id);
    }
}
exports.BaseTenantRepository = BaseTenantRepository;
