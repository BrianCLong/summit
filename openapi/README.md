# IntelGraph Platform API Documentation

This directory contains the OpenAPI specifications for the IntelGraph Platform REST API.

## Files

- **`spec.yaml`**: Comprehensive OpenAPI 3.0.3 specification for all REST API endpoints
- **`intelgraph-core-api.yaml`**: Core API specification (legacy)
- **`maestro-orchestration-api.yaml`**: Maestro orchestration API (legacy)

## Accessing the Documentation

The API documentation is automatically served by the IntelGraph API server at the following endpoints:

### Interactive Documentation

- **Swagger UI**: http://localhost:4000/api/docs
  - Interactive API explorer with "Try it out" functionality
  - Organized by tags and operations
  - Supports authentication and request testing

- **ReDoc**: http://localhost:4000/api/docs/redoc
  - Clean, three-panel documentation layout
  - Excellent for reading and reference
  - Better for print/PDF export

- **GraphQL Playground**: http://localhost:4000/api/docs/graphql-playground
  - Interactive GraphQL query editor
  - Schema exploration and autocomplete
  - Variable and header management

### Raw Specifications

- **OpenAPI JSON**: http://localhost:4000/api/docs/openapi.json
- **OpenAPI YAML**: http://localhost:4000/api/docs/openapi.yaml
- **GraphQL Schema**: http://localhost:4000/api/docs/graphql-schema
- **GraphQL Docs**: http://localhost:4000/api/docs/graphql-docs

### Health & Metadata

- **Health**: http://localhost:4000/health
- **Metrics**: http://localhost:4000/metrics
- **Docs Metadata**: http://localhost:4000/api/docs/meta

## Development

### Starting the Documentation Server

The documentation is served automatically when you start the API server:

```bash
# Start all services including API server
make up

# Or start just the API service
pnpm --filter @intelgraph/api dev
```

The documentation will be available immediately at http://localhost:4000/api/docs

### Updating the Specification

To update the API documentation:

1. Edit `openapi/spec.yaml` to reflect API changes
2. Validate the changes:
   ```bash
   python3 -c "import yaml; yaml.safe_load(open('openapi/spec.yaml', 'r'))"
   ```
3. Restart the API server to see changes
4. Test endpoints using Swagger UI's "Try it out" feature

### Generating Client Libraries

You can generate client libraries from the OpenAPI specification using tools like:

- **OpenAPI Generator**: https://openapi-generator.tech/
- **Swagger Codegen**: https://swagger.io/tools/swagger-codegen/
- **openapi-typescript**: https://github.com/drwpow/openapi-typescript

Example:

```bash
# Generate TypeScript client
npx openapi-typescript openapi/spec.yaml --output src/generated/api-types.ts

# Generate Python client
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
  -i /local/openapi/spec.yaml \
  -g python \
  -o /local/clients/python
```

## API Overview

### REST API

The REST API provides endpoints for:

- **Health & Monitoring**: Service health, metrics, status
- **Documentation**: Swagger UI, ReDoc, GraphQL Playground
- **Ingest**: Data ingestion from multiple connectors (Twitter, GitHub, S3, etc.)
- **Copilot**: AI-powered query generation, cost estimation, safety classification
- **Cases**: Investigation case management and approval workflows
- **Evidence**: Evidence annotation, export, and PDF generation
- **Analytics**: Link prediction, graph analytics
- **Triage**: ML suggestion queue with human-in-the-loop approval
- **Admin**: User management, audit logs, feature flags, policy editor

### GraphQL API

The GraphQL API (`/graphql`) provides a comprehensive schema for:

- Entity and relationship management
- Investigation workflows
- Advanced graph analytics (centrality, pathfinding, community detection)
- AI copilot queries
- Real-time subscriptions

See `/api/docs/graphql-docs` for full GraphQL documentation with examples.

## Authentication

All API endpoints (except health and documentation) require JWT Bearer token authentication:

```
Authorization: Bearer <your-jwt-token>
```

Tokens must include appropriate permissions for the requested operations:

- `investigation:read`, `investigation:create`, `investigation:update`
- `relationship:create`
- `analytics:run`
- `data:export`
- `audit:read`
- `user:read`

## Rate Limiting

API requests are subject to rate limiting. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Support

- **Repository**: https://github.com/BrianCLong/summit
- **Issues**: https://github.com/BrianCLong/summit/issues
- **Documentation**: See `/docs` directory for comprehensive platform documentation

## License

MIT License - Copyright (c) 2025 IntelGraph
