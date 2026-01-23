# GraphQL Query Cost Analysis & Dynamic Rate Limiting

## Overview

The GraphQL Cost Analysis & Rate Limiting system protects the GraphQL API from abusive or overly expensive queries while ensuring fair-use per tenant/user and preserving normal workloads.

## Architecture

### Components

1. **CostCalculator** (`server/src/graphql/services/CostCalculator.ts`)
   - Pluggable cost calculator with configurable field/type weights
   - Hot-reloadable configuration via Redis
   - Supports nested selections, fragments, and list multipliers

2. **TenantRateLimitService** (`server/src/graphql/services/TenantRateLimitService.ts`)
   - Per-tenant cost tracking with tier-based limits
   - Multiple limit windows: per-query, per-minute, per-hour
   - Per-user limits within tenant quotas
   - Redis-backed with automatic rollback on limit violations

3. **GraphQLCostPlugin** (`server/src/graphql/plugins/graphqlCostPlugin.ts`)
   - Apollo Server plugin that intercepts queries before execution
   - Computes cost, checks limits, rejects over-limit queries
   - Returns typed errors with detailed limit information

4. **Cost Configuration** (`server/src/config/graphql-cost-config.json`)
   - JSON-based configuration for field/type cost weights
   - Tenant tier definitions (free, starter, pro, enterprise)
   - Per-tenant overrides for custom limits

## Configuration

### Environment Variables

```bash
# Enable/disable cost limit enforcement
ENFORCE_GRAPHQL_COST_LIMITS=true

# Path to custom cost configuration (optional)
GRAPHQL_COST_CONFIG_PATH=/path/to/config.json

# Comma-separated list of exempt tenant IDs
COST_EXEMPT_TENANTS=tenant-test,tenant-internal
```

### Cost Configuration File

The cost configuration is defined in `server/src/config/graphql-cost-config.json`:

```json
{
  "version": "1.0.0",
  "defaultCosts": {
    "baseField": 1,
    "baseListItem": 1,
    "baseNestedLevel": 2
  },
  "typeCosts": {
    "Query": {
      "user": 5,
      "users": 10,
      "search": 50,
      "analytics": 100
    }
  },
  "tenantTiers": {
    "free": {
      "maxCostPerQuery": 500,
      "maxCostPerMinute": 5000,
      "maxCostPerHour": 50000
    },
    "pro": {
      "maxCostPerQuery": 2000,
      "maxCostPerMinute": 50000,
      "maxCostPerHour": 1000000
    }
  }
}
```

### Hot-Reloading Configuration

Configuration can be updated at runtime by storing it in Redis:

```typescript
import { getCostCalculator } from './graphql/services/CostCalculator.js';

const calculator = await getCostCalculator();
await calculator.updateConfig(newConfig);
```

The configuration is automatically reloaded every minute from Redis.

## Cost Calculation

### Base Costs

Each field has a base cost defined in the configuration:

```graphql
query {
  user(id: "1") {     # Cost: 5 (from typeCosts.Query.user)
    id                 # Cost: 1 (baseField)
    name               # Cost: 1 (baseField)
  }
}
# Total: 7
```

### List Multipliers

List fields are multiplied by the `limit` argument:

```graphql
query {
  users(limit: 10) {  # Base cost: 10, multiplied by limit
    id
    name
  }
}
# Total: 10 * 10 + (2 * 10) = 120
```

### Nested Queries

Nested fields accumulate costs:

```graphql
query {
  user(id: "1") {           # Cost: 5
    posts(limit: 5) {        # Cost: 5 * 5 = 25
      comments(limit: 2) {   # Cost: 5 * 5 * 2 = 50
        text
      }
    }
  }
}
# Total: 5 + 25 + 50 + nested fields = ~85
```

### Argument Multipliers

Certain arguments increase query cost:

```graphql
query {
  search(query: "test", fullText: true) {  # Base: 50, fullText: 2x
    id
    name
  }
}
# Total: 50 * 2 = 100
```

### Fragment Support

Fragments are properly accounted for:

```graphql
fragment UserFields on User {
  id
  name
  email
}

query {
  user(id: "1") {
    ...UserFields      # All fragment fields counted
    posts(limit: 5) {
      id
    }
  }
}
```

## Rate Limiting

### Multi-Tier Limits

Each tenant tier has three types of limits:

1. **Per-Query Limit**: Maximum cost for a single query
2. **Per-Minute Limit**: Maximum total cost per minute
3. **Per-Hour Limit**: Maximum total cost per hour

### Tenant Tiers

| Tier       | Per-Query | Per-Minute | Per-Hour  |
|------------|-----------|------------|-----------|
| Free       | 500       | 5,000      | 50,000    |
| Starter    | 1,000     | 20,000     | 200,000   |
| Pro        | 2,000     | 50,000     | 1,000,000 |
| Enterprise | 5,000     | 200,000    | 5,000,000 |

### Per-User Limits

Within a tenant's quota, individual users are limited to 30% of the tenant's per-minute limit to prevent single user abuse.

### Tenant Overrides

