# API Best Practices

## Overview

This guide outlines best practices for using the Summit API Gateway effectively and securely for intelligence operations.

## API Design

### 1. RESTful Principles

Follow REST conventions for predictable, intuitive APIs:

**Resource Naming:**
```
Good:
  GET /api/v1/investigations
  GET /api/v1/investigations/123
  POST /api/v1/investigations
  PUT /api/v1/investigations/123
  DELETE /api/v1/investigations/123

Avoid:
  GET /api/v1/getInvestigation?id=123
  POST /api/v1/createInvestigation
  POST /api/v1/investigation/delete
```

**Use HTTP Methods Correctly:**
- `GET` - Retrieve resources (idempotent)
- `POST` - Create new resources
- `PUT` - Update entire resource (idempotent)
- `PATCH` - Partial update
- `DELETE` - Remove resource (idempotent)

### 2. Versioning

Always version your APIs:

```
/api/v1/investigations  ✓
/api/investigations     ✗
```

**Version in URL** (Recommended):
```
GET /api/v1/investigations
GET /api/v2/investigations
```

**Version in Header** (Alternative):
```
GET /api/investigations
Accept-Version: v1
```

### 3. Pagination

Paginate large result sets:

```bash
GET /api/v1/investigations?page=1&limit=50

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25
  }
}
```

### 4. Filtering and Sorting

```bash
# Filtering
GET /api/v1/investigations?status=active&priority=high

# Sorting
GET /api/v1/investigations?sort=-createdAt,+title

# Combined
GET /api/v1/investigations?status=active&sort=-priority&limit=20
```

### 5. Field Selection

Allow clients to request specific fields:

```bash
GET /api/v1/investigations?fields=id,title,status,createdAt
```

## Security

### 1. Authentication

**Always authenticate requests:**

```javascript
// Good
const response = await fetch('/api/v1/investigations', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Bad - No authentication
const response = await fetch('/api/v1/investigations');
```

### 2. Use HTTPS

**Production:**
```
https://api.summit.gov  ✓
http://api.summit.gov   ✗
```

### 3. Validate Input

Always validate and sanitize input:

```typescript
// Input validation
const schema = {
  title: { type: 'string', minLength: 1, maxLength: 200 },
  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
  assignedTo: { type: 'string', format: 'uuid' },
};

// Sanitize HTML
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 4. Rate Limiting

Respect rate limits:

```javascript
// Check rate limit headers
const remaining = response.headers.get('RateLimit-Remaining');
const resetTime = response.headers.get('RateLimit-Reset');

if (remaining === '0') {
  const wait = new Date(resetTime) - new Date();
  await sleep(wait);
}
```

### 5. API Keys

**Secure API key storage:**

```bash
# Good - Environment variable
export SUMMIT_API_KEY="sk_live_..."

# Bad - Hardcoded
const apiKey = "sk_live_...";
```

## Performance

### 1. Caching

Leverage HTTP caching:

```bash
# Response with caching
HTTP/1.1 200 OK
Cache-Control: max-age=300
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 15 Nov 2023 12:45:26 GMT
```

**Client-side caching:**

```javascript
// Check ETag
const response = await fetch('/api/v1/investigations/123', {
  headers: {
    'If-None-Match': storedETag
  }
});

if (response.status === 304) {
  // Use cached version
  return getCachedData();
}
```

### 2. Compression

Enable compression for large responses:

```javascript
const response = await fetch('/api/v1/investigations', {
  headers: {
    'Accept-Encoding': 'gzip, deflate, br'
  }
});
```

### 3. Batch Requests

Reduce round trips with batch operations:

```bash
# Instead of multiple requests
POST /api/v1/investigations/batch
{
  "operations": [
    {"method": "GET", "path": "/investigations/123"},
    {"method": "GET", "path": "/investigations/456"},
    {"method": "POST", "path": "/investigations", "body": {...}}
  ]
}
```

### 4. Pagination Strategy

```javascript
// Cursor-based pagination for large datasets
GET /api/v1/investigations?cursor=eyJpZCI6MTIzfQ&limit=50

Response:
{
  "data": [...],
  "nextCursor": "eyJpZCI6MTczfQ",
  "hasMore": true
}
```

## Error Handling

### 1. Use Appropriate Status Codes

```
200 OK - Success
201 Created - Resource created
204 No Content - Success with no response body
400 Bad Request - Invalid input
401 Unauthorized - Missing/invalid authentication
403 Forbidden - Insufficient permissions
404 Not Found - Resource doesn't exist
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Server error
503 Service Unavailable - Service down/maintenance
```

### 2. Structured Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      },
      {
        "field": "priority",
        "message": "Priority must be one of: low, medium, high, critical"
      }
    ],
    "requestId": "req_abc123xyz",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

### 3. Retry Logic

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      if (response.ok) {
        return response;
      }

      // Retry server errors (5xx)
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

## Monitoring and Logging

### 1. Request IDs

Include request IDs for tracking:

```javascript
const requestId = crypto.randomUUID();

