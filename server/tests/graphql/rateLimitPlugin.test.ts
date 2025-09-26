import { ApolloServer } from '@apollo/server';
import { HeaderMap } from '@apollo/server';
import type { GraphQLResponse } from '@apollo/server';
import {
  rateLimitPlugin,
  type RateLimitStore,
  type RateLimitTier,
  type RateLimitPluginOptions,
} from '../../src/graphql/plugins/rateLimitPlugin.js';

const typeDefs = `#graphql
  type Query {
    ping: String!
  }
`;

const resolvers = {
  Query: {
    ping: () => 'pong',
  },
};

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowSeconds * 1000;
      this.buckets.set(key, { count: 1, expiresAt });
      return { count: 1, ttl: Math.ceil((expiresAt - now) / 1000) };
    }

    existing.count += 1;
    const ttl = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
    return { count: existing.count, ttl };
  }
}

function buildServer(options: Partial<RateLimitPluginOptions> = {}) {
  const tiers: Record<string, RateLimitTier> = {
    free: { windowSeconds: 60, maxRequests: 2 },
    supergrok: { windowSeconds: 60, maxRequests: 5 },
    ...(options.tiers ?? {}),
  };

  const plugin = rateLimitPlugin({
    store: options.store ?? new InMemoryRateLimitStore(),
    tiers,
    identify: options.identify,
    determineTier: options.determineTier,
  });

  return new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [plugin],
  });
}

function extractErrors(response: GraphQLResponse): readonly any[] | undefined {
  if (response.body.kind === 'single') {
    return response.body.singleResult.errors;
  }
  return undefined;
}

describe('rateLimitPlugin', () => {
  it('enforces the free tier limit and returns rate-limit metadata', async () => {
    const server = buildServer();
    await server.start();

    const runQuery = async () =>
      server.executeOperation(
        {
          query: 'query Test { ping }',
          http: { method: 'POST', headers: new HeaderMap(), search: '', body: null },
        },
        {
          contextValue: { user: { id: 'user-free', usageTier: 'free' } },
        },
      );

    const first = await runQuery();
    expect(extractErrors(first)).toBeUndefined();
    expect(first.http?.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(first.http?.headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(Number(first.http?.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(
      Math.floor(Date.now() / 1000),
    );

    const second = await runQuery();
    expect(extractErrors(second)).toBeUndefined();

    const third = await runQuery();
    const thirdErrors = extractErrors(third);
    expect(thirdErrors).toBeDefined();
    expect(thirdErrors?.[0]?.message).toBe('Rate limit exceeded');
    expect(thirdErrors?.[0]?.extensions?.code).toBe('RATE_LIMITED');
    expect(third.http?.status).toBe(429);
    expect(Number(third.http?.headers.get('Retry-After'))).toBeGreaterThanOrEqual(0);
    expect(third.http?.headers.get('X-RateLimit-Remaining')).toBe('0');

    await server.stop();
  });

  it('allows higher throughput for SuperGrok tier', async () => {
    const store = new InMemoryRateLimitStore();
    const server = buildServer({ store });
    await server.start();

    const runQuery = async () =>
      server.executeOperation(
        {
          query: 'query Tier { ping }',
          http: { method: 'POST', headers: new HeaderMap(), search: '', body: null },
        },
        {
          contextValue: { user: { id: 'user-pro', usageTier: 'supergrok' } },
        },
      );

    const attempts = await Promise.all([runQuery(), runQuery(), runQuery(), runQuery()]);
    attempts.forEach((result) => {
      expect(extractErrors(result)).toBeUndefined();
    });

    await server.stop();
  });

  it('falls back to IP-based keys when no user is present', async () => {
    const store = new InMemoryRateLimitStore();
    const server = buildServer({ store });
    await server.start();

    const runAnon = async () =>
      server.executeOperation(
        {
          query: 'query Anonymous { ping }',
          http: {
            method: 'POST',
            headers: new HeaderMap([
              ['x-forwarded-for', '203.0.113.10'],
              ['x-usage-tier', 'free'],
            ]),
            search: '',
            body: null,
          },
        },
        { contextValue: {} },
      );

    await runAnon();
    await runAnon();
    const limited = await runAnon();

    const anonErrors = extractErrors(limited);
    expect(anonErrors?.[0]?.extensions?.code).toBe('RATE_LIMITED');

    await server.stop();
  });
});
