# Rate Limiting Implementation Guide

## Overview

This guide provides step-by-step instructions for deploying the comprehensive rate limiting system in Summit/IntelGraph.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Middleware                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Rate Limit Middleware                                 │ │
│  │  - Extract identifier (user/tenant/IP)                 │ │
│  │  - Check rate limit                                    │ │
│  │  - Set headers                                         │ │
│  │  - Allow/Deny request                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Rate Limiter Core                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Sliding Window   │  │  Token Bucket    │                │
│  │   Algorithm      │  │   Algorithm      │                │
│  └──────────────────┘  └──────────────────┘                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Redis Store                             │
│  - Distributed state                                         │
│  - Atomic operations (Lua scripts)                           │
│  - TTL-based cleanup                                         │
└─────────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────────┐
         │        Monitoring & Alerting          │
         │  - Prometheus metrics                 │
         │  - Violation tracking                 │
         │  - Admin dashboard                    │
         └──────────────────────────────────────┘
```

## Installation

### 1. Install Package Dependencies

```bash
cd /home/user/summit
pnpm install
```

This will install the `@intelgraph/rate-limiter` package and its dependencies.

### 2. Configure Environment Variables

Add to your `.env` file (see `.env.rate-limit.example`):

```bash
# Enable rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_ALGORITHM=sliding-window
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Redis configuration
REDIS_RATE_LIMIT_DB=1

# Monitoring
RATE_LIMIT_METRICS_ENABLED=true
RATE_LIMIT_ALERT_THRESHOLD=0.9

# GraphQL
GRAPHQL_MAX_COMPLEXITY=1000
```

### 3. Update API Service

Replace the existing rate limit middleware in `services/api/src/app.ts`:

```typescript
// Old import (remove):
// import { rateLimitMiddleware } from './middleware/rateLimit.js';

// New imports:
import {
  rateLimitMiddleware,
  graphqlRateLimitPlugin,
} from './middleware/rateLimit.new.js';
import { adminRateLimitRouter } from './routes/admin.rateLimit.new.js';

// Add GraphQL plugin:
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    graphqlRateLimitPlugin, // Add this
  ],
});

// Mount admin routes:
app.use('/api/admin/rate-limits', adminRateLimitRouter);
```

### 4. Build the Package

```bash
cd packages/rate-limiter
pnpm build
```

### 5. Run Tests

```bash
pnpm test
```

## Usage Examples

### Express Middleware

```typescript
import { createRateLimiter, createRateLimitMiddleware } from '@intelgraph/rate-limiter';
import Redis from 'ioredis';

const redisClient = new Redis();
const rateLimiter = createRateLimiter(redisClient);

// Global rate limiting
app.use(createRateLimitMiddleware(rateLimiter));

// Endpoint-specific
app.post('/api/auth/login', createEndpointRateLimiter(rateLimiter, '/auth/login'));
```

### GraphQL Plugin

```typescript
import { createGraphQLRateLimitPlugin } from '@intelgraph/rate-limiter';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    createGraphQLRateLimitPlugin(rateLimiter, {
      maxComplexity: 1000,
    }),
  ],
});
```

### Admin API

```typescript
import { createAdminRateLimitRouter } from '@intelgraph/rate-limiter/dist/admin/routes.js';

app.use('/api/admin/rate-limits', createAdminRateLimitRouter(rateLimiter, metricsCollector));
```

## Monitoring

### Prometheus Metrics

Available at `/api/admin/rate-limits/prometheus`:

```
# HELP rate_limit_requests_total Total rate limit requests
# TYPE rate_limit_requests_total counter
rate_limit_requests_total{result="allowed",tier="premium",endpoint="/api/analytics"} 1234

# HELP rate_limit_violations_total Total rate limit violations
# TYPE rate_limit_violations_total counter
rate_limit_violations_total{tier="free",endpoint="/graphql"} 45

