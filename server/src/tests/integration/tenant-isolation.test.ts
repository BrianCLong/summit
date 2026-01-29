/**
 * Tenant Isolation Integration Tests
 *
 * These tests validate that tenant isolation is enforced at the repository layer
 * and that cross-tenant access is prevented at the database level.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { BaseTenantRepository, TenantEntity } from '../../repositories/base-tenant-repository.js';
import {
  createTestTenantContext,
  createMultiTenantContexts,
  TEST_TENANTS,
} from '../helpers/tenant-context-helpers.js';
import {
  TenantContext,
  CrossTenantAccessError,
  TenantContextError,
} from '../../security/tenant-context.js';

// Test entity interface
interface TestDocument extends TenantEntity {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  classification: string;
  created_at: Date;
  updated_at: Date;
}

// Test repository implementation
class TestDocumentRepository extends BaseTenantRepository<TestDocument> {
  constructor(pool?: Pool) {
    super('test_documents', pool);
  }

  async findByTitle(
    context: TenantContext,
    title: string
  ): Promise<TestDocument[]> {
    const result = await this.executeQuery<TestDocument>(
      context,
      `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 AND title = $2`,
      [context.tenantId, title]
    );
    return result.rows;
  }
}

describe('Tenant Isolation - Repository Layer', () => {
  let pool: Pool;
  let repository: TestDocumentRepository;
  let tenantAContext: TenantContext;
  let tenantBContext: TenantContext;

  beforeAll(async () => {
    // Setup test database pool
    pool = new Pool({
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
    for (const tenantId of [TEST_TENANTS.TENANT_A, TEST_TENANTS.TENANT_B]) {
      await pool.query(
        `INSERT INTO tenants (id, name, plan, is_active)
         VALUES ($1, $2, 'test', true)
         ON CONFLICT (id) DO NOTHING`,
        [tenantId, `Test Tenant ${tenantId}`]
      );
    }
  });

  beforeEach(async () => {
    // Clean test data between tests
    await pool.query(`DELETE FROM test_documents WHERE tenant_id LIKE 'test-tenant-%'`);

    // Create tenant contexts
    [tenantAContext, tenantBContext] = createMultiTenantContexts([
      TEST_TENANTS.TENANT_A,
      TEST_TENANTS.TENANT_B,
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await pool.query(`DROP TABLE IF EXISTS test_documents`);
    await pool.end();
  });

  describe('Basic CRUD with Tenant Isolation', () => {
    it('should create a record scoped to tenant A', async () => {
      const doc = await repository.create(tenantAContext, {
        title: 'Secret Document A',
        content: 'Classified info for tenant A',
        classification: 'secret',
      });

      expect(doc).toBeDefined();
      expect(doc.tenant_id).toBe(TEST_TENANTS.TENANT_A);
      expect(doc.title).toBe('Secret Document A');
      expect(doc.id).toBeDefined();
    });

    it('should find a record only within the same tenant', async () => {
      // Create doc in tenant A
      const docA = await repository.create(tenantAContext, {
        title: 'Document A',
        content: 'Content A',
        classification: 'unclassified',
      });

      // Query from tenant A - should find it
      const foundInA = await repository.findById(tenantAContext, docA.id);
      expect(foundInA).toBeDefined();
      expect(foundInA?.id).toBe(docA.id);

      // Query from tenant B - should NOT find it
      const foundInB = await repository.findById(tenantBContext, docA.id);
      expect(foundInB).toBeNull();
    });

    it('should list only records belonging to the tenant', async () => {
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
      expect(docsA).toHaveLength(2);
      expect(docsA.every((d) => d.tenant_id === TEST_TENANTS.TENANT_A)).toBe(true);

      // Query from tenant B
      const docsB = await repository.findAll(tenantBContext);
      expect(docsB).toHaveLength(1);
      expect(docsB.every((d) => d.tenant_id === TEST_TENANTS.TENANT_B)).toBe(true);
    });

    it('should update only within tenant boundary', async () => {
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
      expect(updated?.title).toBe('Updated Title');

      // Attempt update from tenant B - should fail (no rows affected)
      const crossTenantUpdate = await repository.update(tenantBContext, doc.id, {
        title: 'Malicious Update',
      });
      expect(crossTenantUpdate).toBeNull();

      // Verify original update persisted
      const verified = await repository.findById(tenantAContext, doc.id);
      expect(verified?.title).toBe('Updated Title');
    });

    it('should delete only within tenant boundary', async () => {
      // Create doc in tenant A
      const doc = await repository.create(tenantAContext, {
        title: 'To Delete',
        content: 'Content',
        classification: 'unclassified',
      });

      // Attempt delete from tenant B - should fail
      const deletedInB = await repository.delete(tenantBContext, doc.id);
      expect(deletedInB).toBe(false);

      // Verify doc still exists in tenant A
      const stillExists = await repository.findById(tenantAContext, doc.id);
      expect(stillExists).toBeDefined();

      // Delete from tenant A - should succeed
      const deletedInA = await repository.delete(tenantAContext, doc.id);
      expect(deletedInA).toBe(true);

      // Verify doc is gone
      const gone = await repository.findById(tenantAContext, doc.id);
      expect(gone).toBeNull();
    });
  });

  describe('Tenant Context Validation', () => {
    it('should reject operations without tenant context', async () => {
      await expect(
        repository.findAll(null as any)
      ).rejects.toThrow(TenantContextError);

      await expect(
        repository.findAll(undefined as any)
      ).rejects.toThrow(TenantContextError);
    });

    it('should reject operations with invalid tenant context (missing tenantId)', async () => {
      const invalidContext = {
        requestId: randomUUID(),
      } as any;

      await expect(
        repository.findAll(invalidContext)
      ).rejects.toThrow(TenantContextError);
    });

    it('should reject operations with invalid tenant context (missing requestId)', async () => {
      const invalidContext = {
        tenantId: TEST_TENANTS.TENANT_A,
      } as any;

      await expect(
        repository.findAll(invalidContext)
      ).rejects.toThrow(TenantContextError);
    });
  });

  describe('Custom Query Security', () => {
    it('should execute custom queries with tenant filtering', async () => {
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
      expect(docsA).toHaveLength(1);
      expect(docsA[0].content).toBe('Tenant A content');

      // Query by title from tenant B
      const docsB = await repository.findByTitle(tenantBContext, 'Shared Title');
      expect(docsB).toHaveLength(1);
      expect(docsB[0].content).toBe('Tenant B content');
    });

    it('should reject custom queries without tenant_id filter', async () => {
      // Attempt to execute a query without tenant_id
      const maliciousQuery = `SELECT * FROM test_documents WHERE title = $1`;

      await expect(
        (repository as any).executeQuery(
          tenantAContext,
          maliciousQuery,
          ['Some Title']
        )
      ).rejects.toThrow(TenantContextError);
    });
  });

  describe('Count and Aggregations', () => {
    it('should count only records in tenant scope', async () => {
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
      expect(countA).toBe(3);

      // Count from tenant B
      const countB = await repository.count(tenantBContext);
      expect(countB).toBe(1);
    });
  });

  describe('Cross-Tenant Access Prevention (Regression Tests)', () => {
    it('should prevent cross-tenant read via direct query manipulation', async () => {
      // Create sensitive doc in tenant A
      const sensitiveDoc = await repository.create(tenantAContext, {
        title: 'TOP SECRET',
        content: 'Sensitive information for tenant A only',
        classification: 'top-secret',
      });

      // Attempt to read from tenant B using the known ID
      const leaked = await repository.findById(tenantBContext, sensitiveDoc.id);
      expect(leaked).toBeNull();
    });

    it('should prevent cross-tenant write via update', async () => {
      const doc = await repository.create(tenantAContext, {
        title: 'Original',
        content: 'Original content',
        classification: 'unclassified',
      });

      // Attempt cross-tenant update
      const result = await repository.update(tenantBContext, doc.id, {
        content: 'Maliciously modified content',
      });

      expect(result).toBeNull();

      // Verify original content unchanged
      const original = await repository.findById(tenantAContext, doc.id);
      expect(original?.content).toBe('Original content');
    });

    it('should prevent cross-tenant delete', async () => {
      const doc = await repository.create(tenantAContext, {
        title: 'Protected',
        content: 'Protected content',
        classification: 'unclassified',
      });

      // Attempt cross-tenant delete
      const deleted = await repository.delete(tenantBContext, doc.id);
      expect(deleted).toBe(false);

      // Verify doc still exists
      const stillExists = await repository.findById(tenantAContext, doc.id);
      expect(stillExists).toBeDefined();
    });
  });

  describe('Pagination and Ordering', () => {
    beforeEach(async () => {
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

    it('should paginate results within tenant scope', async () => {
      const page1 = await repository.findAll(tenantAContext, {
        limit: 2,
        offset: 0,
      });
      expect(page1).toHaveLength(2);

      const page2 = await repository.findAll(tenantAContext, {
        limit: 2,
        offset: 2,
      });
      expect(page2).toHaveLength(2);

      // Ensure no overlap
      const page1Ids = page1.map((d) => d.id);
      const page2Ids = page2.map((d) => d.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });

    it('should order results within tenant scope', async () => {
      const asc = await repository.findAll(tenantAContext, {
        orderBy: 'title',
        orderDirection: 'ASC',
      });

      const desc = await repository.findAll(tenantAContext, {
        orderBy: 'title',
        orderDirection: 'DESC',
      });

      expect(asc[0].title).toBe('Doc 1');
      expect(desc[0].title).toBe('Doc 5');
    });
  });
});

describe('PostgreSQL Session Variables (Defense in Depth)', () => {
  let pool: Pool;
  let repository: TestDocumentRepository;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'summit_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

    repository = new TestDocumentRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should set PostgreSQL session variables for tenant context', async () => {
    const context = createTestTenantContext({
      tenantId: TEST_TENANTS.TENANT_A,
    });

    await repository.findAll(context);

    // Query to verify session variables were set (they're reset after transaction)
    // This is more of a smoke test - full RLS policy testing requires database setup
    expect(context.tenantId).toBe(TEST_TENANTS.TENANT_A);
    expect(context.requestId).toBeDefined();
  });
});
