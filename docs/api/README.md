# IntelGraph Platform API Documentation

> **Next-generation intelligence analysis platform with AI-augmented graph analytics**

## 📚 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Common Workflows](#common-workflows)
- [GraphQL Examples](#graphql-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Best Practices](#best-practices)

---

## Overview

The IntelGraph Platform provides two complementary APIs:

### REST API
- **Base URL**: `http://localhost:4000/api`
- **Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Format**: JSON
- **Use Cases**: Case management, evidence handling, data ingestion, admin operations

### GraphQL API
- **Endpoint**: `http://localhost:4000/graphql`
- **Playground**: [http://localhost:4000/api/docs/graphql-playground](http://localhost:4000/api/docs/graphql-playground)
- **Use Cases**: Entity queries, relationship mapping, analytics, investigations

---

## Getting Started

### Prerequisites

- Node.js >= 18.18
- Valid JWT token from OIDC provider
- Network access to the API server

### Quick Start

```bash
# Set your authentication token
export API_TOKEN="your-jwt-token-here"

# Test the connection
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:4000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Authentication

All API requests (except `/health` and `/metrics`) require JWT Bearer token authentication.

### Obtaining a Token

Contact your system administrator to configure OIDC integration. Tokens must be signed with RS256 and include:

- `aud`: Audience claim
- `iss`: Issuer claim
- `exp`: Expiration timestamp
- Custom claims for user ID, email, tenant ID, and permissions

### Using the Token

Include the token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Validation

Tokens are validated against:
- JWKS endpoint for signature verification
- Audience and issuer claims
- Expiration time
- Token blacklist (Redis)

---

## API Endpoints

### REST API Reference

Full REST API documentation with interactive examples is available at:
- **Swagger UI**: [/api/docs](http://localhost:4000/api/docs)
- **ReDoc**: [/api/docs/redoc](http://localhost:4000/api/docs/redoc)
- **OpenAPI Spec**: [/api/docs/openapi.json](http://localhost:4000/api/docs/openapi.json)

### Key Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Cases** | `POST /api/cases` | Create new investigation case |
| **Cases** | `GET /api/cases/{id}` | Get case by ID |
| **Cases** | `POST /api/cases/{id}/approve` | Approve case |
| **Cases** | `GET /api/cases/{id}/export` | Export case data |
| **Evidence** | `GET /api/evidence/{id}/annotations` | List annotations |
| **Evidence** | `POST /api/evidence/{id}/annotations` | Create annotation |
| **Evidence** | `GET /api/evidence/{id}/pdf` | Export as PDF |
| **Ingest** | `GET /api/ingest/connectors` | List data connectors |
| **Ingest** | `POST /api/ingest/start` | Start ingestion job |
| **Ingest** | `GET /api/ingest/progress/{id}` | Check job progress |
| **Triage** | `GET /api/triage/suggestions` | List suggestions |
| **Triage** | `POST /api/triage/suggestions` | Create suggestion |
| **Triage** | `POST /api/triage/suggestions/{id}/approve` | Approve suggestion |
| **Analytics** | `GET /api/analytics/link-prediction` | Predict entity links |
| **Copilot** | `POST /api/copilot/estimate` | Estimate query cost |
| **Copilot** | `POST /api/copilot/classify` | Classify prompt safety |
| **Admin** | `GET /api/admin/users` | List users |
| **Admin** | `GET /api/admin/audit` | Query audit logs |

---

## Common Workflows

### Workflow 1: Create and Approve Investigation Case

```bash
# Step 1: Create a new case
CASE_ID=$(curl -X POST http://localhost:4000/api/cases \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Financial Fraud Investigation"}' \
  | jq -r '.case.id')

echo "Created case: $CASE_ID"

# Step 2: Add evidence annotations
curl -X POST "http://localhost:4000/api/evidence/evidence123/annotations" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "range": "45-89",
    "note": "Suspicious transaction pattern detected"
  }'

# Step 3: Approve the case
curl -X POST "http://localhost:4000/api/cases/$CASE_ID/approve" \
  -H "Authorization: Bearer $API_TOKEN"

# Step 4: Export case data
curl "http://localhost:4000/api/cases/$CASE_ID/export" \
  -H "Authorization: Bearer $API_TOKEN" \
  > case-export.json
```

### Workflow 2: Data Ingestion from External Source

```bash
# Step 1: List available connectors
curl http://localhost:4000/api/ingest/connectors | jq '.items'

# Step 2: Get connector configuration schema
curl http://localhost:4000/api/ingest/schema/twitter | jq

# Step 3: Validate configuration (dry run)
curl -X POST http://localhost:4000/api/ingest/dry-run/twitter \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bearerToken": "YOUR_TWITTER_TOKEN",
    "query": "#cybersecurity"
  }'

