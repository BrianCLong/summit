import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { HeaderMap } from '@apollo/server';
import Redis from 'ioredis';
import { GraphQLError } from 'graphql';
import logger from '../../utils/logger.js';

export interface RateLimitTier {
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>;
  shutdown?(): Promise<void>;
}

export interface RateLimitIdentity {
  key: string;
  tier?: string;
}

export interface RedisRateLimitOptions {
  url?: string;
  prefix?: string;
}

export interface RateLimitPluginOptions {
  store?: RateLimitStore;
  tiers?: Record<string, RateLimitTier>;
  redis?: RedisRateLimitOptions;
  identify?: (
    context: GraphQLRequestContext<any>,
  ) => RateLimitIdentity | null | undefined | false;
  determineTier?: (
    context: GraphQLRequestContext<any>,
  ) => string | null | undefined;
}

const DEFAULT_WINDOW_SECONDS = Number(process.env.GRAPHQL_RATE_LIMIT_WINDOW_SECONDS ?? '3600');
const DEFAULT_FREE_LIMIT = Number(process.env.GRAPHQL_RATE_LIMIT_FREE_LIMIT ?? '1000');
const DEFAULT_SUPERGROK_LIMIT = Number(
  process.env.GRAPHQL_RATE_LIMIT_SUPERGROK_LIMIT ?? '5000',
);
const DEFAULT_SUPERGROK_WINDOW = Number(
  process.env.GRAPHQL_RATE_LIMIT_SUPERGROK_WINDOW_SECONDS ??
    process.env.GRAPHQL_RATE_LIMIT_WINDOW_SECONDS ??
    DEFAULT_WINDOW_SECONDS,
);

const defaultTiers: Record<string, RateLimitTier> = {
  free: {
    windowSeconds: DEFAULT_WINDOW_SECONDS,
    maxRequests: DEFAULT_FREE_LIMIT,
  },
  supergrok: {
    windowSeconds: DEFAULT_SUPERGROK_WINDOW,
    maxRequests: DEFAULT_SUPERGROK_LIMIT,
  },
};

export class RedisRateLimitStore implements RateLimitStore {
  private readonly client: Redis;
  private readonly prefix: string;

  constructor(options: RedisRateLimitOptions = {}) {
    const redisUrl =
      options.url ||
      process.env.GRAPHQL_RATE_LIMIT_REDIS_URL ||
      process.env.REDIS_URL ||
      'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      enableOfflineQueue: true,
      maxRetriesPerRequest: 1,
    });

    this.client.on('error', (error) => {
      logger.warn('Redis rate limit client error', { err: error });
    });

    this.prefix = options.prefix ?? 'gql:rate';
  }

  private namespaced(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const namespacedKey = this.namespaced(key);
    try {
      const pipeline = this.client.multi();
      pipeline.incr(namespacedKey);
      pipeline.pttl(namespacedKey);
      const results = await pipeline.exec();

      const count = Number(results?.[0]?.[1] ?? 0);
      let ttlMs = Number(results?.[1]?.[1] ?? -1);

      if (ttlMs <= 0) {
        ttlMs = windowSeconds * 1000;
        await this.client.pexpire(namespacedKey, ttlMs);
      }

      return {
        count,
        ttl: Math.max(1, Math.ceil(ttlMs / 1000)),
      };
    } catch (error) {
      logger.warn('Falling back to allow GraphQL request after Redis failure', {
        err: error instanceof Error ? error.message : error,
        key,
      });
      return { count: 1, ttl: windowSeconds };
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.client.status !== 'end') {
        await this.client.quit();
      }
    } catch (error) {
      logger.warn('Failed to shutdown Redis rate limit client', { err: error });
    }
  }
}

function normalizeTier(tier?: string | null): string {
  if (!tier) {
    return 'free';
  }
  return tier.toLowerCase();
}

