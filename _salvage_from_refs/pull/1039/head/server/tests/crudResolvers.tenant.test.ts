jest.mock('../src/config/database.js', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn(),
  getRedisClient: jest.fn(),
}));

const { getNeo4jDriver } = require('../src/config/database.js');
const { crudResolvers } = require('../src/graphql/resolvers/crudResolvers.ts');

describe('crudResolvers tenant enforcement', () => {
  it('scopes entity query by tenantId', async () => {
    const run = jest.fn().mockResolvedValue({ records: [] });
    const session = { run, close: jest.fn() };
    getNeo4jDriver.mockReturnValue({ session: () => session });

    const context = { user: { id: 'u1', tenantId: 't1' } };
    await crudResolvers.Query.entity(null, { id: 'e1' }, context as any);

    expect(run).toHaveBeenCalled();
    const params = run.mock.calls[0][1];
    expect(params.tenantId).toBe('t1');
  });
});
