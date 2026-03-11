# Summit Platform API Documentation

> **Comprehensive intelligence analysis platform with AI-augmented capabilities**

## 📚 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [OpenAPI Specification](#openapi-specification)
- [API Endpoints](#api-endpoints)
- [Common Workflows](#common-workflows)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The Summit Platform provides a powerful REST API for managing investigations, evidence, and automated analysis workflows.

- **Base URL**: `https://api.summit.tech/v1`
- **Format**: JSON
- **Authentication**: JWT Bearer Token

---

## Getting Started

### Prerequisites

- Node.js >= 18.18
- Valid JWT token from the Summit OIDC provider
- Network access to the Summit API Gateway

### Quick Start

```bash
# Set your authentication token
export API_TOKEN="your-jwt-token-here"

# Test the connection
curl -H "Authorization: Bearer $API_TOKEN" \
  https://api.summit.tech/v1/health

# Expected response
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Authentication

All API requests (except `/health`) require JWT Bearer token authentication.

### Obtaining a Token

Tokens are managed via the Summit Identity Provider. Contact your administrator for OIDC client credentials.

### Using the Token

Include the token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## OpenAPI Specification

The full API reference is available in OpenAPI 3.0 format:
- **Specification**: [openapi.yml](./openapi.yml)

You can use this file with tools like Swagger UI, ReDoc, or Postman to explore the API interactively.

---

## API Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Cases** | `POST /cases` | Create new investigation case |
| **Cases** | `GET /cases/{id}` | Get case by ID |
| **Cases** | `POST /cases/{id}/approve` | Approve case |
| **Cases** | `GET /cases/{id}/export` | Export case data |
| **Evidence** | `GET /evidence/{id}/annotations` | List annotations |
| **Evidence** | `POST /evidence/{id}/annotations` | Create annotation |
| **Ingest** | `GET /ingest/connectors` | List data connectors |
| **Ingest** | `POST /ingest/start` | Start ingestion job |
| **Triage** | `GET /triage/suggestions` | List AI suggestions |
| **AI** | `POST /ai/predict-links` | Predict entity links |
| **Maestro** | `GET /maestro/runs` | List workflow runs |
| **Maestro** | `POST /maestro/runs` | Create and start run |

---

## Reference Examples

Every endpoint can be accessed via `cURL`. Ensure `API_TOKEN` is set in your environment.

### Health
```bash
curl -H "Authorization: Bearer $API_TOKEN" https://api.summit.tech/v1/health
```

### Cases
```bash
# Create case
curl -X POST https://api.summit.tech/v1/cases \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Investigation"}'

# Get case
curl -H "Authorization: Bearer $API_TOKEN" https://api.summit.tech/v1/cases/case123

# Approve case
curl -X POST https://api.summit.tech/v1/cases/case123/approve \
  -H "Authorization: Bearer $API_TOKEN"

# Export case
curl -H "Authorization: Bearer $API_TOKEN" https://api.summit.tech/v1/cases/case123/export
```

### Evidence
```bash
# List annotations
curl -H "Authorization: Bearer $API_TOKEN" https://api.summit.tech/v1/evidence/ev123/annotations

# Create annotation
curl -X POST https://api.summit.tech/v1/evidence/ev123/annotations \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"range": "0-10", "note": "Relevant finding"}'
```

### Ingest
```bash
# List connectors
curl -H "Authorization: Bearer $API_TOKEN" https://api.summit.tech/v1/ingest/connectors

# Start ingest
curl -X POST https://api.summit.tech/v1/ingest/start \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"connector": "twitter", "config": {"query": "summit"}}'
```

### Triage
```bash
# List suggestions
curl -H "Authorization: Bearer $API_TOKEN" https://api.summit.tech/v1/triage/suggestions
```

### AI
```bash
# Predict links
curl -X POST https://api.summit.tech/v1/ai/predict-links \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId": "e123", "topK": 5}'
```

### Maestro
```bash
# List runs
curl -H "Authorization: Bearer $API_TOKEN" "https://api.summit.tech/v1/maestro/runs?limit=10"

# Create run
curl -X POST https://api.summit.tech/v1/maestro/runs \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": "uuid-here", "pipeline_name": "name-here"}'
```

---

## Common Workflows

### Workflow 1: Create and Approve Investigation Case

```bash
# Step 1: Create a new case
CASE_ID=$(curl -X POST https://api.summit.tech/v1/cases \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Financial Fraud Investigation"}' \
  | jq -r '.case.id')

# Step 2: Add evidence annotations
curl -X POST "https://api.summit.tech/v1/evidence/evidence123/annotations" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "range": "45-89",
    "note": "Suspicious transaction pattern detected"
  }'

# Step 3: Approve the case
curl -X POST "https://api.summit.tech/v1/cases/$CASE_ID/approve" \
  -H "Authorization: Bearer $API_TOKEN"
```

### Workflow 2: Automated Analysis via Maestro

```bash
# Start a new analysis pipeline
RUN_ID=$(curl -X POST https://api.summit.tech/v1/maestro/runs \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_id": "99824435-3211-4680-87a1-87a22495b508",
    "pipeline_name": "entity-resolution-pipeline",
    "input_params": {
      "confidence_threshold": 0.85
    }
  }' | jq -r '.id')

# Monitor run status
curl https://api.summit.tech/v1/maestro/runs \
  -H "Authorization: Bearer $API_TOKEN" | jq ".items[] | select(.id == \"$RUN_ID\")"
```

---

## Error Handling

All errors follow a standard format:

```json
{
  "ok": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "requestId": "req-12345"
}
```

Common HTTP status codes:
- `400`: Bad Request (Validation failed)
- `401`: Unauthorized (Invalid or missing token)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found (Resource does not exist)
- `429`: Too Many Requests (Rate limit exceeded)
- `500`: Internal Server Error

---

## Best Practices

1. **Security**: Never share your API token. Use environment variables to store sensitive credentials.
2. **Rate Limiting**: Implement exponential backoff when encountering `429` responses.
3. **Validation**: Validate request payloads against the OpenAPI schema before submission.
4. **Idempotency**: Use unique request IDs where applicable to prevent duplicate operations.

---

**Last Updated**: January 2025
**Version**: 1.0.0