# Step 4: Start ingestion job
JOB_ID=$(curl -X POST http://localhost:4000/api/ingest/start \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector": "twitter",
    "config": {
      "bearerToken": "YOUR_TWITTER_TOKEN",
      "query": "#cybersecurity"
    }
  }' | jq -r '.job_id')

echo "Job started: $JOB_ID"

# Step 5: Monitor progress
watch -n 2 "curl -s http://localhost:4000/api/ingest/progress/$JOB_ID \
  -H 'Authorization: Bearer $API_TOKEN' | jq"
```

### Workflow 3: AI-Powered Triage

```bash
# Step 1: Create triage suggestion
SUGGESTION_ID=$(curl -X POST http://localhost:4000/api/triage/suggestions \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "link",
    "data": {
      "sourceId": "person1",
      "targetId": "org1",
      "confidence": 0.92,
      "reasoning": "Multiple communication patterns detected"
    }
  }' | jq -r '.suggestion.id')

# Step 2: Review suggestions
curl http://localhost:4000/api/triage/suggestions \
  -H "Authorization: Bearer $API_TOKEN" | jq '.items'

# Step 3: Approve suggestion
curl -X POST "http://localhost:4000/api/triage/suggestions/$SUGGESTION_ID/approve" \
  -H "Authorization: Bearer $API_TOKEN"

# Step 4: Materialize into graph
curl -X POST "http://localhost:4000/api/triage/suggestions/$SUGGESTION_ID/materialize" \
  -H "Authorization: Bearer $API_TOKEN"
```

### Workflow 4: Link Prediction Analytics

```bash
# Run link prediction on seed entities
curl "http://localhost:4000/api/analytics/link-prediction?seeds=e1,e2,e3,e4,e5" \
  -H "Authorization: Bearer $API_TOKEN" \
  | jq '.items | sort_by(-.score) | .[:10]'

# Output: Top 10 predicted links with confidence scores
```

### Workflow 5: AI Copilot Query Generation

```bash
# Step 1: Check safety of prompt
curl -X POST http://localhost:4000/api/copilot/classify \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show me entities related to case #123"}' \
  | jq

# Step 2: Estimate cost
curl -X POST http://localhost:4000/api/copilot/estimate \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Find all people connected to organization XYZ"}' \
  | jq '.cost'

# Step 3: Get query templates
curl -X POST http://localhost:4000/api/copilot/cookbook \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "analytics"}' \
  | jq '.items'
```

---

## GraphQL Examples

### Example 1: Create Entity and Relationships

```graphql
# Create a person entity
mutation CreatePerson {
  createEntity(input: {
    type: PERSON
    name: "John Doe"
    description: "Subject of investigation"
    properties: {
      dateOfBirth: "1980-01-01"
      nationality: "US"
    }
    confidence: 0.95
    sourceIds: ["manual-entry-1"]
  }) {
    id
    name
    type
    confidence
    createdAt
  }
}

# Create a relationship
mutation CreateRelationship {
  createRelationship(input: {
    type: WORKS_FOR
    sourceId: "person123"
    targetId: "org456"
    properties: {
      position: "CEO"
      startDate: "2020-01-01"
    }
    confidence: 1.0
    sourceIds: ["linkedin-1"]
  }) {
    id
    type
    source { id name }
    target { id name }
  }
}
```

### Example 2: Advanced Graph Queries

```graphql
# Find shortest path between two entities
query FindPath {
  findPaths(input: {
    sourceId: "person1"
    targetId: "person2"
    algorithm: SHORTEST_PATH
    maxDepth: 6
  }) {
    paths {
      nodes {
        id
        name
        type
      }
      relationships {
        id
        type
      }
      length
      score
    }
    executionTime
  }
}

# Perform centrality analysis
query Centrality {
  centralityAnalysis(entityIds: ["e1", "e2", "e3"]) {
    id
    name
    centrality {
      betweenness
      closeness
      degree
      eigenvector
      pagerank
    }
  }
}
```

### Example 3: Investigation Management

```graphql
# Create investigation with entities
mutation CreateInvestigation {
  createInvestigation(input: {
    name: "Fraud Investigation Alpha"
    description: "Investigating suspicious transactions"
    priority: HIGH
    assignedTo: ["user1", "user2"]
  }) {
    id
    name
    status
    createdAt
  }
}

# Add hypothesis
mutation AddHypothesis {
  createHypothesis(
    investigationId: "inv123"
    title: "Subject involved in money laundering"
    description: "Multiple offshore transactions detected"
  ) {
    id
    title
    confidence
    status
  }
}