Specific tenants can have custom limits defined in the configuration:

```json
{
  "tenantOverrides": {
    "tenant-vip-123": {
      "maxCostPerQuery": 10000,
      "maxCostPerMinute": 500000,
      "maxCostPerHour": 10000000
    }
  }
}
```

## Error Responses

When a query exceeds cost limits, a detailed error is returned:

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded for your organization (cost: 150). You have used your per-minute quota of 5000 cost points. Remaining capacity: 0. Retry after 45 seconds.",
      "extensions": {
        "code": "GRAPHQL_COST_LIMIT_EXCEEDED",
        "cost": 150,
        "limit": 500,
        "remaining": 0,
        "reset": 1706904123456,
        "resetHint": "2024-02-02T12:15:23.456Z",
        "retryAfter": 45,
        "reason": "TENANT_RATE_LIMIT_EXCEEDED",
        "tier": "free",
        "limits": {
          "perQuery": 500,
          "perMinute": 5000,
          "perHour": 50000
        }
      }
    }
  ]
}
```

### Error Codes

- `QUERY_TOO_EXPENSIVE`: Single query exceeds per-query limit
- `TENANT_RATE_LIMIT_EXCEEDED`: Tenant exceeded per-minute limit
- `TENANT_HOURLY_LIMIT_EXCEEDED`: Tenant exceeded per-hour limit
- `USER_RATE_LIMIT_EXCEEDED`: User exceeded personal limit

## Observability

### Prometheus Metrics

The system emits the following metrics:

```
# Query cost distribution
graphql_query_cost_total{tenant_id, operation_name, operation_type}

# Limit violations
graphql_cost_limit_exceeded_total{tenant_id, reason, tier}

# Remaining capacity
graphql_cost_limit_remaining{tenant_id, tier}

# Tenant usage
graphql_tenant_cost_usage_total{tenant_id, tier, user_id}

# Rate limit hits
graphql_cost_rate_limit_hits_total{tenant_id, limit_type, tier}

# Overage counts
graphql_per_tenant_overage_count_total{tenant_id, tier}
```

### Structured Logging

Over-limit events are logged with detailed context:

```json
{
  "level": "warn",
  "msg": "GraphQL query rejected: cost limit exceeded",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "tier": "free",
  "operationName": "GetUserData",
  "operationType": "query",
  "cost": 2500,
  "reason": "QUERY_TOO_EXPENSIVE",
  "limits": { "perQuery": 500, "perMinute": 5000, "perHour": 50000 },
  "remaining": { "perMinute": 2500, "perHour": 47500 },
  "signature": "a3f2c1b4e5d6a7b8",
  "query": "query GetUserData { users(limit: 100) { ... } }"
}
```

## Testing

### Unit Tests

Run unit tests for the cost calculator:

```bash
npm test -- CostCalculator.test.ts
```

### Integration Tests

Run integration tests for the plugin:

```bash
npm test -- graphqlCostPlugin.test.ts
```

### Manual Testing

Test cost calculation with different queries:

```bash
# Enable debug logging
NODE_ENV=development npm start

# Execute test queries via GraphQL playground
# Check logs for cost calculations
```

## Deployment

### Production Checklist

- [ ] Set `ENFORCE_GRAPHQL_COST_LIMITS=true`
- [ ] Configure Redis for hot-reloadable config
- [ ] Set appropriate tenant tiers in database
- [ ] Configure Prometheus scraping for new metrics
- [ ] Set up alerts for high overage rates
- [ ] Test with production-like query load

### Rollout Strategy

1. **Phase 1 - Warn Mode** (Week 1)
   - Deploy with `ENFORCE_GRAPHQL_COST_LIMITS=false`
   - Monitor metrics and logs for false positives
   - Adjust cost weights if needed

2. **Phase 2 - Soft Launch** (Week 2)
   - Enable enforcement for new tenants only
   - Monitor impact on existing workloads
   - Collect feedback from users

3. **Phase 3 - Full Rollout** (Week 3)
   - Enable enforcement for all tenants
   - Provide self-service tier upgrades
   - Monitor and adjust limits based on usage patterns

## Troubleshooting

### Common Issues

**Issue**: Legitimate queries being rejected

**Solution**:
- Check query cost with debug logging
- Adjust field weights in configuration
- Consider increasing tenant tier limits
- Add tenant to override list if needed

**Issue**: Redis unavailable, rate limiting fails open

**Solution**:
- Check Redis connection health
- System automatically fails open to prevent outages
- Monitor rate limit check errors in metrics

**Issue**: Configuration changes not taking effect

**Solution**:
- Verify Redis is available
- Check configuration is valid JSON
- Wait up to 1 minute for automatic reload
- Force reload by restarting servers

## Future Enhancements

- [ ] GraphQL persisted queries for lower cost
- [ ] Cost estimation before execution (dry-run mode)
- [ ] Tenant-facing cost dashboard
- [ ] Automatic tier recommendations based on usage
- [ ] Cost-based query optimization suggestions
- [ ] Integration with billing system for overage charges