# HELP rate_limit_current_usage Current rate limit utilization (0-1)
# TYPE rate_limit_current_usage gauge
rate_limit_current_usage{tier="premium",endpoint="/api/analytics"} 0.75
```

### Admin Dashboard Endpoints

- **GET `/api/admin/rate-limits/metrics`**: Current metrics snapshot
- **GET `/api/admin/rate-limits/violations`**: Recent violations
- **GET `/api/admin/rate-limits/status/:identifier`**: Status for specific user/tenant
- **POST `/api/admin/rate-limits/reset`**: Reset limits for identifier
- **GET `/api/admin/rate-limits/health`**: Health check

## Migration from Old System

### Phase 1: Parallel Running (Recommended)

1. Install new system alongside existing
2. Configure to log only (no enforcement)
3. Monitor metrics for 1 week
4. Adjust policies based on actual usage

### Phase 2: Gradual Rollout

1. Enable for internal tier only
2. Enable for enterprise tier
3. Enable for premium tier
4. Enable for basic/free tiers

### Phase 3: Full Migration

1. Switch all traffic to new system
2. Remove old rate limiting code
3. Archive old configurations

## Troubleshooting

### High Memory Usage

**Cause**: Too many keys in Redis

**Solution**:
```bash
# Check key count
redis-cli --scan --pattern "ratelimit:*" | wc -l

# Reduce TTLs or increase cleanup frequency
# Adjust RATE_LIMIT_WINDOW_MS to lower value
```

### Inconsistent Limits

**Cause**: Multiple Redis instances or clock skew

**Solution**:
- Ensure all servers connect to same Redis instance
- Use NTP for clock synchronization
- Consider using Redis Cluster for high availability

### False Positives

**Cause**: Shared IP addresses (NAT, proxies)

**Solution**:
```typescript
// Use authenticated user ID instead of IP
keyGenerator: (req) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  // Fallback to IP
  return `ip:${req.ip}`;
}
```

### Performance Issues

**Cause**: Lua script execution time

**Solution**:
- Use pipeline for batch operations
- Consider read replicas for read-heavy workloads
- Profile with Redis SLOWLOG

```bash
redis-cli SLOWLOG GET 10
```

## Security Considerations

### 1. Prevent Bypass

- Rate limit before authentication
- Validate all headers used for identification
- Use signed tokens for user identification

### 2. Distributed Denial of Service (DDoS)

- Combine with upstream rate limiting (Cloudflare, nginx)
- Implement IP-based blocking for severe violations
- Use connection limits at load balancer

### 3. Credential Stuffing

- Strict limits on `/auth/login`
- Implement account lockout after N failures
- Monitor for distributed attacks across IPs

### 4. Data Exfiltration

- Rate limit data export endpoints heavily
- Log all bulk data access
- Require MFA for sensitive operations

## Performance Tuning

### Redis Optimization

```bash
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save ""  # Disable persistence for rate limiting DB
appendonly no
```

### Lua Script Optimization

- Pre-load scripts using SCRIPT LOAD
- Minimize operations in Lua
- Use pipelining for multiple checks

### Network Optimization

- Co-locate Redis with API servers
- Use Redis connection pooling
- Enable TCP keepalive

## Compliance

### GDPR

- Rate limit data accessible via `/api/admin/rate-limits/status`
- Implement data retention policies for violations
- Provide export functionality

### SOC 2

- Audit logging of all rate limit changes
- Regular review of violation patterns
- Incident response for abuse

### PCI DSS

- Strict rate limits on payment endpoints
- Enhanced monitoring for card testing
- Automatic blocking of suspicious patterns

## Rollback Plan

If issues occur:

1. **Immediate**: Disable via environment variable
   ```bash
   RATE_LIMIT_ENABLED=false
   ```

2. **Partial**: Increase limits to very high values
   ```bash
   RATE_LIMIT_MAX_REQUESTS=100000
   ```

3. **Complete**: Revert to previous middleware
   ```bash
   git revert <commit-hash>
   ```

## Support

- **Documentation**: `/docs/API_RATE_LIMITING.md`
- **Package README**: `/packages/rate-limiter/README.md`
- **Issues**: Open GitHub issue with label `rate-limiting`
- **Slack**: `#platform-security` channel

## Changelog

### 2025-01-15 - Initial Release

- Sliding window and token bucket algorithms
- Redis-based distributed storage
- Per-tier and per-endpoint policies
- Prometheus metrics
- Admin management API
- Comprehensive documentation
