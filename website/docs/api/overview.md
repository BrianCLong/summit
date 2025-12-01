---
sidebar_position: 1
---

# API Overview

Summit Platform provides three API types for different use cases.

## API Types

### 1. GraphQL API (Primary)

**Endpoint:** `http://localhost:4000/graphql`

The primary API for most operations. Provides:
- **40+ Operations**: Queries, mutations, and subscriptions
- **Type Safety**: Strongly typed schema
- **Efficient**: Request exactly what you need
- **Real-time**: WebSocket subscriptions for live updates
- **Introspection**: Self-documenting API

**Use for:**
- Entity and relationship CRUD
- Investigation management
- Complex queries with nested data
- Real-time collaboration features

[Learn more →](/docs/api/graphql/overview)

### 2. REST API

**Base URL:** `http://localhost:4000/api`

Complementary REST endpoints for specific operations:
- **40+ Endpoints**: Health checks, file operations, admin tasks
- **Standard HTTP**: Familiar REST patterns
- **Stateless**: Easy to cache and scale

**Use for:**
- Health monitoring
- File uploads/downloads
- Webhook integrations
- Administrative operations

[Learn more →](/docs/api/rest/overview)

### 3. WebSocket API

**Endpoint:** `ws://localhost:4000`

Real-time bidirectional communication:
- **Socket.io**: Based on Socket.io for reliability
- **GraphQL-WS**: GraphQL subscriptions over WebSocket
- **Event-driven**: Subscribe to specific events
- **Presence**: Track connected users

**Use for:**
- Real-time collaboration
- Live graph updates
- Presence indicators
- Notifications

[Learn more →](/docs/api/websocket)

## Authentication

All APIs use **JWT (JSON Web Tokens)** for authentication.

### Getting a Token

```bash
# Login via GraphQL
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token refreshToken user { id email name } } }",
    "variables": {
      "email": "user@example.com",
      "password": "your-password"
    }
  }'
```

Response:
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "user-123",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  }
}
```

### Using the Token

Include the token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Examples:**

```bash
# GraphQL
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id email name } }"}'

# REST
curl http://localhost:4000/api/investigations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get a new one:

```graphql
mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    token
    refreshToken
  }
}
```

[Learn more about authentication →](/docs/api/authentication)

## Rate Limiting

Summit implements rate limiting to prevent abuse:

| Environment | Window | Max Requests |
|-------------|--------|--------------|
| Development | 15 min | Unlimited |
| Production | 15 min | 1000 |
| GraphQL | 15 min | 500 |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1635724800
```

**When Limited:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 5 minutes.",
  "retryAfter": 300
}
```

## Error Handling

### GraphQL Errors

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "locations": [{"line": 2, "column": 3}],
      "path": ["entity"],
      "extensions": {
        "code": "NOT_FOUND",
        "entityId": "entity-123"
      }
    }
  ],
  "data": {
    "entity": null
  }
}
```

**Error Codes:**
- `UNAUTHENTICATED`: Missing or invalid auth token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource doesn't exist
- `BAD_USER_INPUT`: Validation error
- `INTERNAL_SERVER_ERROR`: Server error

### REST Errors

```json
{
  "error": "Not Found",
  "message": "Investigation not found",
  "statusCode": 404,
  "details": {
    "investigationId": "inv-123"
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limited
- `500 Internal Server Error`: Server error

## API Playground

### GraphQL Playground

Access the interactive GraphQL playground:

```
http://localhost:4000/graphql
```

Features:
- **Query Editor**: Write and test queries
- **Documentation**: Browse schema docs
- **History**: View past queries
- **Variables**: Test with different inputs
- **Headers**: Set authorization headers

### Postman Collection

Download the complete Postman collection:

[Download Postman Collection](/postman/Summit_API_Collection.json)

Includes:
- Pre-configured requests for all endpoints
- Environment variables
- Authentication flows
- Example requests and responses

## SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @summit/client
```

```typescript
import { SummitClient } from '@summit/client';

const client = new SummitClient({
  url: 'http://localhost:4000/graphql',
  token: 'YOUR_JWT_TOKEN'
});

// Query entities
const entities = await client.entities.list();

// Create investigation
const investigation = await client.investigations.create({
  name: 'My Investigation',
  description: 'Description'
});
```

### Python

```bash
pip install summit-client
```

```python
from summit import SummitClient

client = SummitClient(
    url='http://localhost:4000/graphql',
    token='YOUR_JWT_TOKEN'
)

# Query entities
entities = client.entities.list()

# Create investigation
investigation = client.investigations.create(
    name='My Investigation',
    description='Description'
)
```

[View all SDKs →](/docs/examples/overview)

## API Versioning

Summit uses **URL versioning** for breaking changes:

- `/api/v1/*` - Current version
- `/api/v2/*` - Future version

GraphQL uses **schema evolution** instead of versioning:
- Fields are deprecated (not removed)
- New fields are added alongside old ones
- Clients request specific fields they need

## Best Practices

### 1. Use GraphQL for Complex Queries

❌ **Don't** make multiple REST calls:
```bash
curl /api/investigations/123
curl /api/entities?investigationId=123
curl /api/relationships?investigationId=123
```

✅ **Do** use GraphQL to fetch everything at once:
```graphql
query GetInvestigation($id: ID!) {
  investigation(id: $id) {
    id
    name
    entities { id type props }
    relationships { id type from to }
  }
}
```

### 2. Request Only What You Need

❌ **Don't** fetch all fields:
```graphql
query { entities { id type props metadata createdAt updatedAt ... } }
```

✅ **Do** request specific fields:
```graphql
query { entities { id type props } }
```

### 3. Use Persisted Queries in Production

```typescript
// Instead of sending full query text
const QUERY_ID = 'get-investigation-abc123';

client.query({
  queryId: QUERY_ID,
  variables: { id: '123' }
});
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await client.query({ query: GET_ENTITIES });
} catch (error) {
  if (error.extensions?.code === 'UNAUTHENTICATED') {
    // Refresh token or redirect to login
  } else if (error.extensions?.code === 'NOT_FOUND') {
    // Show 404 page
  } else {
    // Show generic error
  }
}
```

### 5. Implement Retry Logic

```typescript
const fetchWithRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      if (error.extensions?.code === 'RATE_LIMITED') {
        await sleep(error.retryAfter * 1000);
      }
    }
  }
};
```

## API Limits

| Limit | Value |
|-------|-------|
| Max query depth | 10 levels |
| Max query complexity | 1000 points |
| Max file upload size | 100 MB |
| Max batch size | 100 items |
| WebSocket connections | 1000 concurrent |

## Next Steps

- 📘 [GraphQL API Guide](/docs/api/graphql/overview)
- 🔌 [REST API Reference](/docs/api/rest/overview)
- 🔐 [Authentication Details](/docs/api/authentication)
- 💡 [Code Examples](/docs/examples/overview)

## Need Help?

- 🐛 [Report API issues](https://github.com/BrianCLong/summit/issues)
- 💬 [API discussions](https://github.com/BrianCLong/summit/discussions)
- 📧 Email: api@summit.com
