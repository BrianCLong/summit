
import { MessagePersistence } from '../../../src/services/websocket-server/src/managers/MessagePersistence.js';
import { AdaptiveRateLimiter } from '../../../src/lib/streaming/rate-limiter.js';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis', () => require('ioredis-mock'));

// These tests are skipped by default as they can be slow and resource-intensive.
// They should be enabled and run as part of a dedicated performance testing suite.
// To run them, change `it.skip` to `it`.
describe('Streaming Infrastructure Stress Tests', () => {
  let redis: Redis;

  beforeEach(() => {
    redis = new Redis();
  });

  afterEach(() => {
    redis.flushall();
  });

  // This test is skipped by default as it can be slow.
  // It should be run manually as part of a performance testing suite.
  it.skip('MessagePersistence should handle high message volume without crashing', async () => {
    const persistence = new MessagePersistence(redis, 3600, 1000);
    const messageCount = 10000;
    const promises = [];

    for (let i = 0; i < messageCount; i++) {
      promises.push(persistence.storeMessage({
        room: 'stress-test',
        from: `user-${i}`,
        data: { content: `message ${i}` },
      }));
    }

    await Promise.all(promises);

    // Allow time for the channel to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalCount = await redis.zcard('messages:room:stress-test');
    expect(finalCount).toBe(1000); // Should be capped at maxMessages
  }, 30000); // 30 second timeout

  it.skip('AdaptiveRateLimiter should handle concurrent requests', async () => {
    const limiter = new AdaptiveRateLimiter({
      maxTokens: 100,
      refillRate: 500, // High refill rate for the test
    });

    const requestCount = 5000;
    const promises = [];
    let acquiredCount = 0;

    for (let i = 0; i < requestCount; i++) {
      promises.push(
        limiter.acquire('concurrent-test').then(() => {
          acquiredCount++;
        })
      );
    }

    await Promise.all(promises);
    expect(acquiredCount).toBe(requestCount);

    limiter.destroy();
  }, 30000);
});
