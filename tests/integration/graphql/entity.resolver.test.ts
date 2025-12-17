import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { makeExecutableSchema } from '@graphql-tools/schema';

// 1. Mock server dependencies BEFORE imports
const mockRun = jest.fn();
const mockSession = {
  run: mockRun,
  close: jest.fn(),
};
const mockDriver = {
  session: () => mockSession,
};

jest.mock('../../../server/src/db/neo4j', () => ({
  getNeo4jDriver: () => mockDriver,
  isNeo4jMockMode: () => false,
}));

jest.mock('../../../server/src/db/postgres', () => ({
  getPostgresPool: () => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  }),
}));

jest.mock('../../../server/src/graphql/subscriptions', () => ({
  pubsub: { publish: jest.fn() },
  ENTITY_CREATED: 'ENTITY_CREATED',
  ENTITY_UPDATED: 'ENTITY_UPDATED',
  ENTITY_DELETED: 'ENTITY_DELETED',
  tenantEvent: (e: any) => e,
}));

jest.mock('axios');

// 2. Import Schema and Resolvers
import { typeDefs } from '../../../server/src/graphql/schema';
// @ts-ignore
import entityResolvers from '../../../server/src/graphql/resolvers/entity';

import {
  enhancedEntityFactory,
  createAnalystContext,
} from '../../factories/enhanced';
import {
  ResolverTester,
  resolverAssertions,
  TestQueries,
  TestMutations,
} from './ResolverTestUtils';

describe('Entity Resolver Tests', () => {
  let tester: ResolverTester;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create executable schema
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: entityResolvers.Query,
        Mutation: entityResolvers.Mutation,
      },
    });

    const context = createAnalystContext();
    // Fix context for requireTenant which expects user.tenant
    if (context.user) {
        Object.assign(context.user, { tenant: context.tenant?.id || 'default-tenant' });
    }

    tester = new ResolverTester({
      schema,
      context,
    });
  });

  describe('Query: entity', () => {
    it('should return entity by ID for authenticated user', async () => {
      // Arrange
      const entityId = 'test-entity-123';
      const mockEntity = enhancedEntityFactory.buildWithTrait('person', {
        id: entityId,
      });

      // Resolver uses context.loaders.entityLoader
      const mockEntityLoader = {
          load: jest.fn().mockResolvedValue(mockEntity),
          loadMany: jest.fn(),
          clear: jest.fn(),
          clearAll: jest.fn()
      };

      const mockedTester = tester.withContext({
          loaders: {
              ...tester['baseContext'].loaders,
              entityLoader: mockEntityLoader
          } as any
      });

      // Act
      const result = await mockedTester.query(TestQueries.getEntity, {
        variables: { id: entityId },
      });

      // Assert
      resolverAssertions.noErrors(result);
      resolverAssertions.hasData(result);
      expect(result.data?.entity?.id).toBe(entityId);
    });

    it('should return null for non-existent entity', async () => {
       const mockEntityLoader = {
          load: jest.fn().mockResolvedValue(null),
          loadMany: jest.fn(),
          clear: jest.fn(),
          clearAll: jest.fn()
      };

      const mockedTester = tester.withContext({
          loaders: {
              ...tester['baseContext'].loaders,
              entityLoader: mockEntityLoader
          } as any
      });

      // Act
      const result = await mockedTester.query(TestQueries.getEntity, {
        variables: { id: 'non-existent-id' },
      });

      // Assert
      resolverAssertions.noErrors(result);
      expect(result.data?.entity).toBeNull();
    });
  });

  describe('Query: entities (list)', () => {
    it('should return paginated entities', async () => {
      // Arrange
      const entities = enhancedEntityFactory.buildList(5);
      mockRun.mockResolvedValueOnce({
          records: entities.map(e => ({
              get: (key: string) => {
                  if (key === 'n') return {
                      properties: e,
                      labels: [e.type || 'Entity']
                  };
              }
          }))
      });

      // Act
      // Using updated TestQueries.listEntities (expects type, q, limit, offset)
      const result = await tester.query(TestQueries.listEntities, {
        variables: { limit: 10, offset: 0 },
      });

      // Assert
      resolverAssertions.noErrors(result);
      resolverAssertions.hasData(result);
      expect(result.data?.entities).toHaveLength(5);
    });
  });

  describe('Mutation: createEntity', () => {
    it('should create entity with valid input', async () => {
      // Arrange
      const newEntityId = 'new-entity-123';
      const input = {
          name: 'New Entity',
          type: 'person',
          investigationId: 'inv-123',
      };

      mockRun.mockResolvedValueOnce({
          records: [{
              get: (key: string) => ({
                  properties: { ...input, id: newEntityId, createdAt: new Date(), updatedAt: new Date(), tenantId: 'tenant-1' },
                  labels: [input.type]
              })
          }]
      });

      // Act
      const result = await tester.mutate(TestMutations.createEntity, {
        variables: {
          input: {
            type: 'person',
            props: { name: 'New Entity', investigationId: 'inv-123' }
          },
        },
      });

      // Assert
      resolverAssertions.noErrors(result);
      expect(result.data?.createEntity?.id).toBe(newEntityId);
    });
  });

  describe('Mutation: deleteEntity', () => {
      it('should delete entity', async () => {
          mockRun.mockResolvedValueOnce({
              records: [{ get: () => ({ properties: { id: 'del-1' } }) }]
          });

          const result = await tester.mutate(TestMutations.deleteEntity, {
              variables: { id: 'del-1' }
          });

          resolverAssertions.noErrors(result);
          expect(result.data?.deleteEntity).toBe(true);
      });
  });
});
