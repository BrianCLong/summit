const resolvers = require('../src/graphql/resolvers');

jest.mock('../src/config/database', () => {
  const session = {
    run: jest
      .fn()
      .mockResolvedValue({
        records: [
          { get: () => ({ properties: { id: 'rel1', label: 'RELATED_TO' } }) },
        ],
      }),
    close: jest.fn(),
  };
  return {
    getNeo4jDriver: () => ({ session: () => session }),
    getPostgresPool: () => ({ query: jest.fn() }),
  };
});

describe('Relationship resolvers', () => {
  const user = { id: 'u1' };

  test('createRelationship returns payload', async () => {
    const input = {
      sourceId: 'a',
      targetId: 'b',
      type: 'RELATED_TO',
      label: 'Related',
    };
    const out = await resolvers.Mutation.createRelationship(
      null,
      { input },
      { user },
    );
    expect(out).toHaveProperty('id');
    expect(out).toHaveProperty('type', 'RELATED_TO');
  });

  test('updateRelationship returns payload', async () => {
    const out = await resolvers.Mutation.updateRelationship(
      null,
      { id: 'rel1', input: { label: 'Updated' } },
      { user },
    );
    expect(out).toHaveProperty('id');
  });

  test('deleteRelationship returns true', async () => {
    const out = await resolvers.Mutation.deleteRelationship(
      null,
      { id: 'rel1' },
      { user },
    );
    expect(out).toBe(true);
  });
});
