import { watchlistResolvers } from '../resolvers/watchlists';
import { describe, it, test, expect } from '@jest/globals';

describe('Watchlist flow', () => {
  it('creates and adds entity', () => {
    const context = {
      user: { id: 'tester', tenantId: 'tenant-1', roles: ['admin'], scopes: [] },
    } as any;

    const wl = watchlistResolvers.Mutation.createWatchlist(null, {
      name: 'test',
      type: 'entity',
    }, context);
    watchlistResolvers.Mutation.addToWatchlist(null, {
      id: wl.id,
      entityIds: ['e1'],
    }, context);
    const fetched = watchlistResolvers.Query.watchlist(null, { id: wl.id });
    expect(fetched.members).toContain('e1');
  });
});
