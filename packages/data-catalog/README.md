# Data Catalog & Metadata Service

**Version**: 0.1.0
**Owner**: Data Catalog & Metadata Engineering Team

## Overview

The Data Catalog & Metadata service is a central registry for all data assets, schemas, and mappings in the IntelGraph platform. It provides comprehensive metadata management, schema versioning, and impact analysis capabilities.

## Table of Contents

- [Architecture](#architecture)
- [Core Entities](#core-entities)
- [Services](#services)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Development](#development)
- [Testing](#testing)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   Catalog Service                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Data       │  │   Schema     │  │   Metadata   │ │
│  │   Source     │  │   Registry   │  │   Search     │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              REST API Layer                      │  │
│  │  /sources  /datasets  /schemas  /search          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Integration Points

- **Ingestion Service**: Registers new datasets and mappings
- **Graph Core**: Registers canonical schemas
- **Case Service**: Links datasets to investigations
- **ETL Pipelines**: Tracks transformation jobs

---

## Core Entities

### DataSource

Represents an external connector or data source (database, API, file system, etc.).

**Key Fields**:
- `name`, `displayName`, `description`
- `type`: DATABASE, API, FILE, STREAM, S3, SFTP, WEBHOOK
- `connectionStatus`: ACTIVE, INACTIVE, ERROR, PENDING
- `owner`, `stewards`, `tags`, `domain`
- `datasetIds`: List of datasets under this source

### Dataset

Represents a collection of data (table, file, API endpoint, etc.).

**Key Fields**:
- `sourceId`: Parent data source
- `name`, `displayName`, `description`, `fullyQualifiedName`
- `status`: ACTIVE, DEPRECATED, ARCHIVED, DRAFT
- `classification`: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET
- `fields`: Array of field metadata
- `licenseIds`: Applied licenses
- `policyTags`: Sensitivity labels, legal basis, retention
- `mappingIds`: Canonical field mappings

### Field

Enhanced field/column metadata with constraints and statistics.

**Key Fields**:
- `datasetId`: Parent dataset
- `name`, `displayName`, `description`
- `dataType`, `nativeDataType`
- `isPrimaryKey`, `isForeignKey`
- `classification`, `tags`, `policyTags`
- `canonicalFieldId`: Reference to canonical schema field
- `mappingIds`: Transformations to canonical schema
- `statistics`: Profiling data (uniqueness, nulls, distribution)

### Mapping

Maps source fields to canonical schema fields with transformation logic.

**Key Fields**:
- `sourceDatasetId`, `sourceFieldId`
- `canonicalSchemaId`, `canonicalFieldId`
- `transformationType`: DIRECT, CAST, CONCATENATE, SPLIT, LOOKUP, CALCULATION, CUSTOM
- `transformationLogic`: SQL, JavaScript, or custom expression
- `validationRules`: Data quality rules
- `status`: ACTIVE, DRAFT, DEPRECATED, ARCHIVED
- `version`: Semver version string

### License

Data usage constraints and licensing terms.

**Key Fields**:
- `licenseType`: PUBLIC_DOMAIN, OPEN_DATA, CREATIVE_COMMONS, PROPRIETARY, RESTRICTED
- `allowedUseCases`, `restrictions`
- `geographicRestrictions`, `allowedRegions`
- `allowsCommercialUse`, `allowsDerivativeWorks`, `allowsRedistribution`
- `requiresAttribution`, `retentionRequirement`

### SchemaDefinition

Versioned schema registry entry.

**Key Fields**:
- `namespace`, `name`, `fullyQualifiedName`
- `type`: CONNECTOR, CANONICAL, MAPPING, AVRO, JSON_SCHEMA, PROTOBUF
- `schema`: Actual schema definition (JSON or string)
- `version`: Semver (major.minor.patch)
- `compatibilityMode`: NONE, BACKWARD, FORWARD, FULL, TRANSITIVE
- `status`: DRAFT, ACTIVE, DEPRECATED, ARCHIVED
- `previousVersionId`: Link to previous version

### LineageSummary

Lightweight lineage tracking for impact analysis.

**Key Fields**:
- `entityId`, `entityType`
- `upstreamSources`, `upstreamDatasets`, `upstreamFields`
- `downstreamDatasets`, `downstreamCases`, `downstreamReports`
- `etlJobIds`: Related ETL jobs
- `usageCount`, `lastUsedAt`

---

## Services

### DataSourceService

**File**: `packages/data-catalog/src/services/DataSourceService.ts`

Manages data sources, datasets, fields, mappings, and licenses.

**Key Methods**:
```typescript
registerDataSource(data) → DataSource
getDataSource(id) → DataSource | null
listDataSources(filters?) → DataSource[]
testConnection(id) → { success, message }

registerDataset(data) → Dataset
getDataset(id) → Dataset | null
listDatasets(filters?) → Dataset[]
searchDatasets(query) → Dataset[]

registerField(data) → Field
listFields(datasetId) → Field[]
searchFields(query) → Field[]

createMapping(data) → Mapping
listMappings(filters?) → Mapping[]
deprecateMapping(id) → Mapping

registerLicense(data) → License
attachLicenseToDataset(datasetId, licenseId) → void
getDatasetsByLicense(licenseId) → Dataset[]

getLineage(entityId) → LineageSummary | null
getImpactAnalysis(entityId) → { affectedDatasets, affectedMappings, affectedCases }
```

### SchemaRegistryService

**File**: `packages/data-catalog/src/services/SchemaRegistryService.ts`

Manages schema registration, versioning, and compatibility checking.

**Key Methods**:
```typescript
registerSchema(request) → SchemaDefinition
getSchema(id) → SchemaDefinition | null
getSchemaByName(namespace, name, version?) → SchemaDefinition | null
searchSchemas(request) → SchemaSearchResponse

evolveSchema(request) → SchemaDefinition
deprecateSchema(id, reason, replacementId?) → SchemaDefinition
archiveSchema(id) → SchemaDefinition

getSchemaVersions(id) → SchemaVersion[]
getSchemaUsage(id) → SchemaUsageStatistics
```

### MetadataSearchService

**File**: `packages/data-catalog/src/services/MetadataSearchService.ts`

Provides unified search across all catalog entities.

**Key Methods**:
```typescript
search(request) → MetadataSearchResponse
searchFieldsAdvanced(request) → MetadataSearchResult[]
performImpactAnalysis(request) → ImpactAnalysisResponse
```

**Search Features**:
- Unified search across sources, datasets, fields, mappings, schemas
- Relevance scoring (exact match > partial > tags)
- Faceted search (entity type, tags)
- Advanced filters (classification, status, domain, tags)
- Pagination support

---

## API Endpoints

### Data Source Endpoints

```http
POST   /api/v1/catalog/sources              # Register data source
GET    /api/v1/catalog/sources/:id          # Get data source
GET    /api/v1/catalog/sources              # List data sources
POST   /api/v1/catalog/sources/:id/test     # Test connection
```

### Dataset Endpoints

```http
POST   /api/v1/catalog/datasets             # Register dataset
GET    /api/v1/catalog/datasets/:id         # Get dataset
GET    /api/v1/catalog/datasets             # List datasets
GET    /api/v1/catalog/datasets/search      # Search datasets
```

### Field Endpoints

```http
POST   /api/v1/catalog/fields                         # Register field
GET    /api/v1/catalog/datasets/:datasetId/fields     # List fields
GET    /api/v1/catalog/fields/search                  # Search fields
```

### Schema Registry Endpoints

```http
POST   /api/v1/catalog/schemas                        # Register schema
GET    /api/v1/catalog/schemas/:id                    # Get schema
GET    /api/v1/catalog/schemas/:namespace/:name       # Get by name
POST   /api/v1/catalog/schemas/search                 # Search schemas
POST   /api/v1/catalog/schemas/:id/evolve             # Create new version
POST   /api/v1/catalog/schemas/:id/deprecate          # Deprecate schema
POST   /api/v1/catalog/schemas/:id/archive            # Archive schema
GET    /api/v1/catalog/schemas/:id/versions           # Get versions
GET    /api/v1/catalog/schemas/:id/usage              # Get usage stats
```

### Search Endpoints

```http
GET    /api/v1/search                        # Quick search
POST   /api/v1/search/advanced               # Advanced search
GET    /api/v1/search/suggestions            # Autocomplete
POST   /api/v1/search/fields                 # Field-specific search
POST   /api/v1/search/impact                 # Impact analysis
POST   /api/v1/search/click                  # Record analytics
```

### Lineage & Impact Endpoints

```http
GET    /api/v1/catalog/:entityType/:id/lineage        # Get lineage
GET    /api/v1/catalog/:entityType/:id/impact         # Impact analysis
```

### License Endpoints

```http
POST   /api/v1/catalog/datasets/:datasetId/licenses/:licenseId   # Attach license
GET    /api/v1/catalog/licenses/:licenseId/datasets              # Get datasets
GET    /api/v1/catalog/policy-tags/:tag/datasets                 # Get by policy tag
```

---

## Usage Examples

### Register a Data Source

```bash
curl -X POST http://localhost:3100/api/v1/catalog/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "postgres-prod",
    "displayName": "Production PostgreSQL",
    "description": "Main production database",
    "type": "DATABASE",
    "connectionConfig": {
      "host": "localhost",
      "port": 5432,
      "database": "production"
    },
    "connectionStatus": "PENDING",
    "owner": "data-team",
    "stewards": ["admin"],
    "tags": ["production", "postgres"],
    "domain": "core",
    "properties": {}
  }'
```

### Register a Dataset

```bash
curl -X POST http://localhost:3100/api/v1/catalog/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "ds-123",
    "name": "users",
    "displayName": "Users Table",
    "description": "User account records",
    "fullyQualifiedName": "production.public.users",
    "status": "ACTIVE",
    "classification": "CONFIDENTIAL",
    "owner": "user-team",
    "stewards": [],
    "tags": ["pii", "user-data"],
    "domain": "identity",
    "schemaId": null,
    "recordCount": 50000,
    "licenseIds": [],
    "policyTags": ["gdpr", "retention-7y"],
    "properties": {}
  }'
```

### Register a Schema

```bash
curl -X POST http://localhost:3100/api/v1/catalog/schemas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PersonSchema",
    "namespace": "com.intelgraph.canonical",
    "description": "Canonical person entity schema",
    "type": "CANONICAL",
    "format": "json",
    "schema": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string" },
        "dateOfBirth": { "type": "string", "format": "date" }
      },
      "required": ["id", "name"]
    },
    "compatibilityMode": "BACKWARD",
    "owner": "graph-core-team",
    "tags": ["canonical", "person"],
    "domain": "identity",
    "properties": {}
  }'
```

### Search Metadata

```bash
curl -X POST http://localhost:3100/api/v1/search/advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "customer",
    "filters": {
      "entityTypes": ["DATASET", "FIELD"],
      "classifications": ["CONFIDENTIAL"],
      "tags": ["pii"]
    },
    "offset": 0,
    "limit": 20
  }'
```

### Impact Analysis

```bash
curl -X POST http://localhost:3100/api/v1/search/impact \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "dataset-123",
    "entityType": "DATASET",
    "depth": 3
  }'
```

---

## Development

### Prerequisites

- Node.js ≥ 18.18
- pnpm ≥ 9.12.0
- TypeScript 5.3+

### Setup

```bash
# Install dependencies
cd packages/data-catalog
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
packages/data-catalog/
├── src/
│   ├── types/
│   │   ├── catalog.ts              # Base catalog types
│   │   ├── dataSourceTypes.ts      # DataSource, Dataset, Field, Mapping, License
│   │   ├── schemaRegistry.ts       # Schema versioning types
│   │   ├── lineage.ts              # Lineage types
│   │   └── index.ts                # Type exports
│   │
│   ├── services/
│   │   ├── DataSourceService.ts           # Data source management
│   │   ├── SchemaRegistryService.ts       # Schema versioning
│   │   ├── MetadataSearchService.ts       # Search service
│   │   ├── __tests__/
│   │   │   ├── DataSourceService.test.ts
│   │   │   └── SchemaRegistryService.test.ts
│   │   └── index.ts
│   │
│   └── index.ts                    # Package exports
│
├── package.json
├── tsconfig.json
└── README.md
```

```
services/catalog-service/
├── src/
│   ├── controllers/
│   │   ├── DataSourceController.ts
│   │   ├── SchemaRegistryController.ts
│   │   └── SearchController.ts
│   │
│   ├── routes/
│   │   ├── dataSourceRoutes.ts
│   │   ├── schemaRoutes.ts
│   │   ├── searchRoutes.ts
│   │   └── catalogRoutes.ts
│   │
│   ├── middleware/
│   │   └── errorHandler.ts
│   │
│   └── server.ts
│
└── package.json
```

---

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test DataSourceService.test.ts
```

### Test Coverage

- **DataSourceService**: 20+ test cases
  - Data source registration and connection testing
  - Dataset and field management
  - Mapping creation and lifecycle
  - License operations
  - Impact analysis
  - Search functionality

- **SchemaRegistryService**: 15+ test cases
  - Schema registration and deduplication
  - Version evolution (major/minor/patch)
  - Breaking change detection
  - Compatibility checking
  - Search and filtering
  - Deprecation and archival

### Integration Tests

Integration tests are pending and will cover:
- End-to-end flows: connector registration → dataset → field → mapping
- Schema evolution workflows
- Impact analysis with real data
- Search relevance and performance

---

## Security & Compliance

### Data Classification Levels

- **PUBLIC**: Publicly available data
- **INTERNAL**: Internal use only
- **CONFIDENTIAL**: Confidential data (e.g., PII)
- **RESTRICTED**: Highly sensitive
- **TOP_SECRET**: Classified information

### Policy Tags

Policy tags track:
- **Sensitivity**: PII, PHI, Financial, Classified
- **Legal Basis**: GDPR, CCPA, HIPAA, etc.
- **Retention**: Retention requirements in days
- **Geographic Restrictions**: Allowed/restricted regions

### No PII in Logs

The catalog service stores **metadata only** — no raw data rows. All logging excludes any potentially sensitive values.

---

## Future Enhancements

### Phase 2 (Pending)

1. **Database Persistence Layer**
   - PostgreSQL for metadata storage
   - Neo4j for lineage graph
   - Repository pattern implementation

2. **Integration Tests**
   - End-to-end test suite
   - Performance benchmarks
   - Backwards compatibility tests

3. **Authentication & Authorization**
   - Integration with OPA policy engine
   - Row-level security
   - Audit logging

4. **Advanced Features**
   - Machine learning for schema matching
   - Automated data profiling
   - Schema recommendation engine
   - Data quality scoring

---

## Support & Contact

- **Owner**: Data Catalog & Metadata Engineering Team
- **Documentation**: `/docs/catalog/`
- **Issues**: GitHub Issues
- **Slack**: `#data-catalog`

---

## License

MIT License - See LICENSE file for details
