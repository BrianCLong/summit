### Goals

- Prevent abuse and runaway cost; guarantee fairness across **tenants** and **users**
- Combine **network‑level** throttles (Ingress/Envoy) + **app‑level** **token buckets** + **GraphQL cost** guards

### NGINX Ingress (per‑IP) — burst/token bucket

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-connections: '50'
    nginx.ingress.kubernetes.io/limit-rps: '20'
    nginx.ingress.kubernetes.io/limit-burst-multiplier: '5'
```

### Envoy Global Rate Limit (Redis)

- Deploy Envoy Rate Limit Service with Redis backend
- Define descriptors: `tenant`, `user`, `operation` (GraphQL field)

### App‑Level (Express + Redis)

```ts
// server/src/middleware/rateLimit.ts
import { createClient } from 'redis';
import type { Request, Response, NextFunction } from 'express';

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();

export function tokenBucket({
  capacity,
  refillPerSec,
}: {
  capacity: number;
  refillPerSec: number;
}) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const tenant = (req as any).tenantId || 'anon';
    const key = `rl:${tenant}:${req.ip}`;
    const now = Date.now();
    const lua = `
    local key, now, cap, rate = KEYS[1], ARGV[1], ARGV[2], ARGV[3]
    local b = redis.call('HMGET', key, 'tokens','ts')
    local tokens = tonumber(b[1]) or cap
    local ts = tonumber(b[2]) or now
    local delta = (now - ts) / 1000.0
    tokens = math.min(cap, tokens + delta * rate)
    local allowed = 0
    if tokens >= 1 then
      tokens = tokens - 1
      allowed = 1
    end
    redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
    redis.call('EXPIRE', key, 3600)
    return {allowed, tokens}
    `;
    const r = (await redis.eval(lua, {
      keys: [key],
      arguments: [String(now), String(capacity), String(refillPerSec)],
    })) as [number, number];
    if (r[0] === 1) return next();
    res
      .status(429)
      .json({
        error: 'rate_limited',
        retryAfterSec: Math.ceil((1 - r[1]) / refillPerSec),
      });
  };
}
```

### GraphQL Complexity Guard (Apollo Plugin)

```ts
import { PluginDefinition } from 'apollo-server-plugin-base';
export const costGuard: PluginDefinition = {
  requestDidStart() {
    return {
      didResolveOperation({ request, document }) {
        const cost = estimateCost(document);
        if (cost > 2000) throw new Error('Query too costly');
      },
    };
  },
};
```

### Tests (Jest + Supertest)

```ts
it('enforces 429 when bursting', async () => {
  for (let i = 0; i < 100; i++)
    await request(app).get('/graphql').send({ query: '{ ping }' });
  const res = await request(app).get('/graphql').send({ query: '{ ping }' });
  expect([429, 200]).toContain(res.status); // flake‑tolerant while tuning
});
```

### Rollout

- Dry‑run in **stage**; set high thresholds; collect metrics
- Gradually tighten per tenant/user/operation; publish limits in API docs