function inferTierFromContext(context: GraphQLRequestContext<any>): string | undefined {
  const value: any = context.contextValue;
  if (value?.usageTier) {
    return value.usageTier;
  }
  if (value?.user?.usageTier) {
    return value.user.usageTier;
  }
  if (value?.user?.plan) {
    return value.user.plan;
  }
  if (value?.user?.tier) {
    return value.user.tier;
  }

  const headers = context.request.http?.headers;
  const tierHeader =
    headers?.get('x-usage-tier') ||
    headers?.get('x-plan') ||
    headers?.get('x-tier') ||
    headers?.get('x-subscription-tier');
  return tierHeader ?? undefined;
}

function extractIp(context: GraphQLRequestContext<any>): string | undefined {
  const value: any = context.contextValue;
  const fromContext = value?.request?.ip || value?.ip || value?.clientIp;
  if (fromContext) {
    return fromContext;
  }

  const headers = context.request.http?.headers;
  const forwarded = headers?.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim();
  }
  return (
    headers?.get('x-real-ip') ||
    headers?.get('cf-connecting-ip') ||
    headers?.get('true-client-ip') ||
    context.request.http?.headers?.get('remote-addr') ||
    undefined
  );
}

function defaultIdentify(
  context: GraphQLRequestContext<any>,
): RateLimitIdentity | null {
  const value: any = context.contextValue;
  if (value?.user?.id) {
    return { key: `user:${value.user.id}` };
  }

  const ip = extractIp(context);
  if (ip) {
    return { key: `ip:${ip}` };
  }

  return { key: 'ip:anonymous' };
}

interface RateLimitState {
  applied: boolean;
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export function rateLimitPlugin(options: RateLimitPluginOptions = {}): ApolloServerPlugin {
  const store = options.store ?? new RedisRateLimitStore(options.redis);
  const tierConfig: Record<string, RateLimitTier> = { ...defaultTiers, ...options.tiers };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      const state: RateLimitState = {
        applied: false,
        allowed: true,
        limit: 0,
        remaining: 0,
        resetAt: 0,
        retryAfter: 0,
      };

      return {
        async didResolveOperation(context) {
          const identity =
            (options.identify ? options.identify(context) : defaultIdentify(context)) || null;
          if (!identity) {
            return;
          }

          const inferredTier = normalizeTier(
            options.determineTier?.(context) || identity.tier || inferTierFromContext(context),
          );

          const tier = tierConfig[inferredTier] ?? tierConfig.free ?? Object.values(tierConfig)[0];
          if (!tier) {
            logger.warn('No rate limit tier configuration found; skipping rate limit', {
              inferredTier,
            });
            return;
          }

          try {
            const { count, ttl } = await store.increment(identity.key, tier.windowSeconds);
            const allowed = count <= tier.maxRequests;
            const remaining = allowed ? tier.maxRequests - count : 0;
            const resetAt = Math.ceil(Date.now() / 1000 + ttl);

            state.applied = true;
            state.allowed = allowed;
            state.limit = tier.maxRequests;
            state.remaining = remaining;
            state.resetAt = resetAt;
            state.retryAfter = ttl;

            if (!allowed) {
              throw new GraphQLError('Rate limit exceeded', {
                extensions: {
                  code: 'RATE_LIMITED',
                  retryAfter: ttl,
                  http: {
                    status: 429,
                  },
                },
              });
            }
          } catch (error) {
            logger.warn('GraphQL rate limit enforcement failed; allowing request', {
              err: error instanceof Error ? error.message : error,
              key: identity.key,
            });

            if (error instanceof GraphQLError) {
              throw error;
            }
          }
        },
        async willSendResponse(context) {
          if (!state.applied) {
            return;
          }

          if (!context.response.http) {
            context.response.http = { headers: new HeaderMap() };
          }

          context.response.http.headers.set('X-RateLimit-Limit', state.limit.toString());
          context.response.http.headers.set(
            'X-RateLimit-Remaining',
            Math.max(state.remaining, 0).toString(),
          );
          context.response.http.headers.set('X-RateLimit-Reset', state.resetAt.toString());

          if (!state.allowed) {
            context.response.http.status = context.response.http.status ?? 429;
            context.response.http.headers.set('Retry-After', Math.max(state.retryAfter, 0).toString());
          }
        },
      };
    },
  };
}

