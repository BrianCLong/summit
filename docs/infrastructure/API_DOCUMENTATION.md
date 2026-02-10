# API Documentation Infrastructure

**Issue:** #11814 - API Documentation with OpenAPI/Swagger

## Overview

The IntelGraph Platform provides comprehensive API documentation through:
- **OpenAPI 3.0 Specification** - Machine-readable API contract
- **Swagger UI** - Interactive API explorer with "Try it out" functionality
- **ReDoc** - Clean, professional documentation viewer
- **GraphQL Playground** - Interactive GraphQL query editor
- **Automated SDK Generation** - TypeScript and Python client libraries

## Accessing Documentation

### Development

Start the server and access documentation at:

- **Swagger UI**: http://localhost:4000/api/docs
- **ReDoc**: http://localhost:4000/api/docs/redoc
- **GraphQL Playground**: http://localhost:4000/api/docs/graphql-playground
- **OpenAPI JSON**: http://localhost:4000/api/docs/openapi.json
- **OpenAPI YAML**: http://localhost:4000/api/docs/openapi.yaml
- **GraphQL Schema**: http://localhost:4000/api/docs/graphql-schema

### Production

Documentation endpoints are available in production at:
```
https://api.intelgraph.example.com/api/docs
```

## OpenAPI Specification

The OpenAPI specification is located at `/openapi/spec.yaml` and includes:

- All REST API endpoints
- Request/response schemas
- Authentication requirements
- Rate limiting information
- Error responses
- Example requests/responses

### Updating the Specification

1. Edit `/openapi/spec.yaml`
2. Validate the changes:
   ```bash
   python3 -c "import yaml; yaml.safe_load(open('openapi/spec.yaml', 'r'))"
   ```
3. Restart the server to see changes
4. Test endpoints using Swagger UI

### OpenAPI Specification Structure

```yaml
openapi: 3.0.3
info:
  title: IntelGraph Platform API
  version: 1.0.0
servers:
  - url: http://localhost:4000
paths:
  /api/cases:
    get:
      summary: List all cases
      responses:
        '200':
          description: Successful response
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
```

## SDK Generation

### Automated Generation

Generate client SDKs automatically:

```bash
# Generate all SDKs
./scripts/generate-sdk.sh all

# Generate specific SDK
./scripts/generate-sdk.sh typescript
./scripts/generate-sdk.sh python
```

### TypeScript SDK

Generated TypeScript types and fetch client:

```typescript
// Import generated types
import type { paths } from './generated-clients/typescript/api-types';

// Type-safe API calls
const response = await fetch('http://localhost:4000/api/cases', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
  },
});

const cases: paths['/api/cases']['get']['responses']['200']['content']['application/json']
  = await response.json();
```

### Python SDK

Install the generated Python client:

```bash
cd generated-clients/python
pip install -e .
```

Usage:

```python
from intelgraph_client import ApiClient, Configuration
from intelgraph_client.api import cases_api

configuration = Configuration(
    host="http://localhost:4000",
    access_token="your-jwt-token"
)

with ApiClient(configuration) as api_client:
    api_instance = cases_api.CasesApi(api_client)
    cases = api_instance.get_cases()
    print(cases)
```

## GraphQL Documentation

### Schema Access

The GraphQL schema is automatically documented and available at:
- Playground: http://localhost:4000/api/docs/graphql-playground
- Raw Schema: http://localhost:4000/api/docs/graphql-schema

### Example Queries

```graphql
# Get investigation with entities
query GetInvestigation($id: ID!) {
  investigation(id: $id) {
    id
    name
    description
    entities {
      id
      name
      type
    }
  }
}
```

## Authentication

All API endpoints (except documentation and health checks) require JWT authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/cases
```

### Obtaining a Token

1. Authenticate via OIDC provider
2. Receive JWT token
3. Include in `Authorization: Bearer <token>` header

## Rate Limiting

API requests are rate-limited based on:
- User role
- Endpoint sensitivity
- Request window (default: 60 seconds)

Rate limit headers in responses:
```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 599
X-RateLimit-Reset: 1234567890
```

## Testing API Endpoints

### Using Swagger UI

1. Navigate to http://localhost:4000/api/docs
2. Click "Authorize" and enter your JWT token
3. Expand an endpoint
4. Click "Try it out"
5. Fill in parameters
6. Click "Execute"

### Using cURL

```bash
# List cases
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/cases

# Create case
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Investigation", "status": "draft"}' \
  http://localhost:4000/api/cases
```

## Troubleshooting

### OpenAPI spec not loading

Check that `/openapi/spec.yaml` exists and is valid YAML:
```bash
python3 -c "import yaml; yaml.safe_load(open('openapi/spec.yaml', 'r'))"
```

### Swagger UI not showing endpoints

1. Check console for errors
2. Verify OpenAPI spec is accessible at `/api/docs/openapi.json`
3. Restart the server

### SDK generation fails

Ensure Docker is running for Python client generation:
```bash
docker ps
```

## Architecture

```
┌─────────────────┐
│   OpenAPI Spec  │
│  spec.yaml      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
    ┌────▼─────┐      ┌────▼────┐
    │ Swagger  │      │  ReDoc  │
    │    UI    │      │         │
    └──────────┘      └─────────┘
         │
    ┌────▼──────┐
    │ SDK Gen   │
    │ Script    │
    └────┬──────┘
         │
    ┌────▼────────┬──────────┐
    │  TypeScript │  Python  │
    │   Client    │  Client  │
    └─────────────┴──────────┘
```

## Files

- `/openapi/spec.yaml` - OpenAPI specification
- `/openapi/README.md` - Documentation guide
- `/server/src/routes/api-docs.ts` - Documentation routes
- `/scripts/generate-sdk.sh` - SDK generation script
- `/server/src/routes/__tests__/api-docs.test.ts` - Tests

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.3)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI TypeScript Generator](https://github.com/drwpow/openapi-typescript)
- [OpenAPI Generator](https://openapi-generator.tech/)
