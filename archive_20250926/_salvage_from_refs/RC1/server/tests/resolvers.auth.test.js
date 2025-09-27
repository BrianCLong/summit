const resolvers = require('../src/graphql/resolvers');

describe('GraphQL resolvers (auth-gated)', () => {
  const fakeUser = { id: 'u1', email: 'user@example.com', role: 'ADMIN' };

  it('me returns current user when authenticated', async () => {
    const result = await resolvers.Query.me(null, {}, { user: fakeUser });
    expect(result).toEqual(fakeUser);
  });

  it('investigations returns mock data when authenticated', async () => {
    const list = await resolvers.Query.investigations(null, { page: 1, limit: 10 }, { user: fakeUser });
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]).toHaveProperty('title');
    expect(list[0]).toHaveProperty('status');
  });
});

