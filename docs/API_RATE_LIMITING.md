# API Rate Limiting Documentation

## Overview

The Summit/IntelGraph platform implements comprehensive API rate limiting to ensure fair usage, prevent abuse, and maintain system stability. This document describes the rate limiting behavior, limits, and best practices for API consumers.

## Rate Limiting Strategies

### Algorithms

We use two complementary rate limiting algorithms:

#### 1. Sliding Window Counter

- **Use Case**: Most REST API endpoints
- **Behavior**: Tracks requests in a rolling time window
- **Advantage**: Prevents burst traffic at window boundaries
- **Example**: 100 requests per minute means you can make 100 requests in any 60-second period

#### 2. Token Bucket

- **Use Case**: GraphQL endpoints, AI/ML services
- **Behavior**: Allows burst traffic while maintaining average rate
- **Advantage**: More flexible for variable workloads
- **Example**: 100 token capacity with 10 tokens/second refill rate allows bursts up to 100 requests

## User Tiers

Rate limits vary based on your subscription tier:

| Tier | Requests/Min | Requests/Hour | Burst Capacity | GraphQL Complexity |
|------|-------------|---------------|----------------|-------------------|
| **Free** | 10 | 500 | 15 | 100 |
| **Basic** | 30 | 1,500 | 50 | 300 |
| **Premium** | 100 | 5,000 | 150 | 1,000 |
| **Enterprise** | 500 | 25,000 | 1,000 | 5,000 |
| **Internal** | 10,000 | 500,000 | 10,000 | 50,000 |

## Endpoint-Specific Limits

### Authentication Endpoints

Stricter limits to prevent brute force attacks:

- **POST /auth/login**: 5 requests/minute
- **POST /auth/register**: 3 requests/hour
- **POST /auth/reset-password**: 3 requests/hour

### GraphQL Endpoint

Token bucket algorithm with complexity-based limiting:

- **POST /graphql**: Based on tier + query complexity
- Maximum complexity calculated from:
  - Number of fields
  - Nesting depth
  - Fragment usage

### Data Ingestion

Higher limits for bulk data operations:

- **POST /api/ingest**: 50 requests/minute
- **POST /api/evidence**: 30 requests/minute

### Analytics

Token bucket for burst analysis workloads:

- **GET /api/analytics**: Token bucket (capacity based on tier)
- Allows short bursts of intensive analytics queries

### Admin Endpoints

Restricted to internal tier only:

- **ALL /api/admin/***: Internal tier required
- No rate limiting for internal service-to-service calls

## HTTP Response Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

### Header Descriptions

- **X-RateLimit-Limit**: Maximum requests allowed in current window
- **X-RateLimit-Remaining**: Requests remaining in current window
- **X-RateLimit-Reset**: Unix timestamp when the limit resets
- **Retry-After**: (Only on 429 errors) Seconds to wait before retrying

## Rate Limit Exceeded (429 Response)

When you exceed the rate limit, you'll receive:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 30,
  "limit": 100,
  "remaining": 0,
  "resetAt": "2025-01-01T00:00:00Z"
}
```

## Best Practices

### 1. Check Response Headers

Always check `X-RateLimit-Remaining` to avoid hitting limits:

```javascript
const response = await fetch('/api/endpoint');
const remaining = response.headers.get('X-RateLimit-Remaining');

if (remaining < 10) {
  console.warn('Approaching rate limit');
}
```

### 2. Implement Exponential Backoff

When you receive a 429 response, implement exponential backoff:

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

### 3. Use Batch Endpoints

For bulk operations, use batch endpoints to reduce request count:

```javascript
// ❌ Bad: Multiple individual requests
for (const entity of entities) {
  await createEntity(entity);
}

// ✅ Good: Single batch request
await createEntitiesBatch(entities);
```

### 4. Cache Responses

Cache responses to reduce redundant API calls:

```javascript
const cache = new Map();

async function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await fetchData(key);
  cache.set(key, data);
  return data;
}
```

### 5. Upgrade Your Tier

If you consistently hit rate limits, consider upgrading to a higher tier for increased capacity.

## GraphQL Complexity

GraphQL queries are limited by complexity score:

```graphql
# Low complexity (score: ~10)
query {
  user {
    id
    name
  }
}

# High complexity (score: ~50)
query {
  investigations {
    id
    entities {
      id
      relationships {
        id
        target {
          id
          name
        }
      }
    }
  }
}
```

**Complexity Calculation**:
- Each field: +1 point
- Each nesting level: +10 points
- Each fragment: +5 points

**Limits by Tier**:
- Free: 100 points
- Basic: 300 points
- Premium: 1,000 points
- Enterprise: 5,000 points
- Internal: 50,000 points

## Monitoring Your Usage

### Admin Dashboard

View your current rate limit status at `/admin/rate-limits`:

- Current usage and remaining quota
- Recent violations
- Usage trends

### API Endpoint

Check your status programmatically:

```bash
GET /api/admin/rate-limits/status/:identifier?endpoint=/api/analytics&tier=premium
```

Response:

```json
{
  "success": true,
  "data": {
    "identifier": "user:123",
    "endpoint": "/api/analytics",
    "tier": "premium",
    "consumed": 45,
    "limit": 100,
    "remaining": 55,
    "resetAt": 1640995200,
    "utilizationPercent": 45
  }
}
```

## Troubleshooting

### Issue: Hitting Limits Unexpectedly

**Causes**:
1. Polling too frequently
2. Not caching responses
3. Inefficient query patterns
4. Shared IP address

**Solutions**:
1. Implement webhooks instead of polling
2. Add response caching
3. Optimize queries (use batch endpoints)
4. Contact support for IP allowlisting

### Issue: GraphQL Complexity Errors

**Causes**:
1. Deeply nested queries
2. Requesting too many fields
3. Multiple fragments

**Solutions**:
1. Reduce query depth
2. Request only needed fields
3. Split into multiple simpler queries
4. Use persisted queries

### Issue: Different Limits Than Expected

**Causes**:
1. Wrong tier assumption
2. Endpoint-specific limits
3. Shared tenant quota

**Solutions**:
1. Verify your tier via `/api/user/profile`
2. Check endpoint-specific limits in docs
3. Consider per-user authentication

## Support

For rate limit increases or issues:

1. **Email**: support@intelgraph.io
2. **Documentation**: https://docs.intelgraph.io/rate-limits
3. **Admin Dashboard**: `/admin/rate-limits`

## Changelog

### 2025-01-15
- Initial implementation with sliding window and token bucket algorithms
- Per-tier and per-endpoint policies
- Prometheus metrics integration
- Admin management dashboard
