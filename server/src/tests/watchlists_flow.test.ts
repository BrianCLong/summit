import { watchlistResolvers } from '../resolvers/watchlists';
import { describe, it, test, expect } from '@jest/globals';

describe('Watchlist flow', () => {
  it('creates and adds entity', async () => {
    const context = {
      user: { id: 'tester', tenantId: 'tenant-1', roles: ['admin'], scopes: [] },
    } as any;

    const wl = await watchlistResolvers.Mutation.createWatchlist(null, {
      name: 'test',
      type: 'entity',
    }, context);
    await watchlistResolvers.Mutation.addToWatchlist(null, {
      id: wl.id,
      entityIds: ['e1'],
    }, context);
    const fetched = await watchlistResolvers.Query.watchlist(null, { id: wl.id }, context);
    expect(fetched.members).toContain('e1');
  });
});
