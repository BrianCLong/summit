# API Version Policy

> **Version:** 1.0.0
> **Last Updated:** 2025-12-27
> **Owner:** Platform Engineering Team
> **Status:** ACTIVE

## Purpose

This document establishes the API versioning policy for Summit GA, ensuring:

- **Contract Stability**: Breaking changes are never introduced to existing versions
- **Predictable Evolution**: Clear rules for when version bumps are required
- **Client Protection**: Guaranteed backward compatibility within major versions
- **Compliance**: SOC 2 change management controls (CC8.1, CC3.1, PI1.5)

## Semantic Versioning for APIs

Summit uses **simplified semantic versioning** for API contracts:

### Version Format: `v{MAJOR}`

- **Major Version** (v1, v2, v3): Breaking changes to API contracts
- Minor/patch changes are handled transparently within major versions
- Version is specified in URL path: `/api/v1/`, `/api/v2/`, etc.

### Breaking Changes (Require Major Version Bump)

The following changes **MUST** trigger a new major version:

#### REST API Breaking Changes

- ❌ Removing an endpoint
- ❌ Removing a request/response field
- ❌ Renaming a field
- ❌ Changing field types (e.g., string → number)
- ❌ Making optional fields required
- ❌ Changing HTTP method (GET → POST)
- ❌ Changing response status codes
- ❌ Adding required request parameters
- ❌ Removing support for a request format
- ❌ Changing authentication requirements
- ❌ Modifying URL structure

#### GraphQL Breaking Changes

- ❌ Removing a type or field
- ❌ Renaming a type or field
- ❌ Changing field types in incompatible ways
- ❌ Adding non-null constraints to existing fields
- ❌ Removing enum values
- ❌ Changing input validation rules (more restrictive)

### Non-Breaking Changes (Safe Within Version)

The following changes are **ALLOWED** without version bump:

#### REST API Safe Changes

- ✅ Adding new endpoints
- ✅ Adding optional request parameters
- ✅ Adding new fields to responses
- ✅ Adding new error codes (with fallback handling)
- ✅ Deprecating (but not removing) fields
- ✅ Making required fields optional
- ✅ Relaxing validation rules

#### GraphQL Safe Changes

- ✅ Adding new types
- ✅ Adding new fields to existing types
- ✅ Adding new queries/mutations
- ✅ Adding new enum values
- ✅ Making non-null fields nullable
- ✅ Deprecating (but not removing) fields

## Version Detection

### Primary: URL Path Versioning

```
https://api.summit.io/api/v1/runbooks
https://api.summit.io/api/v2/runbooks
```

**Benefits:**

- Explicit and visible in logs
- Easy to cache at CDN/proxy level
- Simple to test with curl/Postman
- No ambiguity

### Secondary: Accept-Version Header

Clients may optionally specify version via header:

```http
GET /api/runbooks
Accept-Version: v1
```

**Priority Order:**

1. URL path (`/api/v1/`) - highest priority
2. `Accept-Version` header
3. Default version (currently v1)

### Version Response Headers

All API responses include version metadata:

```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Latest-Version: v1
X-API-Deprecation: false
```

## Deprecation Process

### Timeline

1. **T+0 (Announcement)**: Version marked as deprecated
   - Deprecation notice added to docs
   - `X-API-Deprecation: true` header added to responses
   - Sunset date announced (minimum 12 months notice)

2. **T+6 months (Warning Period)**: Active warnings
   - `X-API-Sunset-Date` header added
   - Deprecation warnings in API responses
   - Client notifications sent

3. **T+12 months (Sunset)**: Version EOL
   - Version returns HTTP 410 Gone
   - All requests fail with upgrade message
   - Client must migrate to new version

### Deprecation Headers

```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Deprecation: true
X-API-Sunset-Date: 2026-12-27T00:00:00Z
X-API-Warn: API v1 will be sunset on 2026-12-27. Please upgrade to v2.
```

