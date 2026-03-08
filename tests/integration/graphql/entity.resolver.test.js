"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const schema_1 = require("@graphql-tools/schema");
// 1. Mock server dependencies BEFORE imports
const mockRun = globals_1.jest.fn();
const mockSession = {
    run: mockRun,
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: () => mockSession,
};
globals_1.jest.mock('../../../server/src/db/neo4j', () => ({
    getNeo4jDriver: () => mockDriver,
    isNeo4jMockMode: () => false,
}));
globals_1.jest.mock('../../../server/src/db/postgres', () => ({
    getPostgresPool: () => ({
        connect: globals_1.jest.fn().mockResolvedValue({
            query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
            release: globals_1.jest.fn(),
        }),
    }),
}));
globals_1.jest.mock('../../../server/src/graphql/subscriptions', () => ({
    pubsub: { publish: globals_1.jest.fn() },
    ENTITY_CREATED: 'ENTITY_CREATED',
    ENTITY_UPDATED: 'ENTITY_UPDATED',
    ENTITY_DELETED: 'ENTITY_DELETED',
    tenantEvent: (e) => e,
}));
globals_1.jest.mock('axios');
// 2. Import Schema and Resolvers
const schema_2 = require("../../../server/src/graphql/schema");
// @ts-ignore
const entity_1 = __importDefault(require("../../../server/src/graphql/resolvers/entity"));
const enhanced_1 = require("../../factories/enhanced");
const ResolverTestUtils_1 = require("./ResolverTestUtils");
(0, globals_1.describe)('Entity Resolver Tests', () => {
    let tester;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Create executable schema
        const schema = (0, schema_1.makeExecutableSchema)({
            typeDefs: schema_2.typeDefs,
            resolvers: {
                Query: entity_1.default.Query,
                Mutation: entity_1.default.Mutation,
            },
        });
        const context = (0, enhanced_1.createAnalystContext)();
        // Fix context for requireTenant which expects user.tenant
        if (context.user) {
            Object.assign(context.user, { tenant: context.tenant?.id || 'default-tenant' });
        }
        tester = new ResolverTestUtils_1.ResolverTester({
            schema,
            context,
        });
    });
    (0, globals_1.describe)('Query: entity', () => {
        (0, globals_1.it)('should return entity by ID for authenticated user', async () => {
            // Arrange
            const entityId = 'test-entity-123';
            const mockEntity = enhanced_1.enhancedEntityFactory.buildWithTrait('person', {
                id: entityId,
            });
            // Resolver uses context.loaders.entityLoader
            const mockEntityLoader = {
                load: globals_1.jest.fn().mockResolvedValue(mockEntity),
                loadMany: globals_1.jest.fn(),
                clear: globals_1.jest.fn(),
                clearAll: globals_1.jest.fn()
            };
            const mockedTester = tester.withContext({
                loaders: {
                    ...tester['baseContext'].loaders,
                    entityLoader: mockEntityLoader
                }
            });
            // Act
            const result = await mockedTester.query(ResolverTestUtils_1.TestQueries.getEntity, {
                variables: { id: entityId },
            });
            // Assert
            ResolverTestUtils_1.resolverAssertions.noErrors(result);
            ResolverTestUtils_1.resolverAssertions.hasData(result);
            (0, globals_1.expect)(result.data?.entity?.id).toBe(entityId);
        });
        (0, globals_1.it)('should return null for non-existent entity', async () => {
            const mockEntityLoader = {
                load: globals_1.jest.fn().mockResolvedValue(null),
                loadMany: globals_1.jest.fn(),
                clear: globals_1.jest.fn(),
                clearAll: globals_1.jest.fn()
            };
            const mockedTester = tester.withContext({
                loaders: {
                    ...tester['baseContext'].loaders,
                    entityLoader: mockEntityLoader
                }
            });
            // Act
            const result = await mockedTester.query(ResolverTestUtils_1.TestQueries.getEntity, {
                variables: { id: 'non-existent-id' },
            });
            // Assert
            ResolverTestUtils_1.resolverAssertions.noErrors(result);
            (0, globals_1.expect)(result.data?.entity).toBeNull();
        });
    });
    (0, globals_1.describe)('Query: entities (list)', () => {
        (0, globals_1.it)('should return paginated entities', async () => {
            // Arrange
            const entities = enhanced_1.enhancedEntityFactory.buildList(5);
            mockRun.mockResolvedValueOnce({
                records: entities.map(e => ({
                    get: (key) => {
                        if (key === 'n')
                            return {
                                properties: e,
                                labels: [e.type || 'Entity']
                            };
                    }
                }))
            });
            // Act
            // Using updated TestQueries.listEntities (expects type, q, limit, offset)
            const result = await tester.query(ResolverTestUtils_1.TestQueries.listEntities, {
                variables: { limit: 10, offset: 0 },
            });
            // Assert
            ResolverTestUtils_1.resolverAssertions.noErrors(result);
            ResolverTestUtils_1.resolverAssertions.hasData(result);
            (0, globals_1.expect)(result.data?.entities).toHaveLength(5);
        });
    });
    (0, globals_1.describe)('Mutation: createEntity', () => {
        (0, globals_1.it)('should create entity with valid input', async () => {
            // Arrange
            const newEntityId = 'new-entity-123';
            const input = {
                name: 'New Entity',
                type: 'person',
                investigationId: 'inv-123',
            };
            mockRun.mockResolvedValueOnce({
                records: [{
                        get: (key) => ({
                            properties: { ...input, id: newEntityId, createdAt: new Date(), updatedAt: new Date(), tenantId: 'tenant-1' },
                            labels: [input.type]
                        })
                    }]
            });
            // Act
            const result = await tester.mutate(ResolverTestUtils_1.TestMutations.createEntity, {
                variables: {
                    input: {
                        type: 'person',
                        props: { name: 'New Entity', investigationId: 'inv-123' }
                    },
                },
            });
            // Assert
            ResolverTestUtils_1.resolverAssertions.noErrors(result);
            (0, globals_1.expect)(result.data?.createEntity?.id).toBe(newEntityId);
        });
    });
    (0, globals_1.describe)('Mutation: deleteEntity', () => {
        (0, globals_1.it)('should delete entity', async () => {
            mockRun.mockResolvedValueOnce({
                records: [{ get: () => ({ properties: { id: 'del-1' } }) }]
            });
            const result = await tester.mutate(ResolverTestUtils_1.TestMutations.deleteEntity, {
                variables: { id: 'del-1' }
            });
            ResolverTestUtils_1.resolverAssertions.noErrors(result);
            (0, globals_1.expect)(result.data?.deleteEntity).toBe(true);
        });
    });
});
