# API Versioning Infrastructure

Comprehensive API versioning system for the IntelGraph Summit platform.

## Features

- **Multiple Version Negotiation Strategies**: URL path, Accept header, custom headers, query parameters
- **Version Routing**: Express routers for clean version separation
- **Deprecation Management**: RFC-compliant deprecation headers with sunset dates
- **Schema Diff Analysis**: OpenAPI schema comparison with breaking change detection
- **TypeScript Support**: Full type definitions with JSDoc comments

## Quick Start

### 1. Basic Version Detection

```typescript
import { getAPIVersion, APIVersion } from "./api-versioning";

app.use((req, res, next) => {
  const version = getAPIVersion(req);
  console.log("API Version:", version);
  next();
});
```

### 2. Versioned Routers

```typescript
import { versionRouter, APIVersion } from "./api-versioning";

// Create version-specific routers
const v1Router = versionRouter(APIVersion.V1);
const v2Router = versionRouter(APIVersion.V2);
const v3Router = versionRouter(APIVersion.V3);

// Define version-specific handlers
v1Router.get("/users", getUsersV1);
v2Router.get("/users", getUsersV2);
v3Router.get("/users", getUsersV3);

// Mount routers
app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);
app.use("/api/v3", v3Router);
```

### 3. Deprecation Middleware

```typescript
import { deprecationMiddleware, APIVersion } from "./api-versioning";

// Deprecate v1 API
app.use(
  "/api/v1",
  deprecationMiddleware({
    version: APIVersion.V1,
    sunsetDate: new Date("2026-12-31"),
    message: "API v1 is deprecated. Please migrate to v3.",
    migrationGuide: "https://docs.intelgraph.tech/migration/v1-to-v3",
  })
);
```

Response headers will include:

```
Deprecation: true
Sunset: Fri, 31 Dec 2026 23:59:59 GMT
Warning: 299 - "API v1 is deprecated. Please migrate to v3." "..."
Link: <https://docs.intelgraph.tech/migration/v1-to-v3>; rel="deprecation"
X-API-Deprecated: v1
X-API-Sunset-Date: 2026-12-31T23:59:59.000Z
```

### 4. Schema Version Management

```typescript
import { SchemaVersionManager } from "./api-versioning";

const manager = new SchemaVersionManager({
  schemaDir: "./schemas",
  filePattern: "openapi-{version}.json",
});

// Load schemas
await manager.loadSchema("v1");
await manager.loadSchema("v2");

// Compute diff
const diff = await manager.computeDiff("v1", "v2");

if (diff.hasBreakingChanges) {
  console.error("Breaking changes detected:");
  console.error(manager.exportDiffReport(diff, "text"));
}
```

### 5. Version Negotiation Middleware

```typescript
import { versionNegotiationMiddleware, VersionedRequest } from "./api-versioning";

app.use(versionNegotiationMiddleware());

app.get("/api/users", (req: Request, res: Response) => {
  const version = (req as VersionedRequest).apiVersion;

  switch (version) {
    case APIVersion.V1:
      return res.json(getUsersV1());
    case APIVersion.V2:
      return res.json(getUsersV2());
    case APIVersion.V3:
      return res.json(getUsersV3());
    default:
      return res.status(406).json({ error: "Unsupported version" });
  }
});
```

### 6. Validate Supported Versions

```typescript
import { validateAPIVersion, APIVersion } from "./api-versioning";

// Only allow v2 and v3
app.use(validateAPIVersion([APIVersion.V2, APIVersion.V3]));
```

## Version Negotiation Strategies

### 1. URL Path (Recommended)

```bash
GET /api/v1/users
GET /api/v2/users
GET /api/v3/users
```

### 2. Accept Header (Content Negotiation)

```bash
GET /api/users
Accept: application/vnd.intelgraph.v1+json
```

### 3. Custom Header

```bash
GET /api/users
X-API-Version: v2
```

### 4. Query Parameter

```bash
GET /api/users?version=v3
```

