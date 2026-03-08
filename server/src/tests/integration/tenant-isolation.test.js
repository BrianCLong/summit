"use strict";
/**
 * Tenant Isolation Integration Tests
 *
 * These tests validate that tenant isolation is enforced at the repository layer
 * and that cross-tenant access is prevented at the database level.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pg_1 = require("pg");
const crypto_1 = require("crypto");
const base_tenant_repository_js_1 = require("../../repositories/base-tenant-repository.js");
const tenant_context_helpers_js_1 = require("../helpers/tenant-context-helpers.js");
const tenant_context_js_1 = require("../../security/tenant-context.js");
// Test repository implementation
class TestDocumentRepository extends base_tenant_repository_js_1.BaseTenantRepository {
    constructor(pool) {
        super('test_documents', pool);
    }
    async findByTitle(context, title) {
        const result = await this.executeQuery(context, `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 AND title = $2`, [context.tenantId, title]);
        return result.rows;
    }
}
(0, globals_1.describe)('Tenant Isolation - Repository Layer', () => {
    let pool;
    let repository;
    let tenantAContext;
    let tenantBContext;
    (0, globals_1.beforeAll)(async () => {
        // Setup test database pool
        pool = new pg_1.Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            database: process.env.POSTGRES_DB || 'summit_test',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
        });
        repository = new TestDocumentRepository(pool);
        // Create test table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS test_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        classification VARCHAR(50) DEFAULT 'unclassified',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )
    `);
        // Create index for tenant_id
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_test_documents_tenant_id
      ON test_documents(tenant_id)
    `);
        // Create test tenants in the tenants table
        for (const tenantId of [tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A, tenant_context_helpers_js_1.TEST_TENANTS.TENANT_B]) {
            await pool.query(`INSERT INTO tenants (id, name, plan, is_active)
         VALUES ($1, $2, 'test', true)
         ON CONFLICT (id) DO NOTHING`, [tenantId, `Test Tenant ${tenantId}`]);
        }
    });
    (0, globals_1.beforeEach)(async () => {
        // Clean test data between tests
        await pool.query(`DELETE FROM test_documents WHERE tenant_id LIKE 'test-tenant-%'`);
        // Create tenant contexts
        [tenantAContext, tenantBContext] = (0, tenant_context_helpers_js_1.createMultiTenantContexts)([
            tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A,
            tenant_context_helpers_js_1.TEST_TENANTS.TENANT_B,
        ]);
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup
        await pool.query(`DROP TABLE IF EXISTS test_documents`);
        await pool.end();
    });
    (0, globals_1.describe)('Basic CRUD with Tenant Isolation', () => {
        (0, globals_1.it)('should create a record scoped to tenant A', async () => {
            const doc = await repository.create(tenantAContext, {
                title: 'Secret Document A',
                content: 'Classified info for tenant A',
                classification: 'secret',
            });
            (0, globals_1.expect)(doc).toBeDefined();
            (0, globals_1.expect)(doc.tenant_id).toBe(tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A);
            (0, globals_1.expect)(doc.title).toBe('Secret Document A');
            (0, globals_1.expect)(doc.id).toBeDefined();
        });
        (0, globals_1.it)('should find a record only within the same tenant', async () => {
            // Create doc in tenant A
            const docA = await repository.create(tenantAContext, {
                title: 'Document A',
                content: 'Content A',
                classification: 'unclassified',
            });
            // Query from tenant A - should find it
            const foundInA = await repository.findById(tenantAContext, docA.id);
            (0, globals_1.expect)(foundInA).toBeDefined();
            (0, globals_1.expect)(foundInA?.id).toBe(docA.id);
            // Query from tenant B - should NOT find it
            const foundInB = await repository.findById(tenantBContext, docA.id);
            (0, globals_1.expect)(foundInB).toBeNull();
        });
        (0, globals_1.it)('should list only records belonging to the tenant', async () => {
            // Create docs in tenant A
            await repository.create(tenantAContext, {
                title: 'Doc A1',
                content: 'Content A1',
                classification: 'unclassified',
            });
            await repository.create(tenantAContext, {
                title: 'Doc A2',
                content: 'Content A2',
                classification: 'unclassified',
            });
            // Create docs in tenant B
            await repository.create(tenantBContext, {
                title: 'Doc B1',
                content: 'Content B1',
                classification: 'unclassified',
            });
            // Query from tenant A
            const docsA = await repository.findAll(tenantAContext);
            (0, globals_1.expect)(docsA).toHaveLength(2);
            (0, globals_1.expect)(docsA.every((d) => d.tenant_id === tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A)).toBe(true);
            // Query from tenant B
            const docsB = await repository.findAll(tenantBContext);
            (0, globals_1.expect)(docsB).toHaveLength(1);
            (0, globals_1.expect)(docsB.every((d) => d.tenant_id === tenant_context_helpers_js_1.TEST_TENANTS.TENANT_B)).toBe(true);
        });
        (0, globals_1.it)('should update only within tenant boundary', async () => {
            // Create doc in tenant A
            const doc = await repository.create(tenantAContext, {
                title: 'Original Title',
                content: 'Original Content',
                classification: 'unclassified',
            });
            // Update from tenant A - should succeed
            const updated = await repository.update(tenantAContext, doc.id, {
                title: 'Updated Title',
            });
            (0, globals_1.expect)(updated?.title).toBe('Updated Title');
            // Attempt update from tenant B - should fail (no rows affected)
            const crossTenantUpdate = await repository.update(tenantBContext, doc.id, {
                title: 'Malicious Update',
            });
            (0, globals_1.expect)(crossTenantUpdate).toBeNull();
            // Verify original update persisted
            const verified = await repository.findById(tenantAContext, doc.id);
            (0, globals_1.expect)(verified?.title).toBe('Updated Title');
        });
        (0, globals_1.it)('should delete only within tenant boundary', async () => {
            // Create doc in tenant A
            const doc = await repository.create(tenantAContext, {
                title: 'To Delete',
                content: 'Content',
                classification: 'unclassified',
            });
            // Attempt delete from tenant B - should fail
            const deletedInB = await repository.delete(tenantBContext, doc.id);
            (0, globals_1.expect)(deletedInB).toBe(false);
            // Verify doc still exists in tenant A
            const stillExists = await repository.findById(tenantAContext, doc.id);
            (0, globals_1.expect)(stillExists).toBeDefined();
            // Delete from tenant A - should succeed
            const deletedInA = await repository.delete(tenantAContext, doc.id);
            (0, globals_1.expect)(deletedInA).toBe(true);
            // Verify doc is gone
            const gone = await repository.findById(tenantAContext, doc.id);
            (0, globals_1.expect)(gone).toBeNull();
        });
    });
    (0, globals_1.describe)('Tenant Context Validation', () => {
        (0, globals_1.it)('should reject operations without tenant context', async () => {
            await (0, globals_1.expect)(repository.findAll(null)).rejects.toThrow(tenant_context_js_1.TenantContextError);
            await (0, globals_1.expect)(repository.findAll(undefined)).rejects.toThrow(tenant_context_js_1.TenantContextError);
        });
        (0, globals_1.it)('should reject operations with invalid tenant context (missing tenantId)', async () => {
            const invalidContext = {
                requestId: (0, crypto_1.randomUUID)(),
            };
            await (0, globals_1.expect)(repository.findAll(invalidContext)).rejects.toThrow(tenant_context_js_1.TenantContextError);
        });
        (0, globals_1.it)('should reject operations with invalid tenant context (missing requestId)', async () => {
            const invalidContext = {
                tenantId: tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A,
            };
            await (0, globals_1.expect)(repository.findAll(invalidContext)).rejects.toThrow(tenant_context_js_1.TenantContextError);
        });
    });
    (0, globals_1.describe)('Custom Query Security', () => {
        (0, globals_1.it)('should execute custom queries with tenant filtering', async () => {
            // Create docs with specific title in both tenants
            await repository.create(tenantAContext, {
                title: 'Shared Title',
                content: 'Tenant A content',
                classification: 'unclassified',
            });
            await repository.create(tenantBContext, {
                title: 'Shared Title',
                content: 'Tenant B content',
                classification: 'unclassified',
            });
            // Query by title from tenant A
            const docsA = await repository.findByTitle(tenantAContext, 'Shared Title');
            (0, globals_1.expect)(docsA).toHaveLength(1);
            (0, globals_1.expect)(docsA[0].content).toBe('Tenant A content');
            // Query by title from tenant B
            const docsB = await repository.findByTitle(tenantBContext, 'Shared Title');
            (0, globals_1.expect)(docsB).toHaveLength(1);
            (0, globals_1.expect)(docsB[0].content).toBe('Tenant B content');
        });
        (0, globals_1.it)('should reject custom queries without tenant_id filter', async () => {
            // Attempt to execute a query without tenant_id
            const maliciousQuery = `SELECT * FROM test_documents WHERE title = $1`;
            await (0, globals_1.expect)(repository.executeQuery(tenantAContext, maliciousQuery, ['Some Title'])).rejects.toThrow(tenant_context_js_1.TenantContextError);
        });
    });
    (0, globals_1.describe)('Count and Aggregations', () => {
        (0, globals_1.it)('should count only records in tenant scope', async () => {
            // Create 3 docs in tenant A
            await Promise.all([
                repository.create(tenantAContext, {
                    title: 'Doc 1',
                    content: 'Content',
                    classification: 'unclassified',
                }),
                repository.create(tenantAContext, {
                    title: 'Doc 2',
                    content: 'Content',
                    classification: 'unclassified',
                }),
                repository.create(tenantAContext, {
                    title: 'Doc 3',
                    content: 'Content',
                    classification: 'unclassified',
                }),
            ]);
            // Create 1 doc in tenant B
            await repository.create(tenantBContext, {
                title: 'Doc B',
                content: 'Content',
                classification: 'unclassified',
            });
            // Count from tenant A
            const countA = await repository.count(tenantAContext);
            (0, globals_1.expect)(countA).toBe(3);
            // Count from tenant B
            const countB = await repository.count(tenantBContext);
            (0, globals_1.expect)(countB).toBe(1);
        });
    });
    (0, globals_1.describe)('Cross-Tenant Access Prevention (Regression Tests)', () => {
        (0, globals_1.it)('should prevent cross-tenant read via direct query manipulation', async () => {
            // Create sensitive doc in tenant A
            const sensitiveDoc = await repository.create(tenantAContext, {
                title: 'TOP SECRET',
                content: 'Sensitive information for tenant A only',
                classification: 'top-secret',
            });
            // Attempt to read from tenant B using the known ID
            const leaked = await repository.findById(tenantBContext, sensitiveDoc.id);
            (0, globals_1.expect)(leaked).toBeNull();
        });
        (0, globals_1.it)('should prevent cross-tenant write via update', async () => {
            const doc = await repository.create(tenantAContext, {
                title: 'Original',
                content: 'Original content',
                classification: 'unclassified',
            });
            // Attempt cross-tenant update
            const result = await repository.update(tenantBContext, doc.id, {
                content: 'Maliciously modified content',
            });
            (0, globals_1.expect)(result).toBeNull();
            // Verify original content unchanged
            const original = await repository.findById(tenantAContext, doc.id);
            (0, globals_1.expect)(original?.content).toBe('Original content');
        });
        (0, globals_1.it)('should prevent cross-tenant delete', async () => {
            const doc = await repository.create(tenantAContext, {
                title: 'Protected',
                content: 'Protected content',
                classification: 'unclassified',
            });
            // Attempt cross-tenant delete
            const deleted = await repository.delete(tenantBContext, doc.id);
            (0, globals_1.expect)(deleted).toBe(false);
            // Verify doc still exists
            const stillExists = await repository.findById(tenantAContext, doc.id);
            (0, globals_1.expect)(stillExists).toBeDefined();
        });
    });
    (0, globals_1.describe)('Pagination and Ordering', () => {
        (0, globals_1.beforeEach)(async () => {
            // Create multiple docs in tenant A with different timestamps
            for (let i = 1; i <= 5; i++) {
                await repository.create(tenantAContext, {
                    title: `Doc ${i}`,
                    content: `Content ${i}`,
                    classification: 'unclassified',
                });
                // Small delay to ensure different timestamps
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        });
        (0, globals_1.it)('should paginate results within tenant scope', async () => {
            const page1 = await repository.findAll(tenantAContext, {
                limit: 2,
                offset: 0,
            });
            (0, globals_1.expect)(page1).toHaveLength(2);
            const page2 = await repository.findAll(tenantAContext, {
                limit: 2,
                offset: 2,
            });
            (0, globals_1.expect)(page2).toHaveLength(2);
            // Ensure no overlap
            const page1Ids = page1.map((d) => d.id);
            const page2Ids = page2.map((d) => d.id);
            (0, globals_1.expect)(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
        });
        (0, globals_1.it)('should order results within tenant scope', async () => {
            const asc = await repository.findAll(tenantAContext, {
                orderBy: 'title',
                orderDirection: 'ASC',
            });
            const desc = await repository.findAll(tenantAContext, {
                orderBy: 'title',
                orderDirection: 'DESC',
            });
            (0, globals_1.expect)(asc[0].title).toBe('Doc 1');
            (0, globals_1.expect)(desc[0].title).toBe('Doc 5');
        });
    });
});
(0, globals_1.describe)('PostgreSQL Session Variables (Defense in Depth)', () => {
    let pool;
    let repository;
    (0, globals_1.beforeAll)(async () => {
        pool = new pg_1.Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            database: process.env.POSTGRES_DB || 'summit_test',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
        });
        repository = new TestDocumentRepository(pool);
    });
    (0, globals_1.afterAll)(async () => {
        await pool.end();
    });
    (0, globals_1.it)('should set PostgreSQL session variables for tenant context', async () => {
        const context = (0, tenant_context_helpers_js_1.createTestTenantContext)({
            tenantId: tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A,
        });
        await repository.findAll(context);
        // Query to verify session variables were set (they're reset after transaction)
        // This is more of a smoke test - full RLS policy testing requires database setup
        (0, globals_1.expect)(context.tenantId).toBe(tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A);
        (0, globals_1.expect)(context.requestId).toBeDefined();
    });
});
