# API Gateway Platform - Complete Guide

## Overview

The Summit API Gateway Platform is an enterprise-grade API management solution designed specifically for intelligence operations. It provides comprehensive routing, authentication, rate limiting, monitoring, and developer portal capabilities that surpass specialized API management tools.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Features](#core-features)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Authentication](#authentication)
6. [Rate Limiting](#rate-limiting)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Developer Portal](#developer-portal)
9. [Best Practices](#best-practices)

## Architecture

The API Gateway Platform consists of several integrated packages:

### Core Packages

- **@summit/api-gateway** - Core gateway with intelligent routing and load balancing
- **@summit/authentication** - OAuth 2.0, JWT, API keys, and mTLS support
- **@summit/rate-limiting** - Distributed rate limiting with multiple strategies
- **@summit/api-management** - API versioning and lifecycle management
- **@summit/api-analytics** - Real-time metrics and monitoring

### Services

- **gateway-service** - Main gateway service orchestrating all components
- **api-portal-service** - Developer portal with API documentation and testing

## Core Features

### 1. Intelligent Request Routing

The gateway supports multiple routing strategies:

```typescript
import { APIGateway, Route } from '@summit/api-gateway';

const gateway = new APIGateway({
  routes: [
    {
      path: '/api/v1/investigations/*',
      method: ['GET', 'POST'],
      backends: [
        { url: 'http://backend1:3000', weight: 2 },
        { url: 'http://backend2:3000', weight: 1 },
      ],
    },
  ],
  loadBalancing: {
    strategy: 'weighted-round-robin',
    healthCheckInterval: 30000,
  },
});
```

**Supported Load Balancing Strategies:**
- Round Robin
- Weighted Round Robin
- Least Connections
- Random
- IP Hash

### 2. Circuit Breaker Pattern

Prevents cascading failures with automatic circuit breaking:

```typescript
const gateway = new APIGateway({
  circuitBreaker: {
    threshold: 5, // Open circuit after 5 failures
    timeout: 60000, // Wait 60s before trying again
    resetTimeout: 30000, // Stay in half-open for 30s
  },
});
```

**Circuit States:**
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service unavailable, requests fail fast
- **HALF_OPEN**: Testing if service recovered

### 3. Protocol Support

Handles multiple protocols seamlessly:

- HTTP/HTTPS
- WebSocket
- gRPC
- HTTP/2

```typescript
import { ProtocolHandler, Protocol } from '@summit/api-gateway';

const protocolHandler = new ProtocolHandler({
  supportedProtocols: [Protocol.HTTP, Protocol.HTTPS, Protocol.WEBSOCKET],
  websocket: {
    enabled: true,
    pingInterval: 30000,
  },
});
```

## Quick Start

### Installation

```bash
# Install core packages
pnpm add @summit/api-gateway @summit/authentication @summit/rate-limiting

# Or install everything
pnpm add @summit/api-platform
```

### Basic Setup

```typescript
import { APIGateway } from '@summit/api-gateway';
import { JWTManager } from '@summit/authentication';
import { RedisRateLimiter } from '@summit/rate-limiting';

// 1. Setup Authentication
const jwtManager = new JWTManager({
  secret: process.env.JWT_SECRET!,
  issuer: 'summit-api',
  expiresIn: '15m',
});

// 2. Setup Rate Limiting
const rateLimiter = new RedisRateLimiter({
  redis: {
    host: 'localhost',
    port: 6379,
  },
  windowMs: 60 * 1000,
  maxRequests: 100,
});

// 3. Setup Gateway
const gateway = new APIGateway({
  port: 8080,
  routes: [
    {
      path: '/api/*',
      backends: [{ url: 'http://api-server:3000' }],
    },
  ],
});

// Start gateway
await gateway.start();
```

## Configuration

### Environment Variables

```bash
# Gateway Configuration
GATEWAY_PORT=8080
GATEWAY_HOST=0.0.0.0

# Authentication
JWT_SECRET=your-secret-key
JWT_ISSUER=summit-api
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret

# Rate Limiting
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
TRACING_ENABLED=true
```

### Route Configuration

```typescript
const routes: Route[] = [
  {
    path: '/api/v1/investigations',
    method: 'GET',
    backends: [
      { url: 'http://investigations-service:3000' },
    ],
    rateLimit: {
      requests: 100,
      window: 60000, // 1 minute
    },
    cache: {
      enabled: true,
      ttl: 300, // 5 minutes
    },
    version: 'v1',
  },
];
```

## Authentication

### JWT Authentication

```typescript
import { JWTManager, TokenPayload } from '@summit/authentication';

const jwtManager = new JWTManager({
  secret: process.env.JWT_SECRET!,
  algorithm: 'HS256',
  issuer: 'summit-api',
  audience: 'summit-users',
  expiresIn: '15m',
  refreshExpiresIn: '7d',
});

// Generate tokens
const payload: TokenPayload = {
  sub: 'user123',
  email: 'analyst@summit.gov',
  roles: ['analyst'],
  scopes: ['investigations:read', 'entities:read'],
};

const { accessToken, refreshToken } = jwtManager.generateTokenPair(payload);

// Verify tokens
const verified = jwtManager.verifyAccessToken(accessToken);
```

### OAuth 2.0 Flow

```typescript
import { OAuthProvider, GrantType } from '@summit/authentication';

const oauth = new OAuthProvider({
  clientId: process.env.OAUTH_CLIENT_ID!,
  clientSecret: process.env.OAUTH_CLIENT_SECRET!,
  redirectUri: 'https://summit.gov/callback',
  authorizationEndpoint: 'https://auth.summit.gov/authorize',
  tokenEndpoint: 'https://auth.summit.gov/token',
  scopes: ['investigations:read', 'investigations:write'],
  usePKCE: true,
});

// Authorization URL
const authUrl = oauth.generateAuthorizationUrl(
  ['investigations:read'],
  'random-state'
);

// Exchange code for token
const tokens = await oauth.exchangeCodeForToken({
  grantType: GrantType.AUTHORIZATION_CODE,
  code: 'auth-code',
  clientId: oauth.clientId,
  redirectUri: oauth.redirectUri,
});
```

### API Key Management

```typescript
import { APIKeyManager } from '@summit/authentication';

const apiKeyManager = new APIKeyManager();

// Create API key
const { apiKey, key } = apiKeyManager.createAPIKey({
  name: 'Integration Service Key',
  userId: 'service123',
  scopes: ['api:read'],
  expiresIn: 365 * 24 * 60 * 60 * 1000, // 1 year
  rateLimit: {
    requests: 1000,
    window: 60000,
  },
});

// Validate API key
const validated = apiKeyManager.validateAPIKey(key);
```

### RBAC (Role-Based Access Control)

```typescript
import { RBACManager } from '@summit/authentication';

const rbac = new RBACManager();

// Define roles
rbac.defineRole({
  name: 'analyst',
  permissions: [
    { resource: 'investigations', action: 'read' },
    { resource: 'investigations', action: 'create' },
    { resource: 'entities', action: 'read' },
  ],
});

// Assign roles
rbac.assignRole('user123', 'analyst');

// Check permissions
const hasPermission = rbac.hasPermission('user123', 'investigations', 'read');
```

## Rate Limiting

### Strategy Selection

Choose the right strategy for your use case:

#### Fixed Window
Best for: Simple rate limiting with predictable reset times

```typescript
import { FixedWindowLimiter } from '@summit/rate-limiting';

const limiter = new FixedWindowLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});
```

#### Sliding Window
Best for: More accurate rate limiting without edge case bursts

```typescript
import { SlidingWindowLimiter } from '@summit/rate-limiting';

const limiter = new SlidingWindowLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});
```

#### Token Bucket
Best for: Allowing bursts while maintaining average rate

```typescript
import { TokenBucketLimiter } from '@summit/rate-limiting';

const limiter = new TokenBucketLimiter({
  bucketSize: 100,
  refillRate: 10, // 10 tokens per second
  windowMs: 60 * 1000,
  maxRequests: 100,
});
```

### Distributed Rate Limiting

For multi-instance deployments, use Redis-based rate limiting:

```typescript
import { RedisRateLimiter } from '@summit/rate-limiting';
import Redis from 'ioredis';

const redis = new Redis({
  host: 'redis.summit.gov',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
});

const limiter = new RedisRateLimiter({
  redis,
  windowMs: 60 * 1000,
  maxRequests: 1000,
  keyPrefix: 'summit:ratelimit',
});
```

### Rate Limit Policies

Define tiered rate limit policies:

```typescript
import { RateLimitPolicyManager } from '@summit/rate-limiting';

const policyManager = new RateLimitPolicyManager();

// Initialize default policies
policyManager.initializeDefaultPolicies();

// Assign policies
policyManager.assignClientPolicy('client123', 'professional');
policyManager.assignRoutePolicy('/api/search', 'basic');
```

## Monitoring & Analytics

### Real-time Metrics

```typescript
import { MetricsCollector } from '@summit/api-analytics';

const metrics = new MetricsCollector();

// Record requests
metrics.recordRequest(duration, statusCode, {
  route: '/api/investigations',
  method: 'GET',
});

// Get aggregated metrics
const stats = metrics.getAggregatedMetrics(60000); // Last minute
console.log(stats);
// {
//   requests: { total: 1250, successful: 1200, failed: 50, ratePerSecond: 20.8 },
//   latency: { min: 10, max: 500, avg: 85, p50: 75, p95: 250, p99: 450 },
//   errors: { total: 50, byStatusCode: { 500: 30, 503: 20 }, rate: 0.83 }
// }
```

### Performance Tracking

Track API performance and SLA compliance:

```typescript
import { PerformanceTracker } from '@summit/api-analytics';

const tracker = new PerformanceTracker({
  sla: {
    p95Latency: 200, // 200ms
    errorRate: 0.01, // 1%
    availability: 0.999, // 99.9%
  },
});

tracker.recordRequest('/api/investigations', 150, 200);
const slaStatus = tracker.getSLAStatus();
```

## Developer Portal

The API Gateway includes a self-service developer portal:

### Features

1. **Interactive API Explorer** - Test APIs directly from the browser
2. **Auto-generated Documentation** - OpenAPI/Swagger docs
3. **API Key Management** - Self-service API key creation
4. **Usage Analytics** - View your API usage and limits
5. **Code Samples** - Copy-paste ready code in multiple languages
6. **Sandbox Environment** - Test APIs without affecting production

### Accessing the Portal

```
https://api.summit.gov/portal
```

## Best Practices

### 1. Security

- Always use HTTPS in production
- Rotate JWT secrets regularly
- Implement mTLS for service-to-service communication
- Use short-lived access tokens with refresh tokens
- Enable request validation and sanitization

### 2. Performance

- Enable response caching for read-heavy endpoints
- Use appropriate rate limiting strategy for your traffic pattern
- Configure circuit breakers to prevent cascading failures
- Monitor latency and set up alerts

### 3. Reliability

- Deploy multiple gateway instances behind a load balancer
- Use distributed rate limiting with Redis for multi-instance setups
- Implement health checks for backend services
- Set up proper retry policies with exponential backoff

### 4. Monitoring

- Enable structured logging with correlation IDs
- Track key metrics: latency, error rate, throughput
- Set up alerts for SLA violations
- Use distributed tracing for complex request flows

### 5. API Design

- Use semantic versioning (v1, v2, etc.)
- Provide clear deprecation notices
- Document breaking changes
- Maintain backward compatibility when possible
- Use appropriate HTTP status codes

## Support

For issues, questions, or contributions:

- GitHub: https://github.com/summit/api-gateway
- Documentation: https://docs.summit.gov/api-gateway
- Email: api-support@summit.gov

## License

Copyright © 2025 Summit Intelligence Platform. All rights reserved.
