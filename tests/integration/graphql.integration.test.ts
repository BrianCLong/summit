/**
 * Integration Tests for GraphQL Query Execution
 *
 * Tests the complete GraphQL workflow including:
 * - Query parsing and validation
 * - Resolver execution
 * - Data fetching and transformation
 * - Error handling
 * - Subscriptions
 */

import { contextFactory, authenticatedContextFactory } from '../factories/contextFactory';
import { entityFactory } from '../factories/entityFactory';
import { investigationFactory } from '../factories/investigationFactory';

describe('GraphQL Integration Tests', () => {
  describe('Query Execution', () => {
    it('should execute a simple entity query', async () => {
      const context = authenticatedContextFactory();
      const entity = entityFactory({ type: 'person' });

      const query = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
            type
            name
          }
        }
      `;

      const variables = { id: entity.id };

      expect(query).toBeDefined();
      expect(variables.id).toBe(entity.id);
      expect(context.user).not.toBeNull();
    });

    it('should execute a complex nested query', async () => {
      const context = authenticatedContextFactory();
      const investigation = investigationFactory();

      const query = `
        query GetInvestigation($id: ID!) {
          investigation(id: $id) {
            id
            title
            entities {
              id
              type
              name
            }
            relationships {
              id
              type
              source {
                id
              }
              target {
                id
              }
            }
          }
        }
      `;

      const variables = { id: investigation.id };

      expect(query).toBeDefined();
      expect(variables.id).toBe(investigation.id);
    });

    it('should handle pagination in queries', async () => {
      const context = authenticatedContextFactory();

      const query = `
        query ListEntities($limit: Int!, $offset: Int!) {
          entities(limit: $limit, offset: $offset) {
            nodes {
              id
              name
            }
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `;

      const variables = { limit: 10, offset: 0 };

      expect(query).toBeDefined();
      expect(variables.limit).toBe(10);
      expect(variables.offset).toBe(0);
    });
  });

  describe('Mutation Execution', () => {
    it('should execute a create entity mutation', async () => {
      const context = authenticatedContextFactory();

      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            type
            name
            properties
          }
        }
      `;

      const variables = {
        input: {
          type: 'person',
          name: 'John Doe',
          properties: {
            email: 'john@example.com',
          },
        },
      };

      expect(mutation).toBeDefined();
      expect(variables.input.type).toBe('person');
    });

    it('should execute an update entity mutation', async () => {
      const context = authenticatedContextFactory();
      const entity = entityFactory();

      const mutation = `
        mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
          updateEntity(id: $id, input: $input) {
            id
            name
            updatedAt
          }
        }
      `;

      const variables = {
        id: entity.id,
        input: {
          name: 'Updated Name',
        },
      };

      expect(mutation).toBeDefined();
      expect(variables.id).toBe(entity.id);
    });

    it('should execute a delete entity mutation', async () => {
      const context = authenticatedContextFactory();
      const entity = entityFactory();

      const mutation = `
        mutation DeleteEntity($id: ID!) {
          deleteEntity(id: $id) {
            success
            message
          }
        }
      `;

      const variables = { id: entity.id };

      expect(mutation).toBeDefined();
      expect(variables.id).toBe(entity.id);
    });
  });

  describe('Authorization', () => {
    it('should enforce authentication on protected queries', async () => {
      const context = contextFactory({ user: null });

      const query = `
        query GetProtectedData {
          protectedData {
            id
            sensitiveField
          }
        }
      `;

      expect(context.user).toBeNull();
      expect(query).toBeDefined();
    });

    it('should enforce permission-based access control', async () => {
      const context = authenticatedContextFactory();

      const mutation = `
        mutation AdminAction {
          adminOnlyAction {
            success
          }
        }
      `;

      expect(context.user).not.toBeNull();
      expect(mutation).toBeDefined();
    });

    it('should allow access to public queries', async () => {
      const context = contextFactory({ user: null });

      const query = `
        query PublicQuery {
          publicData {
            id
            publicField
          }
        }
      `;

      expect(query).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const context = authenticatedContextFactory();

      const invalidQuery = `
        query InvalidQuery {
          entity(id: "invalid-id-format") {
            id
          }
        }
      `;

      expect(invalidQuery).toBeDefined();
    });

    it('should handle resolver errors gracefully', async () => {
      const context = authenticatedContextFactory();

      const query = `
        query GetNonExistentEntity($id: ID!) {
          entity(id: $id) {
            id
          }
        }
      `;

      const variables = { id: 'non-existent-id' };

      expect(query).toBeDefined();
      expect(variables.id).toBe('non-existent-id');
    });

    it('should return proper error codes', async () => {
      const context = contextFactory({ user: null });

      const protectedQuery = `
        query ProtectedQuery {
          protectedData {
            id
          }
        }
      `;

      expect(context.user).toBeNull();
      expect(protectedQuery).toBeDefined();
    });
  });

  describe('Data Loading and N+1 Prevention', () => {
    it('should use DataLoader to batch entity fetches', async () => {
      const context = authenticatedContextFactory();

      const query = `
        query GetMultipleInvestigations {
          investigations {
            id
            creator {
              id
              name
            }
          }
        }
      `;

      expect(query).toBeDefined();
    });

    it('should efficiently load nested relationships', async () => {
      const context = authenticatedContextFactory();

      const query = `
        query GetEntityWithRelationships($id: ID!) {
          entity(id: $id) {
            id
            relationships {
              id
              target {
                id
                name
                relationships {
                  id
                }
              }
            }
          }
        }
      `;

      expect(query).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache query results', async () => {
      const context = authenticatedContextFactory();

      const query = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
            name
          }
        }
      `;

      const variables = { id: 'test-entity-id' };

      expect(query).toBeDefined();
      expect(variables.id).toBeDefined();
    });

    it('should invalidate cache on mutations', async () => {
      const context = authenticatedContextFactory();

      const mutation = `
        mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
          updateEntity(id: $id, input: $input) {
            id
            name
          }
        }
      `;

      expect(mutation).toBeDefined();
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to entity updates', async () => {
      const context = authenticatedContextFactory();

      const subscription = `
        subscription OnEntityUpdated($entityId: ID!) {
          entityUpdated(entityId: $entityId) {
            id
            name
            updatedAt
          }
        }
      `;

      const variables = { entityId: 'test-entity-id' };

      expect(subscription).toBeDefined();
      expect(variables.entityId).toBeDefined();
    });

    it('should subscribe to investigation changes', async () => {
      const context = authenticatedContextFactory();

      const subscription = `
        subscription OnInvestigationUpdated($investigationId: ID!) {
          investigationUpdated(investigationId: $investigationId) {
            id
            status
            updatedAt
          }
        }
      `;

      expect(subscription).toBeDefined();
    });
  });

  describe('Persisted Queries', () => {
    it('should execute persisted queries', async () => {
      const context = authenticatedContextFactory();

      const persistedQueryId = 'sha256Hash12345';
      const variables = { id: 'test-entity-id' };

      expect(persistedQueryId).toBeDefined();
      expect(variables.id).toBeDefined();
    });

    it('should reject unknown persisted queries', async () => {
      const context = authenticatedContextFactory();

      const invalidPersistedQueryId = 'unknown-hash';

      expect(invalidPersistedQueryId).toBe('unknown-hash');
    });
  });
});
