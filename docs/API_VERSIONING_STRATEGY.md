# API Versioning Strategy

> **Last Updated**: 2025-01-15
> **Status**: Official
> **Owner**: Platform Engineering Team

## Overview

The IntelGraph Platform uses a comprehensive API versioning strategy to ensure backward compatibility, smooth migrations, and clear communication of changes to API consumers.

## Versioning Scheme

We follow **Semantic Versioning** (SemVer) for all APIs:

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes that require client updates
- **MINOR**: New features added in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

### Current Versions

| API Surface | Current Version | Stability | Support Status |
|-------------|----------------|-----------|----------------|
| **REST API** | `v1.0.0` | Stable | ✅ Supported |
| **GraphQL API** | `v2.1.0` | Stable | ✅ Supported |
| **WebSocket API** | `v1.0.0` | Beta | ⚠️ Preview |

## Version Communication

### REST API

REST API versions are communicated via URL path:

```
https://api.intelgraph.ai/v1/cases
https://api.intelgraph.ai/v2/graphs
```

### GraphQL API

GraphQL API version is included in the schema description and can be queried:

```graphql
query {
  __schema {
    description
  }
}
```

### OpenAPI Specifications

Each API version has a corresponding OpenAPI specification:

- `/openapi/spec.yaml` → REST API v1
- `/openapi/intelgraph-core-api.yaml` → Core API v2

## Deprecation Policy

### Timeline

1. **Announcement**: Minimum 6 months before deprecation
2. **Warning Period**: 3 months with deprecation warnings in responses
3. **End of Life (EOL)**: API version becomes unavailable

### Communication Channels

- 📧 Email notifications to registered API consumers
- 📝 Release notes and changelog
- 🚨 Deprecation warnings in HTTP headers:
  ```
  Warning: 299 - "This API version will be deprecated on 2025-12-31"
  Sunset: Tue, 31 Dec 2025 23:59:59 GMT
  ```

### Migration Support

- Migration guides provided at deprecation announcement
- Parallel support for old and new versions during transition
- Dedicated support channel for migration assistance

## Breaking Changes

Breaking changes require a MAJOR version bump and include:

- Removing endpoints or fields
- Changing required fields
- Modifying response structure
- Changing authentication mechanisms
- Altering error codes or messages

### Example: v1 → v2 Migration

**v1 (Deprecated):**
```json
POST /api/v1/entity
{
  "name": "John Doe",
  "type": "person"
}
```

**v2 (Current):**
```json
POST /api/v2/entities
{
  "properties": {
    "name": "John Doe"
  },
  "type": "Person",
  "metadata": {
    "source": "manual"
  }
}
```

## Non-Breaking Changes

Non-breaking changes require only MINOR or PATCH version bumps:

- Adding new optional fields
- Adding new endpoints
- Adding new enum values (with graceful fallback)
- Performance improvements
- Bug fixes

## Version Negotiation

### Content Negotiation (Planned)

Future versions may support content negotiation via Accept headers:

```http
GET /api/graphs
Accept: application/vnd.intelgraph.v2+json
```

### API Keys & Version Binding

API keys can be bound to specific API versions for stability:

```http
GET /api/graphs
X-API-Key: ig_prod_abc123
X-API-Version: 2.1.0
```

## GraphQL Versioning

GraphQL follows a **continuous evolution** model rather than versioning:

- Fields are deprecated using `@deprecated` directive
- New fields are added without breaking existing queries
- Clients explicitly request fields they need

```graphql
type Entity {
  id: ID!
  name: String!
  type: String! @deprecated(reason: "Use 'entityType' instead")
  entityType: EntityType!
}
```

## Version Support Matrix

| Version | Release Date | EOL Date | Status |
|---------|-------------|----------|---------|
| v2.1.0 | 2025-01-01 | - | ✅ Current |
| v2.0.0 | 2024-06-01 | 2025-12-31 | ⚠️ Supported |
| v1.0.0 | 2023-01-01 | 2025-06-30 | ⚠️ Deprecated |

## SDK Versioning

Client SDKs follow the same versioning as the API:

- **TypeScript SDK**: `@intelgraph/sdk@2.1.0`
- **Python SDK**: `intelgraph-sdk==2.1.0`

SDKs are generated from OpenAPI specifications and guarantee compatibility with the corresponding API version.

## Testing Strategy

### Compatibility Testing

- Automated tests for each API version
- Contract testing between API versions
- Client SDK tests against all supported API versions

### Canary Deployments

New API versions are deployed using canary releases:

1. **Internal testing** (10% of traffic)
2. **Beta users** (25% of traffic)
3. **General availability** (100% of traffic)

## Monitoring & Metrics

We track:

- API version usage distribution
- Deprecated endpoint call rates
- Migration progress metrics
- Error rates by API version

## Best Practices for API Consumers

### ✅ DO

- Pin to a specific API version in production
- Subscribe to deprecation notifications
- Test new versions in staging before production
- Use generated SDKs when available
- Handle deprecation warnings gracefully

### ❌ DON'T

- Use "latest" or unversioned endpoints in production
- Ignore deprecation warnings
- Parse error messages for business logic
- Assume field order in JSON responses
- Cache responses without considering TTL headers

## Future Considerations

### GraphQL Federation

As we expand to a federated GraphQL architecture, versioning will be applied at the subgraph level with schema composition handling compatibility.

### gRPC APIs

For high-performance use cases, we may introduce gRPC APIs with protobuf-based versioning.

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.3)
- [Semantic Versioning](https://semver.org/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [API Deprecation Guidelines](https://tools.ietf.org/html/rfc8594)

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-01-15 | 1.0.0 | Initial API versioning strategy | Platform Team |

---

**Questions or Feedback?**
Contact: api-platform@intelgraph.ai
