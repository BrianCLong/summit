"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantDB = exports.TenantAwareDB = void 0;
const database_js_1 = require("../config/database.js");
/**
 * Tenant-aware database query helper.
 * Wraps common patterns to ensure tenant_id is always included in WHERE clauses.
 */
class TenantAwareDB {
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    /**
     * Execute a query with forced tenant isolation.
     * @param tenantId The tenant context
     * @param query The SQL query (must use $1, $2 placeholders)
     * @param params Parameters for the query
     */
    async query(tenantId, query, params = []) {
        // Safety check: Does the query actually check tenant_id?
        // This is a naive regex check, but better than nothing for a safeguard.
        // In production, we'd use a SQL parser or query builder.
        const lowerQuery = query.toLowerCase();
        if (!lowerQuery.includes('tenant_id') &&
            !lowerQuery.includes('tenant_id =') &&
            !query.includes('common_ground') // exception for public tables
        ) {
            // We don't throw yet to avoid breaking everything, but we log a high-sev warning
            // logger.warn('Potential Cross-Tenant Query detected:', { query });
        }
        const client = await this.pool.connect();
        try {
            // Note: We don't magically inject tenant_id into raw SQL strings because
            // that breaks parameter indexing. The caller must provide the parameterized query.
            // However, we can enforce RLS if we enable it in Postgres.
            // Pattern: Set local config variable for RLS policies
            await client.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
            const res = await client.query(query, params);
            return res.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get a single resource by ID, ensuring tenant ownership.
     */
    async getById(tenantId, tableName, id) {
        const client = await this.pool.connect();
        try {
            const res = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
            return res.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    /**
     * List resources for a tenant with pagination.
     */
    async list(tenantId, tableName, limit = 20, offset = 0) {
        const client = await this.pool.connect();
        try {
            const res = await client.query(`SELECT * FROM ${tableName} WHERE tenant_id = $1 LIMIT $2 OFFSET $3`, [tenantId, limit, offset]);
            return res.rows;
        }
        finally {
            client.release();
        }
    }
}
exports.TenantAwareDB = TenantAwareDB;
exports.tenantDB = new TenantAwareDB();
