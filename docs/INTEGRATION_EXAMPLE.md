# API Versioning & Deprecation Integration Guide

This guide shows how to integrate the versioning and deprecation middleware into your Express application.

## Quick Start

### 1. Update Your Express App

**File:** `server/src/app.ts`

```typescript
import express from 'express';
import { apiVersionMiddleware } from './middleware/api-version';
import { deprecated, sunset } from './middleware/deprecation';

const app = express();

// Apply versioning middleware globally
app.use(apiVersionMiddleware);

// Example: Deprecated endpoint
app.get(
  '/api/maestro/v1/runs',
  deprecated({
    sunsetDate: '2025-12-31T23:59:59Z',
    successorUrl: '/api/maestro/v2/runs',
    message: 'Use v2 for paginated results and improved performance.'
  }),
  async (req, res) => {
    // Your v1 handler code
    const runs = await fetchRunsV1();
    res.json(runs);
  }
);

// Example: New v2 endpoint
app.get('/api/maestro/v2/runs', async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const result = await fetchRunsV2Paginated({ page, pageSize });
  res.json(result);
});

// Example: Sunset endpoint (already removed)
app.all(
  '/api/old-endpoint',
  sunset({
    successorUrl: '/api/new-endpoint',
    message: 'This endpoint was removed on 2024-12-31.'
  })
);
```

### 2. Update Your GraphQL Server

**File:** `server/src/index.ts` or `server/src/graphql/server.ts`

```typescript
import { ApolloServer } from '@apollo/server';
import { deprecationTrackingPlugin } from './graphql/plugins/deprecation-plugin';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    // Add deprecation tracking plugin
    deprecationTrackingPlugin({
      logUsage: true,
      trackMetrics: true
    }),
    // Your other plugins...
  ]
});
```

### 3. Update Your GraphQL Schema

**File:** `server/src/graphql/schema.ts`

```graphql
type Run {
  id: ID!

  # V2: Current field
  state: RunState!

  # V1: Deprecated field
  status: String @deprecated(
    reason: "Use 'state' field instead. Sunset: 2025-12-31"
  )

  # ... other fields
}

type Query {
  # V2: Current query
  runs(page: Int, pageSize: Int): RunsConnection!

  # V1: Deprecated query
  allRuns: [Run!]! @deprecated(
    reason: "Use 'runs' query with pagination instead. Sunset: 2025-12-31"
  )
}
```

### 4. Update Your Client

**File:** `client/src/main.tsx` or `client/src/App.tsx`

```typescript
import { getApiClient } from './services/api-client-with-deprecation';

// Initialize API client
const apiClient = getApiClient();

// Use in your components
async function fetchRuns() {
  const response = await apiClient.fetch('/api/maestro/v2/runs?page=1&pageSize=20');
  return response;
}
```

## Real-World Example: Router v2 Migration

Your codebase already has Router v2 alongside the old router. Here's how to apply this strategy:

### Step 1: Mark Router v1 as Deprecated

**File:** `server/src/conductor/router/router-v1.ts` (if exists) or update the old router

```typescript
import { deprecated } from '../../middleware/deprecation';

// Apply deprecation middleware to old router endpoints
router.post(
  '/api/conductor/v1/router/route-legacy',
  deprecated({
    sunsetDate: '2026-06-30T23:59:59Z',
    successorUrl: '/api/conductor/v2/router/route',
    message: 'Router v1 is deprecated. Migrate to v2 for ML-powered adaptive routing.'
  }),
  async (req, res) => {
    // Old router logic
  }
);
```

### Step 2: Ensure Router v2 is Production-Ready

**File:** `server/src/conductor/router/router-v2.ts`

Your v2 router already supports multiple modes:
- `shadow`: Run v2 alongside v1, compare results
- `canary`: Gradually roll out v2 to percentage of traffic
- `full`: Fully migrated to v2

```typescript
// Configure learning mode in your env or config
const routerConfig = {
  learningMode: process.env.ROUTER_LEARNING_MODE || 'shadow', // Start with shadow
  canaryPercentage: process.env.ROUTER_CANARY_PCT || 10,
  // ... other config
};
```

### Step 3: Monitor Usage

Add monitoring to track which clients are still using v1:

```typescript
import { logger } from '../../lib/logger';

// In your deprecated endpoint handler
logger.warn({
  path: req.path,
  userId: req.user?.id,
  tenantId: req.tenantId,
  userAgent: req.headers['user-agent']
}, 'Router v1 endpoint accessed');
```

### Step 4: Communication Plan

Use the templates from `docs/API_VERSIONING_DEPRECATION_STRATEGY.md` Section 4 to:

1. **Month 0**: Announce Router v2 and v1 deprecation
2. **Month 1-2**: Run in shadow mode, gather feedback
3. **Month 3**: Roll out canary (10% traffic)
4. **Month 4**: Increase canary to 50%
5. **Month 5**: Full migration to v2
6. **Month 6**: Remove v1 endpoints

## Testing Your Integration

### Test Deprecation Headers

```bash
# Test deprecated endpoint
curl -v http://localhost:4000/api/maestro/v1/runs

# Expected headers:
# Deprecation: true
# Sunset: Sat, 31 Dec 2025 23:59:59 GMT
# Link: </api/maestro/v2/runs>; rel="successor-version"
# Warning: 299 - "This endpoint is deprecated..."
```

### Test Version Header

```bash
# Request with specific API version
curl -H "API-Version: v2.1.0" http://localhost:4000/api/maestro/v2/runs

# Expected response header:
# API-Version: v2.1.0
```

### Test Sunset Endpoint

