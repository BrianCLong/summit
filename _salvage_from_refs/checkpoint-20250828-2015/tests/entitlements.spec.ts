import request from 'supertest';
import { createClient } from 'redis';

// Assuming the GraphQL server is running at this URL
const GRAPHQL_ENDPOINT = process.env.WEB_URL || 'http://localhost:3001/graphql';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

describe('Entitlements Plugin', () => {
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    // Clear Redis keys related to rate limiting for a clean test state
    const keys = await redisClient.keys('rl:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  it('should allow a query when within quota', async () => {
    // Temporarily set default plan to 'free' for this test
    process.env.DEFAULT_PLAN = 'free';

    const query = `query { suggestLinks(input:{caseId:"c1", seedNodeIds:["n1"]}){ suggestions { id } } }`;
    const tenantId = 'test-tenant-allow';

    // The 'free' plan has a daily limit of 200 and ratePerMin of 10 for 'predict.suggestLinks'
    // We'll make one request, which should be allowed.
    const res = await request(GRAPHQL_ENDPOINT)
      .post('')
      .set('X-Tenant-Id', tenantId)
      .send({ query });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data).toBeDefined();
  });

  it('should block a query when rate limit quota is exceeded', async () => {
    // Temporarily set default plan to 'free' for this test
    process.env.DEFAULT_PLAN = 'free';

    const query = `query { suggestLinks(input:{caseId:"c1", seedNodeIds:["n1"]}){ suggestions { id } } }`;
    const tenantId = 'test-tenant-block-rate';
    const feature = 'predict.suggestlinks';
    const rateLimit = 10; // From 'free' plan

    // Simulate exceeding the rate limit by incrementing Redis counter directly
    const key = `rl:${tenantId}:${feature}:${Math.floor(Date.now() / 60000)}`;
    await redisClient.set(key, rateLimit + 1); // Set count to 1 over the limit

    const res = await request(GRAPHQL_ENDPOINT)
      .post('')
      .set('X-Tenant-Id', tenantId)
      .send({ query });

    expect(res.status).toBe(200); // GraphQL server returns 200 even for errors
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/Quota exceeded/);
    expect(res.body.errors[0].extensions.code).toBe('RESOURCE_EXHAUSTED');
  });

  // Add more tests for daily/monthly limits, different plans, and overrides.
});
