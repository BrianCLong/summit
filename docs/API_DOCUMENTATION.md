# IntelGraph Platform API Documentation

> **Comprehensive guide to accessing and using the IntelGraph Platform API documentation**
> Last Updated: 2025-11-29

## Overview

The IntelGraph Platform provides comprehensive API documentation through both **OpenAPI/Swagger** for REST endpoints and **GraphQL documentation** for graph queries. This guide shows you how to access and use this documentation effectively.

## Quick Links

| Documentation | URL (Development) | Description |
|--------------|-------------------|-------------|
| **Swagger UI** | http://localhost:4000/api/docs | Interactive REST API documentation |
| **ReDoc** | http://localhost:4000/api/docs/redoc | Alternative REST API documentation |
| **GraphQL Playground** | http://localhost:4000/api/docs/graphql-playground | Interactive GraphQL IDE |
| **OpenAPI Spec (JSON)** | http://localhost:4000/api/docs/openapi.json | OpenAPI 3.0 specification |
| **OpenAPI Spec (YAML)** | http://localhost:4000/api/docs/openapi.yaml | OpenAPI 3.0 specification |
| **GraphQL Schema** | http://localhost:4000/api/docs/graphql-schema | GraphQL SDL |
| **GraphQL Docs** | http://localhost:4000/api/docs/graphql-docs | GraphQL examples & best practices |

## REST API Documentation (OpenAPI/Swagger)

### Accessing Swagger UI

1. Start the API server:
   ```bash
   make up
   # or
   cd services/api && pnpm dev
   ```

2. Open your browser to: http://localhost:4000/api/docs

3. You'll see an interactive interface where you can:
   - Browse all available endpoints organized by tags
   - View request/response schemas
   - Try out API calls directly in the browser
   - See authentication requirements
   - View examples and error codes

### API Categories

The REST API is organized into the following categories:

#### 1. Cases API (`/api/cases/*`)
- Create and manage investigation cases
- Approve cases
- Export case data with watermarks

**Key Endpoints:**
- `POST /api/cases` - Create new case
- `GET /api/cases/{id}` - Get case by ID
- `POST /api/cases/{id}/approve` - Approve case
- `GET /api/cases/{id}/export` - Export case data

#### 2. Evidence API (`/api/evidence/*`)
- Manage evidence annotations
- Export evidence as PDF

**Key Endpoints:**
- `GET /api/evidence/{id}/annotations` - List annotations
- `POST /api/evidence/{id}/annotations` - Create annotation
- `GET /api/evidence/{id}/pdf` - Export as PDF

#### 3. Ingest API (`/api/ingest/*`)
- Connect to external data sources (Twitter, GitHub, S3, etc.)
- Manage ingestion jobs
- Validate connector configurations

**Key Endpoints:**
- `GET /api/ingest/connectors` - List available connectors
- `POST /api/ingest/start` - Start ingestion job
- `GET /api/ingest/progress/{id}` - Check job progress
- `POST /api/ingest/cancel/{id}` - Cancel job
- `GET /api/ingest/schema/{id}` - Get connector schema
- `POST /api/ingest/dry-run/{id}` - Validate configuration

#### 4. Triage API (`/api/triage/*`)
- AI-powered triage suggestions
- Approve and materialize suggestions

**Key Endpoints:**
- `GET /api/triage/suggestions` - List suggestions
- `POST /api/triage/suggestions` - Create suggestion
- `POST /api/triage/suggestions/{id}/approve` - Approve
- `POST /api/triage/suggestions/{id}/materialize` - Materialize into graph

#### 5. Analytics API (`/api/analytics/*`)
- Link prediction
- Advanced graph analytics

**Key Endpoints:**
- `GET /api/analytics/link-prediction` - Predict potential links

#### 6. Copilot API (`/api/copilot/*`)
- Query cost estimation
- Prompt safety classification
- Query templates

**Key Endpoints:**
- `POST /api/copilot/estimate` - Estimate query cost
- `POST /api/copilot/classify` - Classify prompt safety
- `POST /api/copilot/cookbook` - Get query templates

#### 7. Admin API (`/api/admin/*`)
- User and tenant management
- Audit logs
- Feature flags
- OPA policy management

**Key Endpoints:**
- `GET /api/admin/tenants` - List tenants
- `GET /api/admin/users` - List users
- `GET /api/admin/audit` - Query audit logs
- `GET /api/admin/flags` - Get feature flags
- `PUT /api/admin/flags/{key}` - Update feature flag
- `GET /api/admin/policy` - Get OPA policy
- `PUT /api/admin/policy` - Update OPA policy

#### 8. Versioning API (`/api/versioning/*`) ✨ NEW
- API version information
- Compatibility checking
- Changelogs and migration guides
- Breaking changes documentation