## API Versions

| Version | Status     | Sunset Date | Notes              |
| ------- | ---------- | ----------- | ------------------ |
| v1      | Deprecated | 2026-12-31  | Initial release    |
| v1.1    | Deprecated | 2026-12-31  | Minor enhancements |
| v2      | Supported  | TBD         | Major refactor     |
| v3      | Current    | N/A         | Latest stable      |

## Schema Diff Analysis

The `SchemaVersionManager` provides comprehensive schema comparison:

```typescript
const diff = await manager.computeDiff("v1", "v2");

console.log("Added paths:", diff.addedPaths);
console.log("Removed paths:", diff.removedPaths);
console.log("Modified paths:", diff.modifiedPaths);
console.log("Breaking changes:", diff.breakingChanges);
```

### Breaking Change Detection

The system automatically detects:

- **Removed endpoints**: `removed_path`
- **Removed required parameters**: `removed_parameter`
- **Type changes**: `changed_type`
- **Removed response codes**: `removed_response`
- **Changed constraints**: `changed_constraint`

Each breaking change includes:

- `type`: Category of change
- `path`: Affected endpoint
- `description`: Human-readable explanation
- `severity`: `high`, `medium`, or `low`

## Integration Example

```typescript
import express from "express";
import {
  APIVersion,
  versionRouter,
  versionNegotiationMiddleware,
  validateAPIVersion,
  deprecationMiddleware,
} from "./api-versioning";

const app = express();

// Global version negotiation
app.use(versionNegotiationMiddleware());

// V1 Router (deprecated)
const v1Router = versionRouter(APIVersion.V1);
v1Router.use(
  deprecationMiddleware({
    version: APIVersion.V1,
    sunsetDate: new Date("2026-12-31"),
    migrationGuide: "https://docs.intelgraph.tech/migration/v1-to-v3",
  })
);
v1Router.get("/users", getUsersV1);
app.use("/api/v1", v1Router);

// V2 Router (supported)
const v2Router = versionRouter(APIVersion.V2);
v2Router.get("/users", getUsersV2);
app.use("/api/v2", v2Router);

// V3 Router (current)
const v3Router = versionRouter(APIVersion.V3);
v3Router.get("/users", getUsersV3);
app.use("/api/v3", v3Router);

// Validate only v2 and v3 are supported
app.use("/api", validateAPIVersion([APIVersion.V2, APIVersion.V3]));

app.listen(4000);
```

## Best Practices

1. **Use URL-based versioning** for public APIs (clearest for consumers)
2. **Add deprecation headers** at least 6-12 months before sunset
3. **Run schema diffs** in CI/CD to catch breaking changes early
4. **Document migration guides** for each major version transition
5. **Support at least N-1 versions** (current + previous major)
6. **Use semantic versioning** (major.minor) for API versions

## Testing

```typescript
import request from "supertest";
import { APIVersion } from "./api-versioning";

describe("API Versioning", () => {
  it("should detect version from URL", async () => {
    const response = await request(app).get("/api/v1/users");
    expect(response.headers["x-api-deprecated"]).toBe("v1");
  });

  it("should detect version from Accept header", async () => {
    const response = await request(app)
      .get("/api/users")
      .set("Accept", "application/vnd.intelgraph.v2+json");
    // Assert v2 behavior
  });

  it("should reject unsupported versions", async () => {
    const response = await request(app).get("/api/v99/users");
    expect(response.status).toBe(406);
  });
});
```

## References

- [RFC 8594 - Sunset HTTP Header](https://www.rfc-editor.org/rfc/rfc8594.html)
- [RFC 7234 - HTTP Caching (Warning header)](https://www.rfc-editor.org/rfc/rfc7234.html)
- [RFC 8288 - Web Linking](https://www.rfc-editor.org/rfc/rfc8288.html)
- [OpenAPI Specification](https://swagger.io/specification/)
- [API Versioning Best Practices](https://www.infoq.com/articles/rest-api-versioning/)
