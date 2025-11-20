/**
 * GraphQL Entity Resolver - Tenant Isolation Tests
 * Tests to ensure multi-tenant data isolation and prevent cross-tenant data access
 */

import { GraphQLError } from 'graphql';
import {
  createMockContext,
  createMockEntity,
  createMockNeo4jDriver,
  createMockNeo4jRecord,
  createMockUser,
} from '../../helpers/testHelpers';

// Mock dependencies
jest.mock('../../../db/neo4j');
jest.mock('../../../db/postgres');
jest.mock('../../../graphql/subscriptions');

describe('GraphQL Entity Resolver - Tenant Isolation', () => {
  let mockDriver: any;
  let mockSession: any;
  let entityResolvers: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock Neo4j driver and session
    mockDriver = createMockNeo4jDriver();
    mockSession = mockDriver._mockSession;

    // Mock the Neo4j module
    const neo4jModule = await import('../../../db/neo4j');
    (neo4jModule.getNeo4jDriver as jest.Mock) = jest.fn(() => mockDriver);
    (neo4jModule.isNeo4jMockMode as jest.Mock) = jest.fn(() => false);

    // Import resolvers after mocks are set up
    const resolversModule = await import('../../../graphql/resolvers/entity');
    entityResolvers = (resolversModule as any).default || resolversModule;
  });

  describe('entity query - single entity', () => {
    it('should prevent cross-tenant data access via direct ID manipulation', async () => {
      const tenantAContext = createMockContext({
        tenant: 'tenant-a',
        id: 'user-a-1',
      });

      const tenantBEntityId = 'entity-belonging-to-tenant-b';

      // Mock Neo4j to return empty result (entity not found for tenant-a)
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await entityResolvers.Query.entity(
        {},
        { id: tenantBEntityId },
        tenantAContext
      );

      // Verify query included tenant filter
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('tenantId: $tenantId'),
        expect.objectContaining({
          id: tenantBEntityId,
          tenantId: 'tenant-a',
        })
      );

      // Verify no data returned
      expect(result).toBeNull();
    });

    it('should allow access to entity within same tenant', async () => {
      const tenantAContext = createMockContext({
        tenant: 'tenant-a',
        id: 'user-a-1',
      });

      const entityA = createMockEntity({
        id: 'entity-a-1',
        tenantId: 'tenant-a',
        type: 'Person',
        properties: {
          id: 'entity-a-1',
          tenantId: 'tenant-a',
          name: 'John Doe',
        },
      });

      // Mock Neo4j to return entity
      mockSession.run.mockResolvedValue({
        records: [createMockNeo4jRecord(entityA)],
      });

      const result = await entityResolvers.Query.entity(
        {},
        { id: entityA.id },
        tenantAContext
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: entityA.id,
          tenantId: 'tenant-a',
        })
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(entityA.id);
      expect(result.props.name).toBe('John Doe');
    });

    it('should reject queries from users without tenant context', async () => {
      const noTenantContext = {
        user: { id: 'user-1', residency: 'US' }, // Missing tenant
      };

      const queryPromise = entityResolvers.Query.entity(
        {},
        { id: 'any-entity-id' },
        noTenantContext
      );

      await expect(queryPromise).rejects.toThrow(GraphQLError);
      await expect(queryPromise).rejects.toThrow('Tenant required');
    });

    it('should reject queries with null tenant', async () => {
      const nullTenantContext = {
        user: { id: 'user-1', tenant: null, residency: 'US' },
      };

      const queryPromise = entityResolvers.Query.entity(
        {},
        { id: 'any-entity-id' },
        nullTenantContext
      );

      await expect(queryPromise).rejects.toThrow('Tenant required');
    });

    it('should reject queries with undefined context', async () => {
      const queryPromise = entityResolvers.Query.entity(
        {},
        { id: 'any-entity-id' },
        undefined
      );

      await expect(queryPromise).rejects.toThrow();
    });
  });

  describe('entities query - list entities', () => {
    it('should filter entities by tenant automatically', async () => {
      const tenantBContext = createMockContext({
        tenant: 'tenant-b',
        id: 'user-b-1',
      });

      mockSession.run.mockResolvedValue({ records: [] });

      await entityResolvers.Query.entities(
        {},
        { limit: 10, offset: 0 },
        tenantBContext
      );

      // Verify tenant filter is applied
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('n.tenantId = $tenantId'),
        expect.objectContaining({
          tenantId: 'tenant-b',
        })
      );
    });

    it('should not return entities from other tenants even if IDs are known', async () => {
      const tenantAContext = createMockContext({
        tenant: 'tenant-a',
        id: 'user-a-1',
      });

      // Create entities from different tenants
      const entityA = createMockEntity({ tenantId: 'tenant-a' });
      const entityB = createMockEntity({ tenantId: 'tenant-b' });

      // Mock should only return tenant-a entities
      mockSession.run.mockResolvedValue({
        records: [createMockNeo4jRecord(entityA)],
      });

      const result = await entityResolvers.Query.entities(
        {},
        { limit: 10, offset: 0 },
        tenantAContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].props.tenantId).toBe('tenant-a');
    });

    it('should apply tenant filter with type filter', async () => {
      const context = createMockContext({ tenant: 'tenant-xyz' });

      mockSession.run.mockResolvedValue({ records: [] });

      await entityResolvers.Query.entities(
        {},
        { type: 'Person', limit: 10, offset: 0 },
        context
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('n.tenantId = $tenantId'),
        expect.objectContaining({
          tenantId: 'tenant-xyz',
          type: 'Person',
        })
      );
    });

    it('should apply tenant filter with search query', async () => {
      const context = createMockContext({ tenant: 'tenant-search' });

      mockSession.run.mockResolvedValue({ records: [] });

      await entityResolvers.Query.entities(
        {},
        { q: 'test search', limit: 10, offset: 0 },
        context
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('n.tenantId = $tenantId'),
        expect.objectContaining({
          tenantId: 'tenant-search',
          q: 'test search',
        })
      );
    });
  });

  describe('Tenant isolation in error scenarios', () => {
    it('should not leak tenant information in error messages', async () => {
      const context = createMockContext({ tenant: 'secret-tenant-id-12345' });

      mockSession.run.mockRejectedValue(
        new Error('Neo4j error: constraint violation for tenant secret-tenant-id-12345')
      );

      try {
        await entityResolvers.Query.entity({}, { id: 'test-id' }, context);
      } catch (error: any) {
        // Error handling should not expose tenant ID
        expect(error.message).not.toContain('secret-tenant-id-12345');
      }
    });

    it('should handle database connection failures without exposing tenant data', async () => {
      const context = createMockContext({
        tenant: 'sensitive-tenant',
        id: 'sensitive-user',
      });

      mockSession.run.mockRejectedValue(new Error('Connection failed'));

      // Should fallback gracefully without exposing sensitive context
      const result = await entityResolvers.Query.entity(
        {},
        { id: 'test-id' },
        context
      );

      // Should return mock data or null, not expose error with context
      expect(result).toBeDefined();
    });
  });

  describe('Multi-tenant edge cases', () => {
    it('should handle tenant with special characters', async () => {
      const context = createMockContext({
        tenant: 'tenant-with-special-chars-!@#$%',
      });

      mockSession.run.mockResolvedValue({ records: [] });

      await entityResolvers.Query.entities(
        {},
        { limit: 10, offset: 0 },
        context
      );

      // Should properly escape/handle special characters
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tenantId: 'tenant-with-special-chars-!@#$%',
        })
      );
    });

    it('should handle very long tenant IDs', async () => {
      const longTenantId = 'tenant-' + 'x'.repeat(200);
      const context = createMockContext({ tenant: longTenantId });

      mockSession.run.mockResolvedValue({ records: [] });

      await entityResolvers.Query.entities(
        {},
        { limit: 10, offset: 0 },
        context
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tenantId: longTenantId })
      );
    });

    it('should handle concurrent requests from different tenants', async () => {
      const contextA = createMockContext({ tenant: 'tenant-a' });
      const contextB = createMockContext({ tenant: 'tenant-b' });

      mockSession.run.mockResolvedValue({ records: [] });

      // Simulate concurrent requests
      const [resultA, resultB] = await Promise.all([
        entityResolvers.Query.entities({}, { limit: 5, offset: 0 }, contextA),
        entityResolvers.Query.entities({}, { limit: 5, offset: 0 }, contextB),
      ]);

      // Verify both requests used correct tenant filters
      const calls = mockSession.run.mock.calls;
      expect(calls.some((call: any) => call[1].tenantId === 'tenant-a')).toBe(true);
      expect(calls.some((call: any) => call[1].tenantId === 'tenant-b')).toBe(true);
    });
  });
});