**Key Endpoints:**
- `GET /api/versioning/versions` - List all API versions
- `GET /api/versioning/versions/{version}` - Get version details
- `GET /api/versioning/compatibility` - Get compatibility matrix
- `GET /api/versioning/compatibility/{from}/{to}` - Check version compatibility
- `GET /api/versioning/changelog` - Get full changelog
- `GET /api/versioning/changelog/{version}` - Get version changelog
- `GET /api/versioning/docs/{version}` - Get version documentation
- `GET /api/versioning/openapi/{version}` - Get version OpenAPI spec
- `GET /api/versioning/migration/{from}/{to}` - Get migration guide
- `GET /api/versioning/breaking-changes/{version}` - Get breaking changes
- `GET /api/versioning/status` - Get versioning status

#### 9. Health & Monitoring
- Health checks
- Basic metrics

**Key Endpoints:**
- `GET /health` - Health check (no auth required)
- `GET /metrics` - Basic metrics (no auth required)

### Authentication

Most API endpoints require JWT Bearer token authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

**Exceptions (no auth required):**
- `/health`
- `/metrics`
- `/api/docs/*` (documentation endpoints)
- `/api/ingest/connectors`
- `/api/ingest/schema/{id}`
- `/api/versioning/*` (versioning endpoints)

### Rate Limiting

API requests are rate-limited. Check response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Using the OpenAPI Spec

#### Generate Client SDKs

You can generate client libraries for any language:

```bash
# TypeScript/JavaScript
npx openapi-typescript http://localhost:4000/api/docs/openapi.json --output ./generated/api-types.ts

# Python
openapi-generator-cli generate -i http://localhost:4000/api/docs/openapi.json -g python -o ./client-python

# Go
openapi-generator-cli generate -i http://localhost:4000/api/docs/openapi.json -g go -o ./client-go

# Java
openapi-generator-cli generate -i http://localhost:4000/api/docs/openapi.json -g java -o ./client-java
```

#### Validate API Requests

Enable runtime validation in development:

```bash
# Add to .env
ENABLE_API_VALIDATION=true
```

This validates all requests and responses against the OpenAPI spec.

#### Lint the OpenAPI Spec

```bash
# Install Spectral
npm install -g @stoplight/spectral-cli

# Lint the spec
spectral lint openapi/spec.yaml
```

## GraphQL API Documentation

### Accessing GraphQL Playground

1. Start the API server (same as above)

2. Open your browser to: http://localhost:4000/api/docs/graphql-playground

3. You'll see the Apollo Sandbox with:
   - Interactive query editor with autocomplete
   - Schema explorer
   - Query history
   - Documentation panel

### GraphQL Documentation JSON

Access comprehensive examples and best practices:

```bash
curl http://localhost:4000/api/docs/graphql-docs | jq
```

This returns:
- **Overview** - GraphQL API description
- **Examples** - Query, mutation, and subscription examples
- **Best Practices** - Security and performance tips

### GraphQL Schema (SDL)

Get the raw GraphQL schema:

```bash
curl http://localhost:4000/api/docs/graphql-schema
```

### Key GraphQL Operations

#### Queries
- `entity(id: ID!)` - Get entity by ID
- `searchEntities(query: String!, filter: EntityFilter)` - Search entities
- `findPaths(input: PathfindingInput!)` - Find paths between entities
- `centralityAnalysis(entityIds: [ID!])` - Analyze entity importance
- `communityDetection(entityIds: [ID!], algorithm: String)` - Detect communities
- `investigation(id: ID!)` - Get investigation details

#### Mutations
- `createEntity(input: CreateEntityInput!)` - Create new entity
- `createRelationship(input: CreateRelationshipInput!)` - Create relationship
- `createInvestigation(input: CreateInvestigationInput!)` - Start investigation
- `bulkCreateEntities(entities: [CreateEntityInput!]!)` - Bulk create
- `updateEntity(id: ID!, input: UpdateEntityInput!)` - Update entity
- `mergeEntities(sourceId: ID!, targetId: ID!)` - Merge duplicates

#### Subscriptions
- `entityUpdated(investigationId: ID)` - Subscribe to entity changes
- `relationshipUpdated(investigationId: ID)` - Subscribe to relationship changes
- `investigationUpdated(id: ID!)` - Subscribe to investigation changes
- `analysisCompleted(jobId: ID!)` - Subscribe to analysis completion

### GraphQL Best Practices

1. **Use Persisted Queries** - For production, pre-register queries
2. **Request Only Required Fields** - Avoid over-fetching
3. **Leverage Fragments** - Reuse common field selections
4. **Handle Errors Gracefully** - Check both `data` and `errors` fields
5. **Use Variables** - Never interpolate strings (security risk)
6. **Monitor Complexity** - Be aware of query depth limits

## API Versioning

The IntelGraph Platform supports multiple API versions simultaneously.

### Specifying API Version

