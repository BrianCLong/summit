/**
 * Neo4j Tenant Isolation Integration Tests
 *
 * Validates that:
 * 1. TenantNeo4jSession enforces tenant context
 * 2. Queries without tenant_id are rejected
 * 3. Cross-tenant reads are prevented
 * 4. Tenant-scoped queries return only tenant data
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import neo4j, { Driver } from 'neo4j-driver';
import {
  TenantNeo4jSession,
  createTenantSession,
  executeTenantQuery,
  createTenantNode,
  findTenantNodes,
} from '../../neo4j/tenant-session-wrapper.js';
import {
  createTestTenantContext,
  createMultiTenantContexts,
  TEST_TENANTS,
} from '../helpers/tenant-context-helpers.js';
import {
  TenantContext,
  TenantContextError,
} from '../../security/tenant-context.js';

describe('Neo4j Tenant Isolation', () => {
  let driver: Driver;
  let tenantAContext: TenantContext;
  let tenantBContext: TenantContext;

  beforeAll(async () => {
    // Connect to Neo4j
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );

    // Create tenant contexts
    [tenantAContext, tenantBContext] = createMultiTenantContexts([
      TEST_TENANTS.TENANT_A,
      TEST_TENANTS.TENANT_B,
    ]);
  });

  afterAll(async () => {
    await driver.close();
  });

  beforeEach(async () => {
    // Clean test data before each test
    const cleanSession = driver.session();
    try {
      await cleanSession.run(`
        MATCH (n:TestEntity)
        WHERE n.tenant_id IN ['${TEST_TENANTS.TENANT_A}', '${TEST_TENANTS.TENANT_B}']
        DETACH DELETE n
      `);
    } finally {
      await cleanSession.close();
    }
  });

  describe('TenantNeo4jSession - Basic Operations', () => {
    it('should create a session with tenant context', () => {
      const session = createTenantSession(driver, tenantAContext);
      expect(session).toBeInstanceOf(TenantNeo4jSession);
      expect(session.getTenantContext().tenantId).toBe(TEST_TENANTS.TENANT_A);
    });

    it('should reject session creation without tenant context', () => {
      expect(() => {
        createTenantSession(driver, null as any);
      }).toThrow(TenantContextError);
    });

    it('should execute a simple query with tenant filtering', async () => {
      const session = createTenantSession(driver, tenantAContext);
      try {
        // Create a test node
        await session.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Test Node', createdAt: datetime()})
          RETURN n
        `);

        // Query the node
        const result = await session.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Test Node'
          RETURN n
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('n').properties.name).toBe('Test Node');
      } finally {
        await session.close();
      }
    });

    it('should reject queries without tenant_id filtering', async () => {
      const session = createTenantSession(driver, tenantAContext);
      try {
        await expect(
          session.run(`
            MATCH (n:TestEntity)
            RETURN n
          `)
        ).rejects.toThrow(TenantContextError);
      } finally {
        await session.close();
      }
    });

    it('should allow system queries without tenant filtering', async () => {
      const session = createTenantSession(driver, tenantAContext);
      try {
        // System queries like schema operations are allowed
        await expect(
          session.run('CALL db.labels()')
        ).resolves.not.toThrow();
      } finally {
        await session.close();
      }
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent reading data from other tenants', async () => {
      // Create data in tenant A
      const sessionA = createTenantSession(driver, tenantAContext);
      try {
        await sessionA.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Tenant A Secret', value: 'confidential'})
          RETURN n
        `);
      } finally {
        await sessionA.close();
      }

      // Attempt to read from tenant B
      const sessionB = createTenantSession(driver, tenantBContext);
      try {
        const result = await sessionB.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Tenant A Secret'
          RETURN n
        `);

        // Should not find any results
        expect(result.records).toHaveLength(0);
      } finally {
        await sessionB.close();
      }
    });

    it('should allow reading own tenant data', async () => {
      // Create data in tenant A
      const sessionA1 = createTenantSession(driver, tenantAContext);
      try {
        await sessionA1.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Tenant A Data', value: 'public'})
          RETURN n
        `);
      } finally {
        await sessionA1.close();
      }

      // Read from same tenant (different session)
      const sessionA2 = createTenantSession(driver, tenantAContext);
      try {
        const result = await sessionA2.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Tenant A Data'
          RETURN n
        `);

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('n').properties.name).toBe('Tenant A Data');
      } finally {
        await sessionA2.close();
      }
    });

    it('should prevent cross-tenant updates', async () => {
      // Create data in tenant A
      const sessionA = createTenantSession(driver, tenantAContext);
      let nodeId: string;
      try {
        const createResult = await sessionA.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Original', value: 'v1'})
          RETURN elementId(n) as id
        `);
        nodeId = createResult.records[0].get('id');
      } finally {
        await sessionA.close();
      }

      // Attempt to update from tenant B (should not find node)
      const sessionB = createTenantSession(driver, tenantBContext);
      try {
        const result = await sessionB.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          SET n.value = 'hacked'
          RETURN n
        `, { nodeId });

        // Should not update any nodes
        expect(result.records).toHaveLength(0);
      } finally {
        await sessionB.close();
      }

      // Verify original value unchanged
      const sessionA2 = createTenantSession(driver, tenantAContext);
      try {
        const result = await sessionA2.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          RETURN n
        `, { nodeId });

        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('n').properties.value).toBe('v1');
      } finally {
        await sessionA2.close();
      }
    });

    it('should prevent cross-tenant deletes', async () => {
      // Create data in tenant A
      const sessionA = createTenantSession(driver, tenantAContext);
      let nodeId: string;
      try {
        const createResult = await sessionA.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Protected', value: 'important'})
          RETURN elementId(n) as id
        `);
        nodeId = createResult.records[0].get('id');
      } finally {
        await sessionA.close();
      }

      // Attempt to delete from tenant B
      const sessionB = createTenantSession(driver, tenantBContext);
      try {
        const result = await sessionB.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          DETACH DELETE n
        `, { nodeId });

        // Should not delete any nodes
        // Neo4j doesn't return anything for DELETE, so check via query
      } finally {
        await sessionB.close();
      }

      // Verify node still exists in tenant A
      const sessionA2 = createTenantSession(driver, tenantAContext);
      try {
        const result = await sessionA2.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          RETURN n
        `, { nodeId });

        expect(result.records).toHaveLength(1);
      } finally {
        await sessionA2.close();
      }
    });
  });

  describe('Helper Functions', () => {
    it('should execute single query with auto session management', async () => {
      const result = await executeTenantQuery(
        driver,
        tenantAContext,
        `CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Auto Session'})
         RETURN n`
      );

      expect(result.records).toHaveLength(1);
      expect(result.tenantId).toBe(TEST_TENANTS.TENANT_A);
    });

    it('should create node with tenant_id auto-injected', async () => {
      const result = await createTenantNode(
        driver,
        tenantAContext,
        'TestEntity',
        { name: 'Auto Tenant Node', category: 'test' }
      );

      expect(result.records).toHaveLength(1);

      // Verify tenant_id was added
      const verifySession = createTenantSession(driver, tenantAContext);
      try {
        const queryResult = await verifySession.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.properties.name = 'Auto Tenant Node'
          RETURN n
        `);
        expect(queryResult.records).toHaveLength(1);
      } finally {
        await verifySession.close();
      }
    });

    it('should find nodes scoped to tenant', async () => {
      // Create multiple nodes
      await executeTenantQuery(
        driver,
        tenantAContext,
        `CREATE (n1:TestEntity {tenant_id: $tenantId, category: 'books', title: 'Book 1'})
         CREATE (n2:TestEntity {tenant_id: $tenantId, category: 'books', title: 'Book 2'})
         CREATE (n3:TestEntity {tenant_id: $tenantId, category: 'movies', title: 'Movie 1'})`
      );

      // Find by category
      const result = await findTenantNodes(
        driver,
        tenantAContext,
        'TestEntity',
        { category: 'books' }
      );

      expect(result.records).toHaveLength(2);
    });
  });

  describe('Transaction Support', () => {
    it('should support read transactions with tenant context', async () => {
      // Create test data
      const session = createTenantSession(driver, tenantAContext);
      await session.run(`
        CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Transaction Test'})
      `);

      // Execute read transaction
      const result = await session.executeRead(async (tx) => {
        const queryResult = await tx.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Transaction Test'
          RETURN n
        `);
        return queryResult.records.length;
      });

      expect(result).toBe(1);
      await session.close();
    });

    it('should support write transactions with tenant context', async () => {
      const session = createTenantSession(driver, tenantAContext);

      const result = await session.executeWrite(async (tx) => {
        await tx.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Write Transaction'})
        `);

        const queryResult = await tx.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Write Transaction'
          RETURN n
        `);
        return queryResult.records.length;
      });

      expect(result).toBe(1);
      await session.close();
    });

    it('should reject transactions without tenant filtering', async () => {
      const session = createTenantSession(driver, tenantAContext);

      await expect(
        session.executeRead(async (tx) => {
          // Missing tenant_id filter
          return tx.run('MATCH (n:TestEntity) RETURN n');
        })
      ).rejects.toThrow(TenantContextError);

      await session.close();
    });
  });

  describe('Session Statistics', () => {
    it('should track queries executed', async () => {
      const session = createTenantSession(driver, tenantAContext);

      await session.run('CREATE (n:TestEntity {tenant_id: $tenantId, name: "Q1"})');
      await session.run('CREATE (n:TestEntity {tenant_id: $tenantId, name: "Q2"})');
      await session.run('MATCH (n:TestEntity {tenant_id: $tenantId}) RETURN n');

      const stats = session.getStats();
      expect(stats.queriesExecuted).toBe(3);
      expect(stats.tenantId).toBe(TEST_TENANTS.TENANT_A);

      await session.close();
    });
  });

  describe('Query Validation Edge Cases', () => {
    it('should accept queries with tenant_id in different formats', async () => {
      const session = createTenantSession(driver, tenantAContext);

      // Format 1: {tenant_id: $tenantId}
      await expect(
        session.run('MATCH (n:TestEntity {tenant_id: $tenantId}) RETURN n')
      ).resolves.not.toThrow();

      // Format 2: tenant_id: $tenantId
      await expect(
        session.run('MATCH (n:TestEntity) WHERE n.tenant_id = $tenantId RETURN n')
      ).resolves.not.toThrow();

      await session.close();
    });

    it('should reject queries with typos in tenant_id', async () => {
      const session = createTenantSession(driver, tenantAContext);

      await expect(
        session.run('MATCH (n:TestEntity {tenat_id: $tenantId}) RETURN n')
      ).rejects.toThrow(TenantContextError);

      await session.close();
    });
  });
});