# Query investigation with full details
query GetInvestigation {
  investigation(id: "inv123") {
    id
    name
    status
    entities { id name type }
    relationships { id type source { name } target { name } }
    hypotheses { title confidence status }
    timeline { timestamp title }
    summary {
      entityCount
      relationshipCount
      keyFindings
      riskScore
    }
  }
}
```

### Example 4: Real-time Subscriptions

```graphql
# Subscribe to entity updates
subscription WatchEntities {
  entityUpdated(investigationId: "inv123") {
    id
    name
    type
    updatedAt
  }
}

# Subscribe to analysis completion
subscription WatchAnalysis {
  analysisCompleted(jobId: "analytics-job-456")
}
```

---

## Error Handling

### REST API Errors

All errors follow this format:

```json
{
  "ok": false,
  "error": "Error message description"
}
```

For validation errors:

```json
{
  "ok": false,
  "error": "missing_required",
  "fields": ["bearerToken", "query"]
}
```

### GraphQL Errors

GraphQL returns both data and errors:

```json
{
  "data": {
    "entity": null
  },
  "errors": [
    {
      "message": "Entity not found",
      "path": ["entity"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `Bad Request` | Invalid request format or parameters |
| 401 | `Unauthorized` | Missing or invalid JWT token |
| 403 | `Forbidden` | Insufficient permissions |
| 404 | `Not Found` | Resource not found |
| 409 | `Conflict` | Resource conflict (e.g., nonce replay) |
| 429 | `Too Many Requests` | Rate limit exceeded |
| 500 | `Internal Server Error` | Server-side error |

---

## Rate Limiting

### Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/admin/audit/record` | 60 requests | 1 minute |
| GraphQL queries | 100 requests | 1 minute |
| REST endpoints | 200 requests | 1 minute |

### Handling Rate Limits

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitTime = resetTime ? parseInt(resetTime) * 1000 - Date.now() : 1000;

      console.log(`Rate limited. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

---

## Best Practices

### 1. Security

✅ **DO:**
- Always use HTTPS in production
- Rotate JWT tokens regularly
- Store tokens securely (never in localStorage for web apps)
- Validate all user inputs on the client side
- Use environment variables for sensitive configuration

❌ **DON'T:**
- Hardcode API tokens in source code
- Expose tokens in URLs or logs
- Bypass SSL certificate validation
- Trust client-side validation alone

### 2. Performance

✅ **DO:**
- Use GraphQL field selection to request only needed data
- Implement pagination for large result sets
- Cache responses when appropriate
- Use batch operations for bulk creates/updates
- Implement exponential backoff for retries

❌ **DON'T:**
- Make redundant API calls
- Fetch large datasets without pagination
- Ignore rate limit headers
- Create tight polling loops

### 3. Error Handling

✅ **DO:**
- Always check both `data` and `errors` in GraphQL responses
- Implement proper error logging
- Provide user-friendly error messages
- Handle network failures gracefully
- Retry transient errors with exponential backoff

❌ **DON'T:**
- Expose internal error details to end users
- Ignore error responses
- Retry non-idempotent operations without caution

### 4. GraphQL Best Practices

✅ **DO:**
- Use variables for dynamic values
- Leverage fragments for reusable field selections
- Use persisted queries in production
- Implement query complexity analysis
- Subscribe to updates for real-time features

❌ **DON'T:**
- Use string interpolation for query parameters
- Create overly complex nested queries
- Subscribe to updates you don't need

### 5. Monitoring

✅ **DO:**
- Monitor API response times
- Track error rates and types
- Set up alerts for rate limit warnings
- Log all authentication failures
- Monitor audit logs regularly

---

## API Clients

### JavaScript/TypeScript

```javascript
// Using fetch
const response = await fetch('http://localhost:4000/api/cases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ title: 'New Case' })
});

const data = await response.json();
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'http://localhost:4000/api/cases',
    headers=headers,
    json={'title': 'New Case'}
)

data = response.json()
```

### cURL

```bash
curl -X POST http://localhost:4000/api/cases \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Case"}'
```

---

## Support & Resources

- **Interactive API Docs**: [/api/docs](http://localhost:4000/api/docs)
- **GraphQL Playground**: [/api/docs/graphql-playground](http://localhost:4000/api/docs/graphql-playground)
- **OpenAPI Specification**: [/api/docs/openapi.json](http://localhost:4000/api/docs/openapi.json)
- **Health Status**: [/health](http://localhost:4000/health)

For additional support, contact your system administrator or refer to the internal documentation.

---

**License**: MIT
**Version**: 1.0.0
**Last Updated**: January 2025
