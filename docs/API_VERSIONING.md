# API Versioning Strategy

> **Version:** 1.0
> **Last Updated:** 2025-11-21
> **Author:** IntelGraph Platform Team

## Table of Contents

1. [Overview](#overview)
2. [Versioning Approach](#versioning-approach)
3. [Version Detection](#version-detection)
4. [Backward Compatibility](#backward-compatibility)
5. [Deprecation Policy](#deprecation-policy)
6. [Migration Guides](#migration-guides)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)
9. [Examples](#examples)

---

## Overview

The IntelGraph API uses a comprehensive versioning strategy that supports:

- **Multiple concurrent API versions** with graceful degradation
- **URL-based and header-based versioning** for flexibility
- **Automatic deprecation warnings** to guide developers
- **Version compatibility layer** for seamless transitions
- **Version-specific documentation** for each API version
- **Automated changelog generation** from commit messages
- **Migration guides** between versions

### Key Principles

1. **Stability**: Existing API versions remain stable and unchanged
2. **Transparency**: All changes are documented with clear migration paths
3. **Compatibility**: Automatic transformation between compatible versions
4. **Flexibility**: Multiple versioning methods to suit different use cases
5. **Discoverability**: Clear deprecation warnings and version headers

---

## Versioning Approach

### Semantic Versioning

We use simplified semantic versioning:

- **Major versions** (v1, v2, v3): Breaking changes to API contracts
- **Minor versions** within major (optional): New features, backward compatible
- **Patch versions**: Not exposed in API URLs (handled transparently)

### URL-Based Versioning

The primary versioning method uses URL paths:

```
https://api.intelgraph.io/v1/graphql
https://api.intelgraph.io/v2/graphql
https://api.intelgraph.io/v1/api/entities
```

**Advantages:**
- Explicit and visible in logs
- Easy to cache at CDN/proxy level
- Simple to test with tools like curl
- Clear separation of versions

### Header-Based Versioning

Alternative method using HTTP headers:

**Option 1: API-Version header**
```http
GET /graphql
API-Version: v1
```

**Option 2: Accept header**
```http
GET /graphql
Accept: application/vnd.intelgraph.v1+json
```

**Advantages:**
- Clean URLs
- Easier to change versions programmatically
- Better for versioning with content negotiation

### Version Priority

When multiple version indicators are present, the priority order is:

1. URL path (`/v1/graphql`)
2. `API-Version` header
3. `Accept` header
4. Default version (currently `v1`)

---

## Version Detection

### Automatic Detection

The version middleware automatically detects and validates the API version:

```typescript
import { versionMiddleware } from './versioning';

app.use(versionMiddleware);
```

### Version Context

Once detected, version information is attached to the request:

```typescript
import { getVersionContext } from './versioning';

app.get('/api/entities', (req, res) => {
  const versionCtx = getVersionContext(req);

  console.log(versionCtx.resolvedVersion);  // 'v1'
  console.log(versionCtx.isDeprecated);     // false
  console.log(versionCtx.warnings);         // []
});
```

### Response Headers

All responses include version information headers:

```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Latest-Version: v2
X-API-Version-Detection: url
```

For deprecated versions:

```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Deprecation: true
X-API-Sunset-Date: 2025-12-31T00:00:00.000Z
X-API-Warn: API version v1 is deprecated and will be sunset on 2025-12-31
```

---

## Backward Compatibility

### Compatibility Matrix

The system maintains a compatibility matrix between versions:

| From → To | v1  | v2  |
|-----------|-----|-----|
| **v1**    | ✅  | ✅  |
| **v2**    | ✅  | ✅  |

✅ = Compatible with automatic transformation
❌ = Not compatible
⚠️ = Compatible with manual intervention

### Automatic Transformation

The compatibility layer automatically transforms requests and responses between compatible versions:

```typescript
import { compatibilityLayer } from './versioning';

// Transform v1 request to v2 format
const transformedRequest = await compatibilityLayer.transformRequest(
  requestData,
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    operation: 'createEntity',
    path: '/graphql'
  }
);

// Transform v2 response back to v1 format
const transformedResponse = await compatibilityLayer.transformResponse(
  responseData,
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    operation: 'createEntity',
    path: '/graphql'
  }
);
```

### Example: Confidence Value Transformation

**v1 → v2**: Decimal (0-1) to Percentage (0-100)

```javascript
// v1 request
{
  "confidence": 0.95  // 95% confidence
}

// Automatically transformed to v2
{
  "confidence": 95     // 95% confidence
}
```

**v2 → v1**: Percentage (0-100) to Decimal (0-1)

```javascript
// v2 response
{
  "confidence": 95     // 95% confidence
}

// Automatically transformed to v1
{
  "confidence": 0.95  // 95% confidence
}
```

---

## Deprecation Policy

### Deprecation Timeline

1. **Announcement** (T+0): Version marked as deprecated
2. **Warning Period** (6 months): Deprecation warnings in responses
3. **Sunset** (T+12 months): Version no longer supported

### Deprecation Process

When a version is deprecated:

```typescript
import { versionRegistry } from './versioning';

// Deprecate v1 with sunset date
versionRegistry.deprecateVersion(
  'v1',
  new Date('2025-12-31')
);
```

### Client Notifications

Deprecated versions receive warning headers:

```http
X-API-Warn: API version v1 is deprecated and will be sunset on 2025-12-31
X-API-Deprecation: true
X-API-Sunset-Date: 2025-12-31T00:00:00.000Z
```

### Blocking Deprecated Versions

In production, you can optionally block deprecated versions:

```typescript
import { blockDeprecatedVersions } from './versioning';

// Block deprecated versions (optional)
app.use(blockDeprecatedVersions);
```

With `BLOCK_DEPRECATED_VERSIONS=true` in environment:

```http
HTTP/1.1 426 Upgrade Required
{
  "error": "deprecated_version",
  "message": "API version v1 is deprecated",
  "latestVersion": "v2",
  "upgradeRequired": true
}
```

---

## Migration Guides

### Automatic Generation

Migration guides are automatically generated for compatible versions:

```typescript
import { documentationGenerator } from './versioning';

const doc = documentationGenerator.generateDocumentation('v1');
const migrationGuides = doc.migrationGuides;

// Get specific migration guide
const v1ToV2 = migrationGuides.find(
  g => g.fromVersion === 'v1' && g.toVersion === 'v2'
);

console.log(v1ToV2.breakingChanges);
console.log(v1ToV2.steps);
console.log(v1ToV2.codeExamples);
```

### Migration Guide Structure

Each migration guide includes:

1. **Overview**: Summary of changes
2. **Breaking Changes**: List of breaking changes with impact assessment
3. **Migration Steps**: Step-by-step instructions
4. **Code Examples**: Before/after code samples
5. **Testing Checklist**: What to test after migration

### Example Migration: v1 → v2

#### Breaking Changes

1. **Confidence values**: Changed from decimal (0-1) to percentage (0-100)
2. **globalSearch deprecated**: Use `searchEntities` instead

#### Migration Steps

**Step 1: Update API endpoints**

```diff
- const API_URL = 'https://api.intelgraph.io/v1/graphql';
+ const API_URL = 'https://api.intelgraph.io/v2/graphql';
```

**Step 2: Update confidence values**

```diff
  mutation {
    createEntity(input: {
      type: PERSON
      name: "John Doe"
-     confidence: 0.95
+     confidence: 95
      sourceIds: ["src-123"]
    }) {
      id
    }
  }
```

**Step 3: Replace deprecated methods**

```diff
  query {
-   globalSearch(query: "investigation", types: ["PERSON"]) {
+   searchEntities(query: "investigation", filter: { types: [PERSON] }) {
      id
      name
    }
  }
```

---

## Best Practices

### For API Consumers

#### 1. Always Specify Version

**Good:**
```javascript
const response = await fetch('https://api.intelgraph.io/v1/graphql', {
  headers: {
    'API-Version': 'v1',
    'Authorization': `Bearer ${token}`
  }
});
```

**Bad:**
```javascript
// Don't rely on default version
const response = await fetch('https://api.intelgraph.io/graphql');
```

#### 2. Monitor Deprecation Headers

```javascript
const response = await fetch(url);

if (response.headers.get('X-API-Deprecation') === 'true') {
  console.warn(
    'API version deprecated:',
    response.headers.get('X-API-Warn')
  );

  // Log to monitoring system
  logger.warn({
    event: 'deprecated_api_version',
    version: response.headers.get('X-API-Version'),
    sunsetDate: response.headers.get('X-API-Sunset-Date')
  });
}
```

#### 3. Plan Migrations Early

- Start migration planning when deprecation is announced
- Don't wait until sunset date
- Test migrations in staging environment
- Use compatibility mode during transition

#### 4. Use Version Headers for Testing

Test against multiple versions:

```javascript
// Test v1
await testWithVersion('v1');

// Test v2
await testWithVersion('v2');

async function testWithVersion(version) {
  const response = await fetch(url, {
    headers: { 'API-Version': version }
  });
  // ... assertions
}
```

### For API Developers

#### 1. Maintain Backward Compatibility

**Good:**
```typescript
// Adding optional fields is safe
type Entity = {
  id: string;
  name: string;
  newField?: string;  // Optional, backward compatible
};
```

**Bad:**
```typescript
// Removing or changing required fields is breaking
type Entity = {
  id: string;
  // name: string;  // BREAKING: Removed required field
  fullName: string;  // BREAKING: Renamed field
};
```

#### 2. Use Gradual Deprecation

```typescript
// Mark field as deprecated with replacement
type Query = {
  /**
   * @deprecated Use searchEntities instead
   * Will be removed in v3
   */
  globalSearch(query: string): Entity[];

  // New recommended method
  searchEntities(query: string, filter: EntityFilter): Entity[];
};
```

#### 3. Document All Changes

```typescript
import { changelogAutomation } from './versioning';

// Add changelog entry
changelogAutomation.addEntry('v2', {
  type: 'breaking',
  description: 'Changed confidence field to percentage (0-100) instead of decimal (0-1)',
  ticket: '#12345',
  migration: 'Multiply all confidence values by 100'
});
```

#### 4. Test Cross-Version Compatibility

```typescript
import { compatibilityLayer } from './versioning';

describe('v1 to v2 compatibility', () => {
  it('transforms confidence values', () => {
    const v1Data = { confidence: 0.95 };
    const v2Data = compatibilityLayer.transformV1toV2Request(v1Data);

    expect(v2Data.confidence).toBe(95);
  });
});
```

#### 5. Generate Documentation

```typescript
import { documentationGenerator } from './versioning';

// Generate markdown docs
const markdown = documentationGenerator.generateMarkdown('v2');
fs.writeFileSync('docs/api-v2.md', markdown);

// Generate OpenAPI spec
const openapi = documentationGenerator.generateOpenAPI('v2');
fs.writeFileSync('docs/openapi-v2.json', JSON.stringify(openapi, null, 2));
```

---

## API Reference

### Version Registry

```typescript
import { versionRegistry } from './versioning';

// Get version info
const v1 = versionRegistry.getVersion('v1');
console.log(v1.status);           // 'active' | 'deprecated' | 'sunset'
console.log(v1.releaseDate);
console.log(v1.changelog);

// Check status
versionRegistry.isDeprecated('v1');     // false
versionRegistry.isSunset('v1');         // false

// Get versions
versionRegistry.getActiveVersions();    // [v1, v2]
versionRegistry.getLatestVersion();     // 'v2'
versionRegistry.getDefaultVersion();    // 'v1'

// Compatibility
versionRegistry.isCompatible('v1', 'v2');  // true
const compat = versionRegistry.getCompatibility('v1', 'v2');
console.log(compat.autoMigrate);           // true
console.log(compat.warnings);

// Manage versions
versionRegistry.deprecateVersion('v1', new Date('2025-12-31'));
versionRegistry.sunsetVersion('v0');
```

### Version Middleware

```typescript
import {
  versionMiddleware,
  requireVersion,
  blockDeprecatedVersions,
  getVersionContext
} from './versioning';

// Apply version detection
app.use(versionMiddleware);

// Require specific version
app.get('/v2/new-feature', requireVersion('v2'), handler);

// Block deprecated versions (optional)
app.use(blockDeprecatedVersions);

// Get version from request
app.get('/api/entities', (req, res) => {
  const ctx = getVersionContext(req);
  console.log(ctx.resolvedVersion);
  console.log(ctx.isDeprecated);
});
```

### Compatibility Layer

```typescript
import { compatibilityLayer } from './versioning';

// Transform request
const transformed = await compatibilityLayer.transformRequest(
  data,
  { fromVersion: 'v1', toVersion: 'v2', operation: 'createEntity', path: '/graphql' }
);

// Transform response
const transformed = await compatibilityLayer.transformResponse(
  data,
  { fromVersion: 'v1', toVersion: 'v2', operation: 'createEntity', path: '/graphql' }
);

// Transform GraphQL
const query = compatibilityLayer.transformGraphQLQuery(queryString, context);
const variables = compatibilityLayer.transformGraphQLVariables(vars, context);
const result = compatibilityLayer.transformGraphQLResult(data, context);
```

### Documentation Generator

```typescript
import { documentationGenerator } from './versioning';

// Generate docs
const doc = documentationGenerator.generateDocumentation('v1');
console.log(doc.endpoints);
console.log(doc.examples);
console.log(doc.migrationGuides);

// Generate markdown
const markdown = documentationGenerator.generateMarkdown('v1');

// Generate OpenAPI
const openapi = documentationGenerator.generateOpenAPI('v1');
```

### Changelog Automation

```typescript
import { changelogAutomation } from './versioning';

// Generate changelog
const changelog = changelogAutomation.generateChangelog('v1');
console.log(changelog.markdown);

// Generate full changelog
const full = changelogAutomation.generateFullChangelog();

// Add entry
changelogAutomation.addEntry('v2', {
  type: 'feature',
  description: 'Added new analytics endpoints',
  ticket: '#12345'
});

// Export
changelogAutomation.exportChangelog('v1', 'CHANGELOG-v1.md', 'markdown');
```

---

## Examples

### Complete Client Example

```typescript
import axios from 'axios';

class IntelGraphClient {
  private apiVersion: string;
  private baseUrl: string;

  constructor(version: string = 'v2') {
    this.apiVersion = version;
    this.baseUrl = `https://api.intelgraph.io/${version}`;
  }

  async query(query: string, variables?: any) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/graphql`,
        { query, variables },
        {
          headers: {
            'API-Version': this.apiVersion,
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      );

      // Check for deprecation
      this.checkDeprecation(response.headers);

      return response.data;
    } catch (error) {
      this.handleVersionError(error);
      throw error;
    }
  }

  private checkDeprecation(headers: any) {
    if (headers['x-api-deprecation'] === 'true') {
      console.warn(
        'API version deprecated:',
        headers['x-api-warn']
      );

      // Emit event for monitoring
      this.emit('deprecation', {
        version: headers['x-api-version'],
        sunsetDate: headers['x-api-sunset-date'],
        warning: headers['x-api-warn']
      });
    }
  }

  private handleVersionError(error: any) {
    if (error.response?.status === 410) {
      console.error('API version sunset:', error.response.data);
      throw new Error(`API version ${this.apiVersion} is no longer supported`);
    }

    if (error.response?.status === 426) {
      console.error('API version deprecated:', error.response.data);
      throw new Error(`API version ${this.apiVersion} requires upgrade`);
    }
  }

  private getToken(): string {
    // Get JWT token
    return process.env.API_TOKEN || '';
  }

  private emit(event: string, data: any) {
    // Emit to monitoring/logging system
  }
}

// Usage
const client = new IntelGraphClient('v2');

const result = await client.query(`
  query {
    entities(filter: { types: [PERSON] }) {
      id
      name
      confidence
    }
  }
`);
```

### Complete Server Example

```typescript
import express from 'express';
import {
  versionMiddleware,
  versionRegistry,
  documentationGenerator,
  changelogAutomation
} from './versioning';

const app = express();

// Apply version middleware
app.use(versionMiddleware);

// Version info endpoint
app.get('/api/versions', (req, res) => {
  res.json({
    current: versionRegistry.getDefaultVersion(),
    latest: versionRegistry.getLatestVersion(),
    active: versionRegistry.getActiveVersions().map(v => ({
      version: v.version,
      status: v.status,
      releaseDate: v.releaseDate
    })),
    deprecated: versionRegistry.getDeprecatedVersions().map(v => ({
      version: v.version,
      sunsetDate: v.sunsetDate
    }))
  });
});

// Compatibility matrix endpoint
app.get('/api/compatibility', (req, res) => {
  res.json(versionRegistry.generateCompatibilityMatrix());
});

// Changelog endpoint
app.get('/api/changelog/:version', (req, res) => {
  const changelog = changelogAutomation.generateChangelog(
    req.params.version,
    { format: 'json' }
  );

  if (!changelog) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(JSON.parse(changelog.json || '{}'));
});

// Documentation endpoint
app.get('/api/docs/:version', (req, res) => {
  const doc = documentationGenerator.generateDocumentation(
    req.params.version
  );

  if (!doc) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(doc);
});

// OpenAPI spec endpoint
app.get('/api/openapi/:version', (req, res) => {
  const openapi = documentationGenerator.generateOpenAPI(
    req.params.version
  );

  if (!openapi) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(openapi);
});

app.listen(4000, () => {
  console.log('API server running on port 4000');
});
```

---

## Troubleshooting

### Version Not Detected

**Problem:** API version defaults to v1 even when specified

**Solution:** Check version detection priority:
1. URL path takes precedence
2. Then API-Version header
3. Then Accept header
4. Falls back to default

```javascript
// Ensure version is in correct format
const response = await fetch('/v2/graphql', {  // ✅ Correct
  headers: { 'API-Version': 'v2' }
});

// Not in URL
const response = await fetch('/graphql', {     // Version from header only
  headers: { 'API-Version': 'v2' }
});
```

### Version Mismatch Errors

**Problem:** Getting 400 version_mismatch errors

**Solution:** Endpoint may require specific version

```typescript
// Some endpoints require specific versions
app.get('/v2/new-feature', requireVersion('v2'), handler);

// Ensure you're calling with correct version
await fetch('/v2/new-feature', {
  headers: { 'API-Version': 'v2' }  // Must match
});
```

### Transformation Issues

**Problem:** Data not transforming correctly between versions

**Solution:** Check compatibility layer configuration

```typescript
// Register custom transformer if needed
compatibilityLayer.registerTransformer({
  from: 'v1',
  to: 'v2',
  requestTransformer: (data, ctx) => {
    // Custom transformation logic
    return transformedData;
  }
});
```

---

## Support

For questions or issues:

- **Documentation**: https://docs.intelgraph.io/api-versioning
- **GitHub Issues**: https://github.com/BrianCLong/summit/issues
- **API Status**: https://status.intelgraph.io
- **Support Email**: support@intelgraph.io

---

## License

MIT License - Copyright (c) 2025 IntelGraph
