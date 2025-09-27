import type { GraphQLContext } from '../../../services/api/src/graphql/context.js';
import { entityResolvers } from '../../../services/api/src/resolvers/entity.js';

describe('Resolver authorization', () => {
  const createContext = (options: { allow?: boolean }) => {
    const postgres = {
      query: jest.fn(),
    };
    const neo4j = {
      executeQuery: jest.fn(),
    };
    const redis = {};

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: () => logger,
    };

    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ result: options.allow !== false }),
    }));

    const context: GraphQLContext & { fetch: typeof fetchMock } = {
      req: {} as any,
      res: {} as any,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        tenantId: 'tenant-1',
        role: 'analyst',
        permissions: ['entity:read', 'entity:write'],
      },
      tenant: {
        id: 'tenant-1',
        name: 'Tenant 1',
        settings: {},
      },
      dataSources: {
        postgres: postgres as any,
        neo4j: neo4j as any,
        redis: redis as any,
      },
      logger,
      requestId: 'req-1',
      startTime: Date.now(),
      fetch: fetchMock,
    };

    return { context, postgres, neo4j, fetchMock };
  };

  it('denies entity access when OPA rejects the request', async () => {
    const { context, postgres } = createContext({ allow: false });

    const result = await entityResolvers.Query.entity(
      {},
      { id: 'entity-1', tenantId: 'tenant-1' },
      context,
    );

    expect(result).toEqual(
      expect.objectContaining({
        __typename: 'ResolverError',
        code: 'AUTHZ_DENIED',
      }),
    );
    expect(postgres.query).not.toHaveBeenCalled();
  });

  it('fetches entity details when authorized', async () => {
    const { context, postgres } = createContext({ allow: true });

    postgres.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'entity-42',
          tenant_id: 'tenant-1',
          kind: 'PERSON',
          display_name: 'Casey Analyst',
          summary: 'Threat intel lead',
          risk_score: 0.42,
          properties: { country: 'US' },
          created_at: new Date('2024-01-01T00:00:00Z'),
          updated_at: new Date('2024-01-02T00:00:00Z'),
        },
      ],
    });

    const result = await entityResolvers.Query.entity(
      {},
      { id: 'entity-42', tenantId: 'tenant-1' },
      context,
    );

    expect(result).toEqual(
      expect.objectContaining({
        __typename: 'Entity',
        id: 'entity-42',
        displayName: 'Casey Analyst',
      }),
    );
    expect(postgres.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
      ['entity-42', 'tenant-1'],
    );
  });
});
