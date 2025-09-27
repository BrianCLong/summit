import Redis from 'ioredis-mock';
import pino from 'pino';
import { IngestionRateLimiter, RateLimitExceededError } from '../rateLimiter';

describe('IngestionRateLimiter', () => {
  const logger = pino({ level: 'silent' });

  it('allows ingestion when within burst capacity', async () => {
    const redis = new (Redis as any)();
    const limiter = new IngestionRateLimiter(redis, logger, { maxPerMinute: 10, burst: 20 });

    await expect(
      limiter.ensureWithinLimit({ tenantId: 'tenant-a', userId: 'user-a', tokens: 10 })
    ).resolves.toBeUndefined();
  });

  it('rejects ingestion when tokens exceed available capacity', async () => {
    const redis = new (Redis as any)();
    const limiter = new IngestionRateLimiter(redis, logger, { maxPerMinute: 5, burst: 5 });

    await limiter.ensureWithinLimit({ tenantId: 'tenant-b', tokens: 5 });

    await expect(
      limiter.ensureWithinLimit({ tenantId: 'tenant-b', tokens: 2 })
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it('honors user-specific overrides from Redis', async () => {
    const redis = new (Redis as any)();
    const limiter = new IngestionRateLimiter(redis, logger, { maxPerMinute: 50, burst: 50 });

    await redis.set(
      'feed:ingestion:config:user:user-tight',
      JSON.stringify({ maxPerMinute: 2, burst: 2 })
    );

    await expect(
      limiter.ensureWithinLimit({ tenantId: 'tenant-c', userId: 'user-tight', tokens: 2 })
    ).resolves.toBeUndefined();

    await expect(
      limiter.ensureWithinLimit({ tenantId: 'tenant-c', userId: 'user-tight', tokens: 1 })
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });
});
