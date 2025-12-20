# @intelgraph/rate-limiter

Comprehensive API rate limiting and throttling system for the Summit/IntelGraph platform.

## Features

- **Multiple Algorithms**: Sliding window and token bucket implementations
- **Distributed Support**: Redis-based for multi-instance deployments
- **Flexible Policies**: Configurable per-endpoint and per-tier limits
- **Graceful Degradation**: Proper error handling and retry headers
- **Monitoring**: Prometheus metrics and alerting
- **Admin Dashboard**: Management interface for rate limit configuration
- **TypeScript**: Full type safety

## Algorithms

### Sliding Window Counter

Tracks requests in a rolling time window. More accurate than fixed windows, prevents burst at window boundaries.

**Use cases**: API endpoints with strict rate limits, user-tier quotas

### Token Bucket

Allows burst traffic while maintaining average rate. Tokens refill at a constant rate.

**Use cases**: GraphQL endpoints, AI/ML services, high-variance workloads

## User Tiers

| Tier | Requests/Min | Requests/Hour | Burst Size | GraphQL Complexity |
|------|-------------|---------------|------------|-------------------|
| **Free** | 10 | 500 | 15 | 100 |
| **Basic** | 30 | 1,500 | 50 | 300 |
| **Premium** | 100 | 5,000 | 150 | 1,000 |
| **Enterprise** | 500 | 25,000 | 1,000 | 5,000 |
| **Internal** | 10,000 | 500,000 | 10,000 | 50,000 |

## Endpoint-Specific Limits

- **Authentication** (`/auth/*`): Stricter limits to prevent brute force
- **GraphQL** (`/graphql`): Complexity-based + request-based limits
- **Ingest** (`/api/ingest`): Higher limits for data upload
- **Analytics** (`/api/analytics`): Token bucket for burst analysis
- **Admin** (`/api/admin`): Internal tier only

## Installation

```bash
pnpm add @intelgraph/rate-limiter
```

## Usage

### Express Middleware

```typescript
import { createRateLimiter } from '@intelgraph/rate-limiter';

const limiter = createRateLimiter({
  algorithm: 'sliding-window',
  windowMs: 60000, // 1 minute
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
});

app.use('/api', limiter);
```

### GraphQL Plugin

```typescript
import { createGraphQLRateLimitPlugin } from '@intelgraph/rate-limiter';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    createGraphQLRateLimitPlugin({
      algorithm: 'token-bucket',
      capacity: 100,
      refillRate: 10,
    }),
  ],
});
```

## Configuration

Environment variables:

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate limit defaults
RATE_LIMIT_ENABLED=true
RATE_LIMIT_ALGORITHM=sliding-window
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
RATE_LIMIT_METRICS_ENABLED=true
RATE_LIMIT_ALERT_THRESHOLD=0.9
```

## API Response Headers

Rate-limited responses include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 30
```

HTTP 429 response:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 30,
  "limit": 100,
  "remaining": 0,
  "resetAt": "2025-01-01T00:00:00Z"
}
```

## Monitoring

Prometheus metrics exposed:

- `rate_limit_requests_total{tier, endpoint, result}`
- `rate_limit_violations_total{tier, endpoint}`
- `rate_limit_current_usage{tier, endpoint}`
- `rate_limit_algorithm_duration_ms{algorithm}`

## License

MIT © IntelGraph
