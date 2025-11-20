---
id: [api-name]-reference
title: [API Name] Reference
sidebar_label: API Reference
description: Complete API reference for [API Name]
tags: [api, reference, tag3]
---

# [API Name] API Reference

> **Base URL**: `https://api.example.com/v1`
>
> **Version**: v1.0.0 | **Last Updated**: YYYY-MM-DD

## Overview

Brief description of what this API provides and its primary use cases.

### Key Features

- Feature 1
- Feature 2
- Feature 3

## Authentication

All API requests require authentication using [method].

### Obtaining Credentials

1. [Step to get credentials]
2. [Step to configure]

### Authentication Methods

#### Bearer Token

Include your API key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.example.com/v1/endpoint
```

#### OAuth 2.0

For OAuth authentication:

```bash
# Step 1: Obtain access token
curl -X POST https://api.example.com/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

## Base URL and Versioning

- **Production**: `https://api.example.com/v1`
- **Staging**: `https://staging-api.example.com/v1`
- **Development**: `http://localhost:4000/api/v1`

### API Versioning

We use URL path versioning. The current version is `v1`.

## Rate Limiting

| Tier | Requests/minute | Burst |
|------|----------------|-------|
| Free | 60 | 100 |
| Pro | 600 | 1000 |
| Enterprise | Unlimited | N/A |

Rate limit headers:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Common Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token |
| `Content-Type` | Yes* | `application/json` (*for POST/PUT/PATCH) |
| `Accept` | No | `application/json` (default) |
| `X-Request-ID` | No | Unique request identifier for tracking |

## Common Response Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Success with no response body |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "requestId": "req_123456",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

---

## Endpoints

### Resource Category 1

#### List Resources

```http
GET /resources
```

Retrieve a paginated list of resources.

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page (max 100) |
| `sort` | string | No | `created_at` | Sort field |
| `order` | string | No | `desc` | Sort order (`asc`/`desc`) |
| `filter` | string | No | - | Filter expression |

**Example Request**:

```bash
curl -X GET "https://api.example.com/v1/resources?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response** (200 OK):

```json
{
  "data": [
    {
      "id": "res_123",
      "name": "Example Resource",
      "status": "active",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Create Resource

```http
POST /resources
```

Create a new resource.

**Request Body**:

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "config": {
    "option1": "value",
    "option2": 123
  }
}
```

**Field Definitions**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | 1-100 chars | Resource name |
| `description` | string | No | Max 500 chars | Description |
| `config` | object | No | - | Configuration options |
| `config.option1` | string | No | - | Option 1 |

**Example Request**:

```bash
curl -X POST "https://api.example.com/v1/resources" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Resource",
    "description": "Test resource",
    "config": {
      "option1": "value"
    }
  }'
```

**Example Response** (201 Created):

```json
{
  "id": "res_456",
  "name": "My Resource",
  "description": "Test resource",
  "status": "active",
  "config": {
    "option1": "value"
  },
  "createdAt": "2025-01-15T11:00:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

**Possible Errors**:

| Code | Condition | Message |
|------|-----------|---------|
| 400 | Missing name | "Field 'name' is required" |
| 400 | Invalid config | "Invalid configuration format" |
| 409 | Duplicate name | "Resource with this name already exists" |

#### Get Resource

```http
GET /resources/{id}
```

Retrieve a specific resource by ID.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Resource ID |

**Example Request**:

```bash
curl -X GET "https://api.example.com/v1/resources/res_123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response** (200 OK):

```json
{
  "id": "res_123",
  "name": "Example Resource",
  "description": "Resource description",
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Update Resource

```http
PATCH /resources/{id}
```

Update specific fields of a resource.

**Request Body** (all fields optional):

```json
{
  "name": "string",
  "description": "string",
  "config": {}
}
```

**Example Request**:

```bash
curl -X PATCH "https://api.example.com/v1/resources/res_123" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

#### Delete Resource

```http
DELETE /resources/{id}
```

Delete a resource permanently.

**Example Request**:

```bash
curl -X DELETE "https://api.example.com/v1/resources/res_123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response** (204 No Content)

---

## Data Models

### Resource Object

```typescript
interface Resource {
  id: string;              // Unique identifier
  name: string;            // Resource name (1-100 chars)
  description?: string;    // Optional description (max 500 chars)
  status: ResourceStatus;  // Current status
  config: object;          // Configuration object
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}

type ResourceStatus = 'active' | 'inactive' | 'pending' | 'error';
```

## Webhooks

Subscribe to real-time events using webhooks.

### Configuration

1. Set webhook URL in dashboard
2. Verify webhook endpoint
3. Start receiving events

### Webhook Payload

```json
{
  "event": "resource.created",
  "data": {
    "id": "res_123",
    "name": "Resource Name"
  },
  "timestamp": "2025-01-15T12:00:00Z",
  "signature": "sha256=..."
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `resource.created` | New resource created |
| `resource.updated` | Resource updated |
| `resource.deleted` | Resource deleted |

## SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: [@company/sdk-js](https://npmjs.com/package/@company/sdk-js)
- **Python**: [company-sdk](https://pypi.org/project/company-sdk)
- **Go**: [github.com/company/sdk-go](https://github.com/company/sdk-go)

### Example (JavaScript)

```javascript
import { CompanyClient } from '@company/sdk-js';

const client = new CompanyClient({ apiKey: 'YOUR_API_KEY' });

const resource = await client.resources.create({
  name: 'My Resource'
});
```

## Best Practices

### Idempotency

Use the `Idempotency-Key` header for safe retries:

```bash
curl -X POST "https://api.example.com/v1/resources" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Pagination

Always handle pagination for list endpoints:

```javascript
let page = 1;
let allResources = [];

while (true) {
  const response = await fetch(`/resources?page=${page}`);
  const data = await response.json();

  allResources.push(...data.data);

  if (page >= data.pagination.pages) break;
  page++;
}
```

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const resource = await client.resources.get('res_123');
} catch (error) {
  if (error.code === 404) {
    console.log('Resource not found');
  } else if (error.code === 429) {
    // Implement exponential backoff
  }
}
```

## Support

- **Documentation**: [docs.example.com](https://docs.example.com)
- **API Status**: [status.example.com](https://status.example.com)
- **Support**: support@example.com
- **Community**: [forum.example.com](https://forum.example.com)

---

**Changelog**: [View API Changelog](./changelog)
