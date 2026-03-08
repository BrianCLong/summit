"use strict";
/**
 * Neo4j Tenant Session Wrapper
 *
 * Enforces tenant isolation for all Neo4j queries by:
 * 1. Requiring TenantContext for all operations
 * 2. Automatically injecting tenant_id into query parameters
 * 3. Validating that queries include tenant filtering
 * 4. Providing type-safe query execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantNeo4jSession = void 0;
exports.createTenantSession = createTenantSession;
exports.executeTenantQuery = executeTenantQuery;
exports.createTenantNode = createTenantNode;
exports.findTenantNodes = findTenantNodes;
const tenant_context_js_1 = require("../security/tenant-context.js");
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
class TenantNeo4jSession {
    session;
    context;
    queriesExecuted = 0;
    constructor(driver, context, options) {
        (0, tenant_context_js_1.validateTenantContext)(context);
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
    async run(query, parameters) {
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
            const result = await this.session.run(query, enrichedParameters);
            // Attach tenant metadata to result
            result.tenantId = this.context.tenantId;
            result.requestId = this.context.requestId;
            return result;
        }
        catch (error) {
            throw new Error(`Neo4j query failed for tenant ${this.context.tenantId}: ${error.message}\nQuery: ${query.substring(0, 200)}...`);
        }
    }
    /**
     * Execute a read transaction with tenant context
     */
    async executeRead(work) {
        return this.session.executeRead(async (tx) => {
            // Wrap transaction to inject tenant context
            const tenantAwareTx = this.wrapTransaction(tx);
            return work(tenantAwareTx);
        });
    }
    /**
     * Execute a write transaction with tenant context
     */
    async executeWrite(work) {
        return this.session.executeWrite(async (tx) => {
            // Wrap transaction to inject tenant context
            const tenantAwareTx = this.wrapTransaction(tx);
            return work(tenantAwareTx);
        });
    }
    /**
     * Close the session
     */
    async close() {
        await this.session.close();
    }
    /**
     * Get tenant context
     */
    getTenantContext() {
        return this.context;
    }
    /**
     * Get statistics about session usage
     */
    getStats() {
        return {
            queriesExecuted: this.queriesExecuted,
            tenantId: this.context.tenantId,
        };
    }
    /**
     * Validates that query includes tenant_id filtering
     * Throws TenantContextError if validation fails
     */
    validateQueryHasTenantFilter(query) {
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
            throw new tenant_context_js_1.TenantContextError(`Neo4j query must include tenant_id filtering. Use {tenant_id: $tenantId} in your MATCH clause.\nQuery: ${query.substring(0, 150)}...`);
        }
    }
    /**
     * Wraps a transaction to inject tenant context
     */
    wrapTransaction(tx) {
        const originalRun = tx.run.bind(tx);
        return {
            ...tx,
            run: (query, parameters) => {
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
exports.TenantNeo4jSession = TenantNeo4jSession;
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
function createTenantSession(driver, context, options) {
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
async function executeTenantQuery(driver, context, query, parameters, options) {
    const session = createTenantSession(driver, context, options);
    try {
        return await session.run(query, parameters);
    }
    finally {
        await session.close();
    }
}
/**
 * Helper to create a node with tenant_id automatically injected
 */
async function createTenantNode(driver, context, label, properties) {
    const session = createTenantSession(driver, context);
    try {
        return await session.run(`CREATE (n:${label} {tenant_id: $tenantId, requestId: $requestId, traceId: $traceId, properties: $properties})
       RETURN n`, { properties });
    }
    finally {
        await session.close();
    }
}
/**
 * Helper to find nodes scoped to tenant
 */
async function findTenantNodes(driver, context, label, filter) {
    const session = createTenantSession(driver, context);
    try {
        const filterClause = filter
            ? Object.keys(filter).map(key => `n.${key} = $${key}`).join(' AND ')
            : 'true';
        return await session.run(`MATCH (n:${label} {tenant_id: $tenantId})
       WHERE ${filterClause}
       RETURN n`, filter);
    }
    finally {
        await session.close();
    }
}
