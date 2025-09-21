const resolvers = require('../src/graphql/resolvers');

jest.mock('../src/services/SocialService', () => {
  return function() { return { queryProvider: jest.fn().mockResolvedValue(3) } };
});

jest.mock('../src/services/PublicDataService', () => {
  return function() { return { import: jest.fn().mockResolvedValue(1) } };
});

describe('Social/Public resolvers', () => {
  const user = { id: 'u1' };

  test('socialQuery returns count', async () => {
    const out = await resolvers.Mutation.socialQuery(null, { provider: 'reddit', query: 'acme', investigationId: 'inv1' }, { user });
    expect(out).toBe(3);
  });

  test('importPublicData returns count', async () => {
    const out = await resolvers.Mutation.importPublicData(null, { source: 'sec', query: 'ACME', investigationId: 'inv1' }, { user });
    expect(out).toBe(1);
  });
});

