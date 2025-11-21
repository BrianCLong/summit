# API Versioning Module

Comprehensive API versioning system for IntelGraph that supports multiple concurrent API versions with graceful degradation.

## Features

- ✅ **URL-based versioning**: `/v1/graphql`, `/v2/graphql`
- ✅ **Header-based versioning**: `API-Version: v1` or `Accept: application/vnd.intelgraph.v1+json`
- ✅ **Automatic deprecation warnings**: Response headers notify clients of deprecated versions
- ✅ **Version compatibility layer**: Automatic transformation between compatible versions
- ✅ **Version-specific documentation**: Auto-generated docs for each API version
- ✅ **Migration guides**: Step-by-step guides between versions
- ✅ **Changelog automation**: Track and generate changelogs
- ✅ **Compatibility matrix**: Track which versions are compatible

## Quick Start

### Installation

The versioning module is already integrated into the API. No installation required.

### Usage

#### 1. URL-Based Versioning (Recommended)

```bash
# Use v1 API
curl https://api.intelgraph.io/v1/graphql

# Use v2 API
curl https://api.intelgraph.io/v2/graphql
```

#### 2. Header-Based Versioning

```bash
# Using API-Version header
curl https://api.intelgraph.io/graphql \
  -H "API-Version: v1"

# Using Accept header
curl https://api.intelgraph.io/graphql \
  -H "Accept: application/vnd.intelgraph.v1+json"
```

## API Endpoints

### Version Information

```bash
# List all versions
GET /api/versioning/versions

# Get specific version info
GET /api/versioning/versions/v1

# Get versioning status
GET /api/versioning/status
```

### Compatibility

```bash
# Get compatibility matrix
GET /api/versioning/compatibility

# Check compatibility between versions
GET /api/versioning/compatibility/v1/v2
```

### Documentation

```bash
# Get API docs for a version
GET /api/versioning/docs/v1?format=json
GET /api/versioning/docs/v1?format=markdown

# Get OpenAPI specification
GET /api/versioning/openapi/v1
```

### Changelog

```bash
# Get full changelog
GET /api/versioning/changelog?format=markdown

# Get version-specific changelog
GET /api/versioning/changelog/v1?format=json
```

### Migration

```bash
# Get migration guide
GET /api/versioning/migration/v1/v2

# Get breaking changes
GET /api/versioning/breaking-changes/v2
```

## Module Structure

```
versioning/
├── version-registry.ts          # Central version registry
├── version-middleware.ts        # Express middleware for version detection
├── compatibility-layer.ts       # Transform requests/responses between versions
├── schema-versioning.ts         # GraphQL schema versioning
├── documentation-generator.ts   # Auto-generate API documentation
├── changelog-automation.ts      # Changelog generation
├── index.ts                     # Module exports
├── __tests__/                   # Unit tests
│   ├── version-registry.test.ts
│   └── version-middleware.test.ts
└── README.md                    # This file
```

## Programmatic Usage

### Import the Module

```typescript
import {
  versionRegistry,
  versionMiddleware,
  compatibilityLayer,
  documentationGenerator,
  changelogAutomation,
} from './versioning';
```

### Register a New Version

```typescript
versionRegistry.registerVersion({
  version: 'v3',
  status: 'active',
  releaseDate: new Date('2026-01-01'),
  description: 'New features and improvements',
  breaking: true,
  changelog: [
    {
      type: 'breaking',
      description: 'Changed entity ID format',
      date: new Date(),
      migration: 'Update all entity ID references',
    },
  ],
  compatibleWith: ['v2'],
});
```

### Check Version Compatibility

```typescript
const isCompatible = versionRegistry.isCompatible('v1', 'v2');
console.log(isCompatible); // true or false

const compat = versionRegistry.getCompatibility('v1', 'v2');
console.log(compat.autoMigrate); // true
console.log(compat.warnings); // ['...']
```

### Transform Data Between Versions

```typescript
// Transform v1 request to v2 format
const v2Request = await compatibilityLayer.transformRequest(
  v1Data,
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    operation: 'createEntity',
    path: '/graphql',
  }
);

// Transform v2 response back to v1 format
const v1Response = await compatibilityLayer.transformResponse(
  v2Data,
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    operation: 'createEntity',
    path: '/graphql',
  }
);
```

