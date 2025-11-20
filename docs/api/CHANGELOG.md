# API Changelog

All notable changes to the IntelGraph Platform API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive OpenAPI 3.0 specification for all REST endpoints
- Swagger UI integration at `/api/docs` endpoint
- ReDoc alternative documentation at `/api/docs/redoc`
- GraphQL schema documentation with examples and best practices
- GraphQL Playground at `/api/docs/graphql-playground`
- Request/response validation middleware using OpenAPI schema
- Automated CI validation for API specifications
- Security scanning for API design
- Breaking change detection for OpenAPI and GraphQL schemas
- API usage examples for common workflows
- Comprehensive API reference documentation

### Changed
- REST API endpoints now prefixed with `/api` for consistency
- Updated route paths: `/cases` → `/api/cases`, `/evidence` → `/api/evidence`, etc.
- Enhanced error response format with validation details

### Security
- Added OpenAPI security scanning in CI pipeline
- Implemented request validation against schema
- Added response validation in development mode

---

## [1.0.0] - 2025-01-15

### Added
- Initial API release with REST and GraphQL endpoints
- JWT Bearer token authentication via OIDC
- Multi-tenant support with tenant isolation
- Role-based access control (RBAC)
- Attribute-based access control (ABAC) with OPA
- Audit logging for all sensitive operations
- Rate limiting middleware
- Health check and metrics endpoints

#### REST API Endpoints

**Cases Management:**
- `POST /api/cases` - Create new investigation case
- `GET /api/cases/{id}` - Get case by ID
- `POST /api/cases/{id}/approve` - Approve case
- `GET /api/cases/{id}/export` - Export case data with watermark

**Evidence Management:**
- `GET /api/evidence/{id}/annotations` - List annotations for evidence
- `POST /api/evidence/{id}/annotations` - Create annotation on evidence
- `GET /api/evidence/{id}/pdf` - Export evidence as PDF

**Data Ingestion:**
- `GET /api/ingest/connectors` - List available data connectors
- `POST /api/ingest/start` - Start data ingestion job
- `GET /api/ingest/progress/{id}` - Check ingestion job progress
- `POST /api/ingest/cancel/{id}` - Cancel ingestion job
- `GET /api/ingest/schema/{id}` - Get connector configuration schema
- `POST /api/ingest/dry-run/{id}` - Validate connector configuration

**Triage Workflow:**
- `GET /api/triage/suggestions` - List AI-generated triage suggestions
- `POST /api/triage/suggestions` - Create triage suggestion
- `POST /api/triage/suggestions/{id}/approve` - Approve suggestion
- `POST /api/triage/suggestions/{id}/materialize` - Materialize suggestion into graph

**Analytics:**
- `GET /api/analytics/link-prediction` - Predict potential entity relationships

**AI Copilot:**
- `POST /api/copilot/estimate` - Estimate query computational cost
- `POST /api/copilot/classify` - Classify prompt safety
- `POST /api/copilot/cookbook` - Get query templates and examples

**Administration:**
- `GET /api/admin/tenants` - List all tenants (admin only)
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/audit` - Query audit logs (admin only)
- `POST /api/admin/audit/record` - Record external audit event
- `GET /api/admin/flags` - Get feature flags
- `PUT /api/admin/flags/{key}` - Update feature flag
- `GET /api/admin/policy` - Get OPA policy (dev only)
- `PUT /api/admin/policy` - Update OPA policy (dev only)

**Health & Monitoring:**
- `GET /health` - Service health check
- `GET /metrics` - Basic service metrics

#### GraphQL API

**Queries:**
- `entity(id)` - Get entity by ID
- `entities(filter, limit, offset)` - List entities with filtering
- `searchEntities(query, filter)` - Full-text entity search
- `relationship(id)` - Get relationship by ID
- `relationships(filter, limit, offset)` - List relationships
- `investigation(id)` - Get investigation by ID
- `investigations(status, limit)` - List investigations
- `findPaths(input)` - Graph pathfinding algorithms
- `communityDetection(entityIds, algorithm)` - Detect communities
- `centralityAnalysis(entityIds)` - Analyze entity centrality
- `temporalAnalysis(entityIds, timeWindow)` - Time-series analysis
- `generateQuery(naturalLanguage)` - Generate query from natural language
- `askCopilot(question, context)` - Ask AI assistant questions
- `globalSearch(query, types)` - Global search across types
- `caseById(id)` - Get case by ID
- `caseExport(id)` - Export case data
- `evidenceAnnotations(id)` - List evidence annotations
- `triageSuggestions(caseId)` - List triage suggestions

**Mutations:**
- `createEntity(input)` - Create new entity
- `updateEntity(id, input)` - Update entity
- `deleteEntity(id)` - Delete entity
- `mergeEntities(sourceId, targetId)` - Merge duplicate entities
- `createRelationship(input)` - Create relationship
- `updateRelationship(id, properties, confidence)` - Update relationship
- `deleteRelationship(id)` - Delete relationship
- `createInvestigation(input)` - Create investigation
- `updateInvestigation(id, ...)` - Update investigation
- `deleteInvestigation(id)` - Delete investigation
- `addEntityToInvestigation(investigationId, entityId)` - Add entity to investigation
- `createHypothesis(investigationId, title, description)` - Create hypothesis
- `updateHypothesis(id, confidence, status)` - Update hypothesis
- `bulkCreateEntities(entities)` - Bulk create entities
- `bulkDeleteEntities(ids)` - Bulk delete entities
- `createCase(title)` - Create case
- `approveCase(id)` - Approve case
- `annotateEvidence(id, range, note)` - Annotate evidence
- `triageSuggest(type, data)` - Create triage suggestion
- `triageApprove(id)` - Approve triage suggestion
- `triageMaterialize(id)` - Materialize triage suggestion

**Subscriptions:**
- `entityUpdated(investigationId)` - Subscribe to entity updates
- `relationshipUpdated(investigationId)` - Subscribe to relationship updates
- `investigationUpdated(id)` - Subscribe to investigation updates
- `analysisCompleted(jobId)` - Subscribe to analytics completion

### Security
- OIDC/JWT authentication with RS256 signature verification
- JWKS-based public key rotation
- Token blacklist support via Redis
- Nonce-based replay attack prevention for audit webhooks
- OPA-based policy enforcement
- Field-level access control in GraphQL
- Query complexity limiting
- Rate limiting per endpoint
- Audit logging with IP tracking
- Security headers via Helmet.js
- CORS with origin whitelist

---

## Migration Guides

### Migrating to v1.0.0

No migration needed for initial release.

### Breaking Changes Policy

We follow semantic versioning:
- **Major version** (X.0.0): Breaking changes
- **Minor version** (0.X.0): New features, backward compatible
- **Patch version** (0.0.X): Bug fixes, backward compatible

Breaking changes will be:
1. Announced in advance via changelog
2. Documented with migration guides
3. Deprecated for at least one minor version before removal
4. Detected automatically in CI for all pull requests

---

## Deprecation Notices

None currently.

---

## Support

For questions about API changes or migration assistance:
- Review the [API Documentation](./README.md)
- Check the [OpenAPI Specification](../../openapi/spec.yaml)
- Contact your system administrator

---

[Unreleased]: https://github.com/your-org/intelgraph/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/intelgraph/releases/tag/v1.0.0
