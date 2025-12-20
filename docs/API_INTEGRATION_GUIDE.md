# IntelGraph API Integration Guide

> **Version**: 2.1.0
> **Last Updated**: 2025-01-15
> **Audience**: External Developers, Integration Partners

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Quick Start Examples](#quick-start-examples)
4. [Using the SDKs](#using-the-sdks)
5. [REST API Guide](#rest-api-guide)
6. [GraphQL API Guide](#graphql-api-guide)
7. [Real-time Updates (WebSockets)](#real-time-updates)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- API credentials (obtain from [IntelGraph Console](https://console.intelgraph.ai))
- Node.js ≥ 18 (for TypeScript SDK) or Python ≥ 3.11 (for Python SDK)
- Basic understanding of REST or GraphQL APIs

### Obtaining API Credentials

1. Log in to the [IntelGraph Console](https://console.intelgraph.ai)
2. Navigate to **Settings → API Keys**
3. Click **Generate New API Key**
4. Save your API key securely (it will only be shown once)

**Security Note:** Never commit API keys to version control. Use environment variables or secret management systems.

---

## Authentication

All API requests require authentication via **JWT Bearer tokens**.

### Option 1: JWT Token (User Authentication)

```bash
# Obtain JWT token via login
curl -X POST https://api.intelgraph.ai/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst@example.com",
    "password": "SecurePassword123!"
  }'

# Response:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "...",
  "expiresIn": 3600
}

# Use token in subsequent requests
curl https://api.intelgraph.ai/v2/graphs \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

### Option 2: API Key (Service Authentication)

```bash
curl https://api.intelgraph.ai/v2/graphs \
  -H "X-API-Key: ig_prod_abc123..."
```

### Token Refresh

JWT tokens expire after 1 hour. Refresh them before expiration:

```bash
curl -X POST https://api.intelgraph.ai/v2/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## Quick Start Examples

### Example 1: Create an Investigation (REST)

```bash
# 1. Authenticate
export TOKEN=$(curl -s -X POST https://api.intelgraph.ai/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@example.com","password":"pass"}' \
  | jq -r '.token')

# 2. Create a new graph
curl -X POST https://api.intelgraph.ai/v2/graphs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Financial Fraud Investigation",
    "description": "Q4 2024 fraud analysis",
    "tags": ["fraud", "financial", "q4-2024"]
  }'

# Response:
{
  "id": "graph_abc123",
  "name": "Financial Fraud Investigation",
  "nodeCount": 0,
  "edgeCount": 0,
  "createdAt": "2025-01-15T10:00:00Z"
}

# 3. Add entities to the graph
GRAPH_ID="graph_abc123"

curl -X POST https://api.intelgraph.ai/v2/graphs/$GRAPH_ID/entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Person",
    "properties": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "Suspect"
    },
    "metadata": {
      "source": "OSINT",
      "confidence": 0.85
    }
  }'

# 4. Create relationship
curl -X POST https://api.intelgraph.ai/v2/graphs/$GRAPH_ID/relationships \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRANSACTED_WITH",
    "sourceId": "entity_person1",
    "targetId": "entity_org1",
    "properties": {
      "amount": 50000,
      "date": "2024-12-15",
      "currency": "USD"
    }
  }'
```

### Example 2: Query Entities (GraphQL)

```graphql
# Query entities with relationships
query GetEntitiesWithRelationships($graphId: ID!) {
  graph(id: $graphId) {
    id
    name
    entities(limit: 10, type: "Person") {
      id
      type
      properties
      outgoingRelationships {
        type
        target {
          id
          properties
        }
      }
    }
  }
}
```

```bash
# Execute GraphQL query
curl -X POST https://api.intelgraph.ai/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetEntitiesWithRelationships($graphId: ID!) { graph(id: $graphId) { id name entities(limit: 10, type: \"Person\") { id type properties } } }",
    "variables": {
      "graphId": "graph_abc123"
    }
  }'
```

### Example 3: AI-Powered Community Detection

```bash
# Run community detection analysis
curl -X POST https://api.intelgraph.ai/v2/ai/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "graph_abc123",
    "analysisType": "community_detection",
    "parameters": {
      "algorithm": "louvain",
      "resolution": 1.0
    }
  }'

# Response (async):
{
  "jobId": "job_xyz789",
  "status": "processing"
}

# Check job status
curl https://api.intelgraph.ai/v2/ai/jobs/job_xyz789 \
  -H "Authorization: Bearer $TOKEN"

# Response (when complete):
{
  "jobId": "job_xyz789",
  "status": "completed",
  "results": {
    "communities": [
      {
        "id": 1,
        "members": ["entity_1", "entity_2", "entity_3"],
        "size": 3,
        "density": 0.67
      }
    ]
  }
}
```

---

## Using the SDKs

### TypeScript/JavaScript SDK

#### Installation

```bash
npm install @intelgraph/sdk
# or
pnpm add @intelgraph/sdk
```

#### Usage

```typescript
import { IntelGraphClient } from '@intelgraph/sdk';

// Initialize client
const client = new IntelGraphClient({
  apiKey: process.env.INTELGRAPH_API_KEY,
  baseUrl: 'https://api.intelgraph.ai',
});

// Create a graph
const graph = await client.graphs.create({
  name: 'Financial Fraud Investigation',
  description: 'Q4 2024 analysis',
  tags: ['fraud', 'financial'],
});

console.log(`Created graph: ${graph.id}`);

// Add entities
const entity = await client.entities.create(graph.id, {
  type: 'Person',
  properties: {
    name: 'John Doe',
    email: 'john.doe@example.com',
  },
  metadata: {
    source: 'OSINT',
    confidence: 0.85,
  },
});

// Query entities
const entities = await client.entities.list(graph.id, {
  type: 'Person',
  limit: 10,
});

// Create relationship
const relationship = await client.relationships.create(graph.id, {
  type: 'KNOWS',
  sourceId: entity.id,
  targetId: 'other_entity_id',
  properties: {
    since: '2020-01-01',
  },
});

// Run AI analysis
const analysisJob = await client.ai.analyze({
  graphId: graph.id,
  analysisType: 'community_detection',
  parameters: {
    algorithm: 'louvain',
  },
});

// Poll for results
const results = await client.ai.waitForJob(analysisJob.jobId, {
  pollingInterval: 2000, // 2 seconds
  timeout: 60000, // 1 minute
});

console.log('Analysis results:', results);
```

#### GraphQL Queries (TypeScript SDK)

```typescript
import { IntelGraphClient } from '@intelgraph/sdk';

const client = new IntelGraphClient({
  apiKey: process.env.INTELGRAPH_API_KEY,
});

// Execute GraphQL query
const result = await client.graphql.query({
  query: `
    query GetEntity($id: ID!) {
      entity(id: $id) {
        id
        name
        type
        properties
        outgoingRelationships {
          type
          target {
            id
            name
          }
        }
      }
    }
  `,
  variables: {
    id: 'entity_123',
  },
});

console.log(result.data.entity);
```

### Python SDK

#### Installation

```bash
pip install intelgraph-sdk
```

#### Usage

```python
from intelgraph import IntelGraphClient

# Initialize client
client = IntelGraphClient(
    api_key="ig_prod_abc123",
    base_url="https://api.intelgraph.ai"
)

# Create a graph
graph = client.graphs.create(
    name="Financial Fraud Investigation",
    description="Q4 2024 analysis",
    tags=["fraud", "financial"]
)

print(f"Created graph: {graph.id}")

# Add entity
entity = client.entities.create(
    graph_id=graph.id,
    type="Person",
    properties={
        "name": "John Doe",
        "email": "john.doe@example.com"
    },
    metadata={
        "source": "OSINT",
        "confidence": 0.85
    }
)

# Query entities
entities = client.entities.list(
    graph_id=graph.id,
    type="Person",
    limit=10
)

for entity in entities.data:
    print(f"Entity: {entity.properties['name']}")

# Create relationship
relationship = client.relationships.create(
    graph_id=graph.id,
    type="KNOWS",
    source_id=entity.id,
    target_id="other_entity_id",
    properties={
        "since": "2020-01-01"
    }
)

# Run AI analysis
analysis_job = client.ai.analyze(
    graph_id=graph.id,
    analysis_type="community_detection",
    parameters={
        "algorithm": "louvain",
        "resolution": 1.0
    }
)

# Wait for results
results = client.ai.wait_for_job(
    job_id=analysis_job.job_id,
    polling_interval=2.0,  # 2 seconds
    timeout=60.0  # 1 minute
)

print("Analysis results:", results.results)
```

#### GraphQL Queries (Python SDK)

```python
from intelgraph import IntelGraphClient

client = IntelGraphClient(api_key="ig_prod_abc123")

# Execute GraphQL query
result = client.graphql.query(
    query="""
        query GetEntity($id: ID!) {
            entity(id: $id) {
                id
                name
                type
                properties
                outgoingRelationships {
                    type
                    target {
                        id
                        name
                    }
                }
            }
        }
    """,
    variables={"id": "entity_123"}
)

print(result["data"]["entity"])
```

---

## REST API Guide

### Base URL

```
Production: https://api.intelgraph.ai
Staging:    https://api-staging.intelgraph.ai
```

### Common Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-API-Version: 2.1.0
```

### Pagination

List endpoints support pagination:

```bash
curl "https://api.intelgraph.ai/v2/graphs?page=2&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### Filtering

Use query parameters for filtering:

```bash
# Filter by type
curl "https://api.intelgraph.ai/v2/graphs/graph_abc/entities?type=Person" \
  -H "Authorization: Bearer $TOKEN"

# Search by name
curl "https://api.intelgraph.ai/v2/graphs?search=fraud&tags=financial" \
  -H "Authorization: Bearer $TOKEN"
```

---

## GraphQL API Guide

### GraphQL Endpoint

```
POST https://api.intelgraph.ai/graphql
```

### GraphQL Playground

Interactive GraphQL explorer available at:

```
https://api.intelgraph.ai/api/docs/graphql-playground
```

### Common Queries

#### Get Investigation with Entities

```graphql
query GetInvestigation($id: ID!) {
  investigation(id: $id) {
    id
    name
    description
    status
    entities {
      id
      name
      type
      properties
    }
    relationships {
      id
      type
      source {
        id
        name
      }
      target {
        id
        name
      }
    }
  }
}
```

#### Search Entities

```graphql
query SearchEntities($query: String!, $filter: EntityFilter) {
  searchEntities(query: $query, filter: $filter) {
    id
    type
    name
    properties
    confidence
  }
}
```

Variables:
```json
{
  "query": "John Doe",
  "filter": {
    "types": ["PERSON"],
    "confidence": {
      "min": 0.7
    }
  }
}
```

### Mutations

#### Create Entity

```graphql
mutation CreateEntity($input: CreateEntityInput!) {
  createEntity(input: $input) {
    id
    type
    name
    properties
    confidence
    createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "type": "PERSON",
    "name": "John Doe",
    "properties": {
      "email": "john@example.com",
      "role": "Analyst"
    },
    "confidence": 0.95
  }
}
```

### Subscriptions

#### Subscribe to Entity Updates

```graphql
subscription EntityUpdated($investigationId: ID) {
  entityUpdated(investigationId: $investigationId) {
    id
    type
    name
    updatedAt
  }
}
```

---

## Real-time Updates

### WebSocket Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('https://api.intelgraph.ai', {
  auth: {
    token: 'your_jwt_token',
  },
});

// Listen for entity updates
socket.on('entity:updated', (data) => {
  console.log('Entity updated:', data);
});

// Listen for relationship updates
socket.on('relationship:created', (data) => {
  console.log('New relationship:', data);
});

// Join investigation room
socket.emit('join:investigation', { investigationId: 'inv_123' });
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      "resource": "graph",
      "id": "graph_invalid"
    }
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "traceId": "trace_abc123"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### SDK Error Handling

#### TypeScript

```typescript
import { IntelGraphClient, IntelGraphError } from '@intelgraph/sdk';

const client = new IntelGraphClient({ apiKey: '...' });

try {
  const graph = await client.graphs.get('invalid_id');
} catch (error) {
  if (error instanceof IntelGraphError) {
    console.error(`Error ${error.code}: ${error.message}`);
    console.error('Trace ID:', error.traceId);

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      const retryAfter = error.retryAfter;
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    }
  }
}
```

#### Python

```python
from intelgraph import IntelGraphClient, IntelGraphError

client = IntelGraphClient(api_key="...")

try:
    graph = client.graphs.get("invalid_id")
except IntelGraphError as error:
    print(f"Error {error.code}: {error.message}")
    print(f"Trace ID: {error.trace_id}")

    if error.code == "RATE_LIMIT_EXCEEDED":
        print(f"Rate limited. Retry after {error.retry_after} seconds")
```

---

## Rate Limiting

### Rate Limit Tiers

| Tier | Requests/Hour | Burst Limit |
|------|--------------|-------------|
| **Free** | 100 | 10/minute |
| **Professional** | 1,000 | 100/minute |
| **Enterprise** | 10,000 | 1,000/minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1642262400
```

### Handling Rate Limits

```typescript
import { IntelGraphClient } from '@intelgraph/sdk';

const client = new IntelGraphClient({
  apiKey: '...',
  retryOnRateLimit: true,
  maxRetries: 3,
});

// Automatically retries on 429 errors with exponential backoff
const graph = await client.graphs.get('graph_id');
```

---

## Best Practices

### ✅ DO

1. **Use SDKs when available** - Type-safe, well-tested, and handles errors gracefully
2. **Cache responses** - Respect `Cache-Control` and `ETag` headers
3. **Implement exponential backoff** - For retries on transient errors
4. **Use webhooks for async operations** - Instead of polling
5. **Request only needed fields** - Especially in GraphQL
6. **Handle pagination properly** - Don't assume all results fit in one page
7. **Monitor rate limits** - Track `X-RateLimit-*` headers

### ❌ DON'T

1. **Don't expose API keys** - Never commit to version control
2. **Don't ignore error responses** - Always handle errors gracefully
3. **Don't poll excessively** - Use WebSockets or webhooks for real-time updates
4. **Don't parse HTML error pages** - Always check `Content-Type`
5. **Don't assume field order** - JSON object properties are unordered

---

## Troubleshooting

### Common Issues

#### 401 Unauthorized

**Cause**: Invalid or expired JWT token

**Solution**:
```bash
# Refresh your token
curl -X POST https://api.intelgraph.ai/v2/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

#### 429 Rate Limit Exceeded

**Cause**: Too many requests

**Solution**: Implement exponential backoff or upgrade your plan

#### 422 Validation Error

**Cause**: Invalid request data

**Solution**: Check the `validationErrors` array in the response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "validationErrors": [
      {
        "field": "email",
        "message": "must be a valid email address"
      }
    ]
  }
}
```

### Getting Help

- 📖 [API Documentation](https://docs.intelgraph.ai)
- 💬 [Community Forum](https://community.intelgraph.ai)
- 📧 [Support Email](mailto:support@intelgraph.ai)
- 🐛 [Report Issues](https://github.com/intelgraph/api-issues)

---

## Additional Resources

- [OpenAPI Specification](/openapi/spec.yaml)
- [GraphQL Schema](/api/docs/graphql-schema)
- [Postman Collection](https://www.postman.com/intelgraph/workspace/intelgraph-api)
- [Code Examples Repository](https://github.com/intelgraph/api-examples)

---

**Last Updated**: 2025-01-15
**Version**: 2.1.0
