import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvers } from '../subscriptions';

vi.mock('../../realtimeManager', () => ({
  realtimeManager: {
    on: vi.fn(),
  },
}));

describe('GraphQL Subscriptions', () => {
  describe('onGraphEvent filter logic', () => {
    it('should export subscription resolvers', () => {
      expect(resolvers.Subscription.onGraphEvent.subscribe).toBeTypeOf('function');
      expect(resolvers.Subscription.onGraphEvent.resolve).toBeTypeOf('function');

      const payload = { onGraphEvent: { id: 'test' } };
      expect(resolvers.Subscription.onGraphEvent.resolve(payload)).toEqual({ id: 'test' });
    });
  });
});