```bash
# Test removed endpoint
curl -v http://localhost:4000/api/old-endpoint

# Expected: 410 Gone with successor URL
```

### Test GraphQL Deprecation

```graphql
# Query with deprecated field
query {
  allRuns {
    id
    status  # Deprecated
  }
}

# Expected in response:
# {
#   "extensions": {
#     "deprecations": [
#       {
#         "field": "allRuns",
#         "reason": "Use 'runs' query with pagination instead. Sunset: 2025-12-31"
#       },
#       {
#         "field": "status",
#         "reason": "Use 'state' field instead. Sunset: 2025-12-31"
#       }
#     ]
#   }
# }
```

## Monitoring & Metrics

### Log Analysis

Query your logs to find deprecated endpoint usage:

```bash
# Using grep/jq on structured logs
cat server.log | jq 'select(.msg | contains("Deprecated endpoint accessed"))'

# Group by endpoint
cat server.log | jq -r 'select(.msg | contains("Deprecated")) | .path' | sort | uniq -c
```

### Metrics Dashboard

Track these metrics in your observability platform:

- **Deprecation Usage Rate**: `count(deprecated_endpoint_requests) / count(total_requests)`
- **Days Until Sunset**: Track countdown for each deprecated endpoint
- **Migration Progress**: `1 - (deprecated_requests / total_requests)`
- **Top Deprecated Endpoint Users**: Group by `userId` or `tenantId`

### Alerting

Set up alerts for:

1. **High Deprecated Usage Near Sunset**: Alert when usage > 10% and < 30 days until sunset
2. **New Deprecated Endpoint Access**: Alert on first access to deprecated endpoint per day
3. **Sunset Endpoint Access**: Alert immediately when 410 responses occur

## Migration Checklist

When deprecating an endpoint, use this checklist:

### Planning Phase
- [ ] Document breaking changes
- [ ] Create migration guide with code examples
- [ ] Set sunset date (minimum 3-6 months out)
- [ ] Identify affected clients/teams

### Implementation Phase
- [ ] Add deprecation middleware to old endpoint
- [ ] Implement new v2 endpoint
- [ ] Add tests for both endpoints
- [ ] Update OpenAPI spec with deprecation metadata
- [ ] Add monitoring for deprecated usage

### Communication Phase
- [ ] Send deprecation announcement email (use template)
- [ ] Post in Slack channels
- [ ] Update API documentation
- [ ] Set up support channel (#api-migrations)

### Migration Phase
- [ ] Monitor usage metrics
- [ ] Send reminders at 3 months, 1 month, 1 week
- [ ] Offer migration support/office hours
- [ ] Track migration progress per team

### Sunset Phase
- [ ] Send final warning 1 week before
- [ ] Replace endpoint handler with 410 sunset response
- [ ] Monitor 410 responses
- [ ] Archive old code (don't delete)

### Post-Sunset
- [ ] Send completion announcement
- [ ] Document lessons learned
- [ ] Update metrics dashboards

## Best Practices

### DO ✅

- **Always use semantic versioning** (major.minor.patch)
- **Give adequate notice** (minimum 3 months for internal, 6+ for external)
- **Provide clear migration paths** with code examples
- **Log all deprecated usage** for monitoring
- **Test both old and new versions** during transition
- **Communicate early and often** with stakeholders
- **Run shadow/canary deployments** for risky changes

### DON'T ❌

- **Don't break APIs without versioning** - Always use /v1/, /v2/, etc.
- **Don't remove endpoints without notice** - Follow deprecation lifecycle
- **Don't silently change behavior** - Use version bumps for breaking changes
- **Don't forget to track usage** - Monitor who's still using deprecated endpoints
- **Don't ignore feedback** - Provide support during migration
- **Don't delete old code immediately** - Archive for rollback capability

## Troubleshooting

### Issue: Clients not seeing deprecation warnings

**Solution:** Check that deprecation middleware is applied:

```typescript
// Ensure middleware runs before handler
app.get('/endpoint', deprecated({...}), handler);  // ✅ Correct
app.get('/endpoint', handler, deprecated({...}));  // ❌ Wrong order
```

### Issue: Version header not being set

**Solution:** Ensure `apiVersionMiddleware` is applied globally:

```typescript
// In app.ts, before route mounting
app.use(apiVersionMiddleware);
app.use('/api/maestro/v1', maestroV1Routes);
```

### Issue: GraphQL deprecation warnings not showing

**Solution:** Ensure plugin is registered:

```typescript
const server = new ApolloServer({
  plugins: [
    deprecationTrackingPlugin(),  // Add this
    // ... other plugins
  ]
});
```

### Issue: Sunset endpoint still being called

**Solution:**
1. Check logs to identify which clients are calling it
2. Send targeted communication to those teams
3. Consider temporary rate limiting for sunset endpoints
4. Provide emergency support for critical migrations

## Additional Resources

- **Full Strategy Document**: `docs/API_VERSIONING_DEPRECATION_STRATEGY.md`
- **OpenAPI Spec Example**: `maestro-orchestration-api.yaml`
- **Communication Templates**: Section 4 of strategy document
- **RFC 8594 (Sunset Header)**: https://datatracker.ietf.org/doc/html/rfc8594
- **RFC 7234 (Warning Header)**: https://datatracker.ietf.org/doc/html/rfc7234

## Support

- **Slack**: #api-migrations
- **Email**: platform-engineering@company.com
- **Office Hours**: Tuesdays & Thursdays, 2-3 PM
- **Documentation**: https://docs.internal/api/versioning

---

**Last Updated**: 2025-01-20
**Maintained By**: Platform Engineering Team