### After Sunset

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": "version_sunset",
  "message": "API version v1 has been sunset as of 2026-12-27",
  "currentVersion": "v1",
  "latestVersion": "v2",
  "migrationGuide": "https://docs.summit.io/api/v1-to-v2-migration"
}
```

## Schema Snapshots

### Storage Location

- **Path**: `/api-schemas/v{MAJOR}/`
- **GraphQL**: `graphql-schema-v{MAJOR}.graphql`
- **OpenAPI**: `openapi-spec-v{MAJOR}.json`
- **Metadata**: `version-metadata.json`

### Snapshot Metadata Format

```json
{
  "version": "v1",
  "status": "active",
  "createdAt": "2025-12-27T00:00:00Z",
  "updatedAt": "2025-12-27T00:00:00Z",
  "sunsetDate": null,
  "schemaHash": {
    "graphql": "sha256:abc123...",
    "openapi": "sha256:def456..."
  },
  "changelog": [
    {
      "date": "2025-12-27",
      "type": "creation",
      "description": "Initial v1 schema snapshot"
    }
  ]
}
```

## CI/CD Schema Validation

### Automated Checks (Every PR)

1. **Schema Diff**: Compare current schema against snapshot
2. **Breaking Change Detection**: Categorize changes as breaking/non-breaking
3. **Version Validation**: If breaking changes detected, require version bump
4. **Merge Blocking**: PRs with breaking changes cannot merge without version increment

### Diff Report Format

```json
{
  "timestamp": "2025-12-27T12:00:00Z",
  "baseVersion": "v1",
  "hasBreakingChanges": true,
  "summary": {
    "breaking": 2,
    "nonBreaking": 3,
    "deprecated": 1
  },
  "breakingChanges": [
    {
      "type": "field_removed",
      "location": "Query.globalSearch",
      "severity": "critical",
      "message": "Field 'globalSearch' was removed from type 'Query'"
    }
  ],
  "nonBreakingChanges": [...],
  "recommendations": [
    "Breaking changes detected - create new major version (v2)",
    "Update VERSION_POLICY.md with migration guide"
  ]
}
```

## Migration Process

### Creating a New Version

When breaking changes are needed:

1. **Create new schema snapshots**:

   ```bash
   npm run schema:snapshot -- --version v2
   ```

2. **Update version policy**:
   - Add v2 to version registry
   - Document breaking changes
   - Create migration guide

3. **Implement compatibility layer** (optional):
   - Transform v1 requests to v2 format
   - Transform v2 responses to v1 format
   - Allows gradual migration

4. **Update routing**:
   - Add `/api/v2/` routes
   - Maintain `/api/v1/` unchanged

5. **Communicate to clients**:
   - Announce new version
   - Provide migration timeline
   - Share migration guide

### Version Registry

Maintained in `/api-schemas/registry.json`:

```json
{
  "current": "v1",
  "latest": "v1",
  "supported": ["v1"],
  "deprecated": [],
  "sunset": [],
  "versions": {
    "v1": {
      "status": "active",
      "releaseDate": "2025-12-27",
      "sunsetDate": null,
      "schemaPath": "/api-schemas/v1/",
      "documentationUrl": "https://docs.summit.io/api/v1"
    }
  }
}
```

## SOC 2 Control Mapping

This policy supports the following SOC 2 controls:

### CC8.1 - Change Management Authorization

- **Control**: All API changes require approval and follow defined process
- **Evidence**:
  - Schema diff reports in PRs
  - Breaking change detection logs
  - Version increment approvals
  - CI/CD validation results

### CC3.1 - Risk Management in Design

- **Control**: Risk assessment before introducing changes
- **Evidence**:
  - Breaking vs non-breaking change categorization
  - Impact analysis in diff reports
  - Deprecation timeline enforcement

### PI1.5 - Processing Integrity at System Boundaries

- **Control**: Inputs and outputs meet specifications
- **Evidence**:
  - Schema validation in CI/CD
  - Contract compliance testing
  - Version-specific request/response validation

## Best Practices

### For API Consumers

1. **Always specify version explicitly**

   ```javascript
   // Good
   fetch("/api/v1/runbooks");

   // Bad - relies on default
   fetch("/api/runbooks");
   ```

2. **Monitor deprecation headers**

   ```javascript
   if (response.headers.get("X-API-Deprecation") === "true") {
     logger.warn("API version deprecated", {
       version: response.headers.get("X-API-Version"),
       sunsetDate: response.headers.get("X-API-Sunset-Date"),
     });
   }
   ```

3. **Plan migrations early** - Don't wait until sunset date

### For API Developers

1. **Prefer additive changes** - Add new fields rather than modifying existing
2. **Use feature flags** - Test changes before releasing
3. **Document all changes** - Update changelog with every schema change
4. **Test compatibility** - Ensure new changes don't break existing clients
5. **Run schema diff locally** before submitting PR:
   ```bash
   npm run schema:diff
   ```

## Enforcement

- **CI/CD**: Automated schema diff runs on every PR
- **Required Approvals**: Breaking changes require platform team approval
- **Merge Blocking**: PRs with unacknowledged breaking changes are blocked
- **Audit Trail**: All schema changes logged in audit/ga-evidence/api-contracts/

## References

- API Versioning Strategy: `/docs/API_VERSIONING.md`
- Schema Snapshots: `/api-schemas/`
- Evidence Repository: `/audit/ga-evidence/api-contracts/`
- CI Workflow: `/.github/workflows/schema-diff.yml`

## Changelog

| Date       | Version | Changes                                         |
| ---------- | ------- | ----------------------------------------------- |
| 2025-12-27 | 1.0.0   | Initial version policy created for GA hardening |

---

**Approval**: This policy is part of GA-E3: API Contracts initiative.
**Next Review**: 2026-06-27
