const resolvers = require('../src/graphql/resolvers');

describe('GraphOps resolvers', () => {
  const ctx = {
    user: { id: 'u1', role: 'ANALYST' },
    logger: { error: jest.fn(), info: jest.fn() },
  };

  it('validates expandNeighbors input', async () => {
    await expect(
      resolvers.Mutation.expandNeighbors(null, { entityId: '' }, ctx)
    ).rejects.toBeTruthy();
  });

  it('rejects tagEntity without role', async () => {
    await expect(
      resolvers.Mutation.tagEntity(null, { entityId: 'e1', tag: 'ok' }, { user: null })
    ).rejects.toBeTruthy();
  });
});

