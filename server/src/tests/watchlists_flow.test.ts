import { watchlistResolvers } from '../resolvers/watchlists';
import { describe, it, test, expect } from '@jest/globals';

describe('Watchlist flow', () => {
  it('creates and adds entity', () => {
    const wl = watchlistResolvers.Mutation.createWatchlist(null, {
      name: 'test',
      type: 'entity',
    });
    watchlistResolvers.Mutation.addToWatchlist(null, {
      id: wl.id,
      entityIds: ['e1'],
    });
    const fetched = watchlistResolvers.Query.watchlist(null, { id: wl.id });
    expect(fetched.members).toContain('e1');
  });
});