### Generate Documentation

```typescript
// Generate full documentation
const doc = documentationGenerator.generateDocumentation('v1');
console.log(doc.endpoints);
console.log(doc.examples);

// Generate markdown
const markdown = documentationGenerator.generateMarkdown('v1');
fs.writeFileSync('docs/api-v1.md', markdown);

// Generate OpenAPI spec
const openapi = documentationGenerator.generateOpenAPI('v1');
fs.writeFileSync('docs/openapi-v1.json', JSON.stringify(openapi, null, 2));
```

### Generate Changelog

```typescript
// Generate changelog for a version
const changelog = changelogAutomation.generateChangelog('v1', {
  format: 'markdown',
  groupByType: true,
});

console.log(changelog.markdown);

// Generate full changelog
const fullChangelog = changelogAutomation.generateFullChangelog();
fs.writeFileSync('CHANGELOG.md', fullChangelog);
```

### Deprecate a Version

```typescript
// Deprecate v1 with sunset date
versionRegistry.deprecateVersion('v1', new Date('2025-12-31'));

// Check deprecation status
const isDeprecated = versionRegistry.isDeprecated('v1');
const warning = versionRegistry.getDeprecationWarning('v1');
console.log(warning); // "API version v1 is deprecated..."
```

## Response Headers

All API responses include version information headers:

```http
X-API-Version: v1                    # Resolved version
X-API-Latest-Version: v2             # Latest available version
X-API-Version-Detection: url         # How version was detected
```

For deprecated versions:

```http
X-API-Deprecation: true
X-API-Sunset-Date: 2025-12-31T00:00:00.000Z
X-API-Warn: API version v1 is deprecated and will be sunset on 2025-12-31
```

## Error Responses

### Invalid Version

```http
HTTP/1.1 400 Bad Request
{
  "error": "invalid_api_version",
  "message": "API version 'v999' is not supported",
  "supportedVersions": ["v1", "v2"]
}
```

### Sunset Version

```http
HTTP/1.1 410 Gone
{
  "error": "api_version_sunset",
  "message": "API version 'v0' is no longer supported",
  "latestVersion": "v2",
  "migrationGuide": "/docs/migrations/v0-to-v2"
}
```

### Deprecated Version (if blocking enabled)

```http
HTTP/1.1 426 Upgrade Required
{
  "error": "deprecated_version",
  "message": "API version v1 is deprecated",
  "latestVersion": "v2",
  "upgradeRequired": true
}
```

## Testing

Run the test suite:

```bash
# Run all versioning tests
pnpm test src/versioning

# Run specific test file
pnpm test version-registry.test.ts

# Run with coverage
pnpm test:coverage src/versioning
```

## Configuration

Environment variables:

```bash
# Block deprecated versions (optional)
BLOCK_DEPRECATED_VERSIONS=true

# Default API version
DEFAULT_API_VERSION=v1
```

## Best Practices

### For API Consumers

1. **Always specify the version explicitly**
   ```javascript
   // Good
   fetch('https://api.intelgraph.io/v1/graphql')

   // Bad - relies on default
   fetch('https://api.intelgraph.io/graphql')
   ```

2. **Monitor deprecation headers**
   ```javascript
   if (response.headers.get('X-API-Deprecation') === 'true') {
     console.warn('API version deprecated:', response.headers.get('X-API-Warn'));
   }
   ```

3. **Plan migrations early** - Don't wait until sunset date

4. **Test against multiple versions** during migration

### For API Developers

1. **Maintain backward compatibility** whenever possible

2. **Use gradual deprecation** - Mark as deprecated before sunset

3. **Document all breaking changes** with migration guides

4. **Test cross-version compatibility**

5. **Generate documentation** for each version

## Version History

### v1 (Current Default)
- Initial API release
- Core entity and investigation features
- Status: Active

### v2 (Latest)
- Enhanced analytics
- Performance improvements
- Breaking: Confidence values changed from decimal to percentage
- Status: Active

## Support

For issues or questions:

- Documentation: `/docs/API_VERSIONING.md`
- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Support: support@intelgraph.io

## License

MIT License - Copyright (c) 2025 IntelGraph
