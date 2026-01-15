import { GraphQLError } from 'graphql';
import { jest } from '@jest/globals';

const entityCreateMock = jest.fn();
const relationshipCreateMock = jest.fn();
const investigationCreateMock = jest.fn();

jest.unstable_mockModule('../../src/tenancy/tenantScope.js', () => ({
  resolveTenantId: (tenantId: string) => tenantId,
}));

jest.unstable_mockModule('../../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({} as never)),
}));

jest.unstable_mockModule('../../src/db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(() => ({} as never)),
}));

jest.unstable_mockModule('../../src/repos/EntityRepo.js', () => ({
  EntityRepo: jest.fn().mockImplementation(() => ({
    create: entityCreateMock,
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../src/repos/RelationshipRepo.js', () => ({
  RelationshipRepo: jest.fn().mockImplementation(() => ({
    create: relationshipCreateMock,
    delete: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    findByEntityId: jest.fn(),
    getEntityRelationshipCount: jest.fn(() =>
      Promise.resolve({
        incoming: 0,
        outgoing: 0,
      }),
    ),
  })),
}));

jest.unstable_mockModule('../../src/repos/InvestigationRepo.js', () => ({
  InvestigationRepo: jest.fn().mockImplementation(() => ({
    create: investigationCreateMock,
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    getStats: jest.fn(),
  })),
}));

let coreResolvers: typeof import('../../src/graphql/resolvers/core.js')['coreResolvers'];

beforeAll(async () => {
  ({ coreResolvers } = await import('../../src/graphql/resolvers/core.js'));
});

describe('coreResolvers validation', () => {
  it('returns typed GraphQL error when tenant is missing for createEntity', async () => {
    await expect(
      coreResolvers.Mutation.createEntity(
        {},
        { input: { kind: 'Person', props: {} } as never },
        {} as never,
      ),
    ).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } },
    });

    expect(entityCreateMock).not.toHaveBeenCalled();
  });

  it('rejects investigation updates with schema-invalid status', async () => {
    await expect(
      coreResolvers.Mutation.updateInvestigation(
        {},
        {
          input: {
            id: '00000000-0000-0000-0000-000000000000',
            status: 'DRAFT' as never,
          },
        },
        { tenantId: 'tenant-1' } as never,
      ),
    ).rejects.toBeInstanceOf(GraphQLError);
  });
});
