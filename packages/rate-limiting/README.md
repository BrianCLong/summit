# @intelgraph/rate-limiting

Enterprise rate limiting package with multiple strategies and distributed support.

## Installation

```bash
pnpm add @intelgraph/rate-limiting
```

## Usage

### Fixed Window

```typescript
import { FixedWindowLimiter } from "@intelgraph/rate-limiting";

const limiter = new FixedWindowLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

const result = await limiter.checkLimit("user123");
```

### Sliding Window

```typescript
import { SlidingWindowLimiter } from "@intelgraph/rate-limiting";

const limiter = new SlidingWindowLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});
```

### Token Bucket

```typescript
import { TokenBucketLimiter } from "@intelgraph/rate-limiting";

const limiter = new TokenBucketLimiter({
  bucketSize: 100,
  refillRate: 10, // tokens per second
  windowMs: 60 * 1000,
  maxRequests: 100,
});
```

### Distributed (Redis)

```typescript
import { RedisRateLimiter } from "@intelgraph/rate-limiting";

const limiter = new RedisRateLimiter({
  redis: { host: "localhost", port: 6379 },
  windowMs: 60 * 1000,
  maxRequests: 1000,
});
```

### Express Middleware

```typescript
import { createRateLimitMiddleware } from "@intelgraph/rate-limiting";

app.use(
  createRateLimitMiddleware({
    limiter,
    keyGenerator: (req) => req.ip,
  })
);
```

## Features

- Multiple strategies (fixed window, sliding window, token bucket, leaky bucket)
- Distributed rate limiting with Redis
- Express middleware
- Per-client and per-route limits
- Quota management
- Burst handling

## Documentation

See [API Gateway Guide](../../docs/api-gateway/GUIDE.md) for complete documentation.