#### REST API
Use version in the Accept header:
```bash
curl -H "Accept: application/vnd.intelgraph.v2+json" \
     http://localhost:4000/api/cases
```

Or use versioned GraphQL endpoints:
- `/graphql` - Default/latest version
- `/v1/graphql` - Version 1.x
- `/v2/graphql` - Version 2.x

### Checking Compatibility

Before upgrading, check compatibility:

```bash
# Get all versions
curl http://localhost:4000/api/versioning/versions | jq

# Check compatibility between versions
curl http://localhost:4000/api/versioning/compatibility/1.0.0/2.0.0 | jq

# Get migration guide
curl http://localhost:4000/api/versioning/migration/1.0.0/2.0.0 | jq
```

### Breaking Changes

View breaking changes for a version:

```bash
curl http://localhost:4000/api/versioning/breaking-changes/2.0.0 | jq
```

## Examples

### REST API Example

```bash
# Create a case
curl -X POST http://localhost:4000/api/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Suspicious Transaction Investigation"
  }'

# Response
{
  "ok": true,
  "case": {
    "id": "case123",
    "title": "Suspicious Transaction Investigation",
    "status": "draft",
    "evidence": [],
    "createdAt": "2025-11-29T12:00:00Z"
  }
}
```

### GraphQL Example

```graphql
mutation CreateEntity {
  createEntity(input: {
    type: PERSON
    name: "John Doe"
    description: "Subject of investigation"
    properties: {
      dateOfBirth: "1980-01-01"
      nationality: "US"
    }
    confidence: 0.95
    sourceIds: ["source1"]
  }) {
    id
    type
    name
    description
    confidence
    createdAt
    createdBy {
      id
      email
    }
  }
}
```

## Testing API Documentation

### Smoke Test

The API documentation endpoints are included in the smoke test:

```bash
make smoke
```

### Manual Testing

```bash
# Test Swagger UI loads
curl -I http://localhost:4000/api/docs

# Test OpenAPI spec is valid JSON
curl http://localhost:4000/api/docs/openapi.json | jq '.info'

# Test versioning endpoints
curl http://localhost:4000/api/versioning/status | jq

# Test GraphQL playground loads
curl -I http://localhost:4000/api/docs/graphql-playground
```

## Updating Documentation

### When to Update OpenAPI Spec

Update `/home/user/summit/openapi/spec.yaml` when:
1. Adding new REST endpoints
2. Changing request/response schemas
3. Adding new error codes
4. Updating authentication requirements
5. Modifying rate limits

### Validation Workflow

1. Edit `openapi/spec.yaml`
2. Lint the spec:
   ```bash
   spectral lint openapi/spec.yaml
   ```
3. Test locally:
   ```bash
   make up
   curl http://localhost:4000/api/docs/openapi.json | jq
   ```
4. Verify Swagger UI renders correctly
5. Commit changes

### GraphQL Schema Updates

GraphQL schema documentation is auto-generated from:
- `services/api/src/graphql/schema.js` - Schema definition
- `services/api/src/docs/graphql-docs.ts` - Examples and descriptions

Update examples when adding new:
- Queries
- Mutations
- Subscriptions
- Types

## Troubleshooting

### Swagger UI Not Loading

```bash
# Check API server is running
curl http://localhost:4000/health

# Check OpenAPI spec is accessible
curl http://localhost:4000/api/docs/openapi.json

# Check for YAML syntax errors
spectral lint openapi/spec.yaml
```

### OpenAPI Validation Errors

If you see validation errors with `ENABLE_API_VALIDATION=true`:

1. Check the OpenAPI spec matches your actual implementation
2. Review the error message for field mismatches
3. Update either the spec or implementation to match

### GraphQL Playground Issues

```bash
# Check GraphQL endpoint is accessible
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Additional Resources

### External Tools

- **Swagger Editor**: https://editor.swagger.io/ - Edit and validate OpenAPI specs
- **Postman**: Import OpenAPI spec to generate API collections
- **Insomnia**: Import OpenAPI spec for API testing
- **Apollo Studio**: GraphQL schema management and monitoring

### Internal Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) - Developer onboarding
- [Copilot-Playbook.md](./Copilot-Playbook.md) - AI copilot usage

### Standards

- **OpenAPI 3.0.3**: https://swagger.io/specification/
- **GraphQL**: https://graphql.org/learn/
- **JSON Schema**: https://json-schema.org/

## Contributing

When adding new API endpoints:

1. ✅ Update OpenAPI spec (`openapi/spec.yaml`)
2. ✅ Add examples to Swagger annotations
3. ✅ Document authentication requirements
4. ✅ Include error response schemas
5. ✅ Add to appropriate tag category
6. ✅ Update this documentation if needed
7. ✅ Run `make smoke` to verify

---

**Questions or Issues?**
- File an issue at: https://github.com/BrianCLong/summit/issues
- Contact: IntelGraph Team

**Last Updated**: 2025-11-29
