# API Deprecation Quick Reference Card

> **Quick reference for API versioning and deprecation workflows**

## 🚀 Quick Start: Deprecate an Endpoint

```typescript
import { deprecated } from './middleware/deprecation';

app.get(
  '/api/old-endpoint',
  deprecated({
    sunsetDate: '2026-06-30T23:59:59Z',
    successorUrl: '/api/v2/new-endpoint',
    message: 'Optional custom message'
  }),
  handler
);
```

## 📅 Timeline Cheat Sheet

| Timeframe | Action | Example |
|-----------|--------|---------|
| **T+0** | Announce deprecation | Send email to all API consumers |
| **T+1 month** | Publish migration guide | Create docs with code examples |
| **T+3 months** | Send halfway reminder | Email active users |
| **T+5 months** | Send urgent warning | Email with "30 days left" message |
| **T+1 week** | Final critical notice | Emergency escalation |
| **T+6 months** | Replace with 410 Gone | Endpoint removed |

## 🏷️ Version Numbering

```
v{MAJOR}.{MINOR}.{PATCH}

v1.0.0 → v2.0.0  = BREAKING (new URL path /v2/)
v2.0.0 → v2.1.0  = ADDITIVE (same path, header version)
v2.1.0 → v2.1.1  = BUGFIX (no version change)
```

## 📋 Required Headers

### For Deprecated Endpoints

```http
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </api/v2/endpoint>; rel="successor-version"
Warning: 299 - "This endpoint is deprecated..."
```

### For Sunset Endpoints (410 Gone)

```json
{
  "error": "Gone",
  "message": "This endpoint has been removed.",
  "successorUrl": "/api/v2/endpoint",
  "documentation": "https://docs.internal/api/deprecations"
}
```

## 🔧 Code Snippets

### REST: Mark as Deprecated

```typescript
import { deprecated } from './middleware/deprecation';

router.get('/old', deprecated({
  sunsetDate: '2026-06-30T23:59:59Z',
  successorUrl: '/api/v2/new'
}), handler);
```

### REST: Mark as Sunset

```typescript
import { sunset } from './middleware/deprecation';

router.all('/removed', sunset({
  successorUrl: '/api/v2/new',
  message: 'Removed on 2025-12-31'
}));
```

### GraphQL: Deprecate Field

```graphql
type User {
  id: ID!
  username: String @deprecated(
    reason: "Use 'name' instead. Sunset: 2025-12-31"
  )
  name: String!
}
```

### GraphQL: Deprecate Query

```graphql
type Query {
  allUsers: [User!]! @deprecated(
    reason: "Use 'users' query with pagination. Sunset: 2025-12-31"
  )
  users(page: Int, pageSize: Int): UsersConnection!
}
```

### Client: Handle Deprecation

```typescript
import { getApiClient } from './services/api-client-with-deprecation';

const client = getApiClient();
const data = await client.fetch('/api/v2/endpoint');
// Automatically logs deprecation warnings
```

## 📊 Monitoring Queries

### Find Deprecated Endpoint Usage

```bash
# Log query (JSON logs)
cat server.log | jq 'select(.msg | contains("Deprecated endpoint accessed"))'

# Group by endpoint
cat server.log | jq -r 'select(.path) | .path' | sort | uniq -c | sort -rn
```

### Track Migration Progress

```sql
-- Example SQL for metrics database
SELECT
  path,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users
FROM api_logs
WHERE path LIKE '%/v1/%'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY path
ORDER BY request_count DESC;
```

## 📧 Email Templates (Ultra-Short)

### Initial Announcement

```
Subject: API Deprecation - Action Required by [DATE]

We're deprecating [ENDPOINT].
Sunset Date: [DATE]
Migrate to: [NEW_ENDPOINT]
Guide: [LINK]

Questions? Reply to this email.
```

### Final Warning (7 Days)

```
Subject: URGENT: API Removal in 7 Days

Your app uses [ENDPOINT] which will be removed in 7 days.

Last 24h: [COUNT] requests
Action: Migrate to [NEW_ENDPOINT] immediately
Guide: [LINK]

Need help? Contact us TODAY.
```

## ✅ Deprecation Checklist

**Before Deprecating:**
- [ ] Create v2 endpoint
- [ ] Write migration guide
- [ ] Set sunset date (3-6 months out)
- [ ] Add deprecation middleware

**During Deprecation:**
- [ ] Send announcement email
- [ ] Update API docs
- [ ] Monitor usage metrics
- [ ] Send reminders (3mo, 1mo, 1wk)

**At Sunset:**
- [ ] Replace with 410 Gone
- [ ] Archive old code
- [ ] Send completion notice

## 🚨 Red Flags

Watch out for these issues:

❌ **No version in URL** → Use `/api/service/v1/`
❌ **Silent breaking changes** → Add deprecation period
❌ **No migration guide** → Create docs with examples
❌ **Short notice (<3mo)** → Extend timeline
❌ **No usage tracking** → Add logging/metrics
❌ **Removing code immediately** → Archive for rollback

## 🔗 Quick Links

- **Full Strategy**: `docs/API_VERSIONING_DEPRECATION_STRATEGY.md`
- **Integration Guide**: `docs/INTEGRATION_EXAMPLE.md`
- **OpenAPI Example**: `maestro-orchestration-api.yaml`
- **Middleware Code**: `server/src/middleware/deprecation.ts`
- **GraphQL Plugin**: `server/src/graphql/plugins/deprecation-plugin.ts`

## 📞 Get Help

- **Slack**: #api-migrations
- **Email**: platform-engineering@company.com
- **Docs**: https://docs.internal/api/versioning

---

**Print this page and keep it handy! 📄**