const response = await fetch('/api/v1/investigations', {
  headers: {
    'X-Request-ID': requestId
  }
});

console.log(`Request ${requestId}: ${response.status}`);
```

### 2. Structured Logging

```javascript
logger.info('API request', {
  method: 'POST',
  path: '/api/v1/investigations',
  requestId,
  userId: user.id,
  duration: 150,
  statusCode: 201,
});
```

### 3. Metrics Collection

Track key metrics:
- Request rate
- Error rate
- Latency (p50, p95, p99)
- Success rate
- Rate limit hits

## API Lifecycle

### 1. Deprecation Notice

Give advance notice for deprecations:

```bash
# Response header
Sunset: Wed, 01 Jun 2025 12:00:00 GMT
Warning: 299 - "This API version will be deprecated on 2025-06-01"
```

### 2. Backward Compatibility

Maintain backward compatibility:

```json
// v1 response
{
  "id": "123",
  "name": "Investigation Alpha"
}

// v2 response (adds field, doesn't remove)
{
  "id": "123",
  "name": "Investigation Alpha",
  "classification": "SECRET"
}
```

### 3. Migration Path

Provide clear migration guides:

```markdown
## Migrating from v1 to v2

### Breaking Changes
1. `status` field renamed to `state`
2. Date format changed to ISO 8601

### Migration Steps
1. Update status field references
2. Update date parsing logic
3. Test with v2 sandbox
4. Deploy to production
```

## Testing

### 1. Use Sandbox Environment

Test against sandbox before production:

```javascript
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://api.summit.gov'
  : 'https://api-sandbox.summit.gov';
```

### 2. Integration Tests

```typescript
describe('Investigation API', () => {
  it('should create investigation', async () => {
    const response = await client.post('/api/v1/investigations', {
      title: 'Test Investigation',
      priority: 'high',
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.title).toBe('Test Investigation');
  });

  it('should handle rate limiting', async () => {
    // Make requests up to limit
    for (let i = 0; i < 100; i++) {
      await client.get('/api/v1/investigations');
    }

    // Next request should be rate limited
    try {
      await client.get('/api/v1/investigations');
      fail('Should have been rate limited');
    } catch (error) {
      expect(error.response.status).toBe(429);
      expect(error.response.headers).toHaveProperty('retry-after');
    }
  });
});
```

## SDK Usage

### 1. Official SDKs

Use official SDKs when available:

```bash
# JavaScript/TypeScript
npm install @summit/api-client

# Python
pip install summit-api

# Go
go get github.com/summit/go-sdk
```

### 2. Custom Clients

When building custom clients:

```typescript
class SummitAPI {
  private baseURL: string;
  private apiKey: string;

  constructor(config: { apiKey: string; baseURL?: string }) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.summit.gov';
  }

  private async request(method: string, path: string, data?: any) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'summit-sdk/1.0.0',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new APIError(response);
    }

    return response.json();
  }

  async getInvestigation(id: string) {
    return this.request('GET', `/api/v1/investigations/${id}`);
  }
}
```

## Documentation

### 1. Use OpenAPI/Swagger

Provide machine-readable API specifications:

```yaml
openapi: 3.0.0
info:
  title: Summit API
  version: 1.0.0
paths:
  /api/v1/investigations:
    get:
      summary: List investigations
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvestigationList'
```

### 2. Code Examples

Include code examples in documentation:

```markdown
## Create Investigation

```bash
curl -X POST https://api.summit.gov/api/v1/investigations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Operation Nightfall",
    "priority": "high"
  }'
```

### 3. Interactive Documentation

Provide interactive API explorer in developer portal.

## Compliance

### 1. Data Classification

Respect data classification levels:

```json
{
  "id": "123",
  "title": "Investigation Alpha",
  "classification": "SECRET",
  "compartments": ["SI", "TK"]
}
```

### 2. Audit Logging

All API calls are logged for compliance:
- User/service identification
- Timestamp
- Action performed
- Data accessed
- IP address
- Request/response

### 3. Data Retention

Understand data retention policies:
- Logs: 7 years
- Audit trails: Permanent
- Temporary data: 90 days

## Summary Checklist

- [ ] Use HTTPS in production
- [ ] Implement proper authentication
- [ ] Version your APIs
- [ ] Paginate large results
- [ ] Validate all input
- [ ] Handle errors gracefully
- [ ] Respect rate limits
- [ ] Enable caching where appropriate
- [ ] Use structured error responses
- [ ] Include request IDs
- [ ] Monitor key metrics
- [ ] Test in sandbox first
- [ ] Document your APIs
- [ ] Plan for deprecation
- [ ] Follow data classification rules

For questions or support:
- Portal: https://api.summit.gov/portal
- Email: api-support@summit.gov
- Documentation: https://docs.summit.gov/api
