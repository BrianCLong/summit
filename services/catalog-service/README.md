# Data Catalog & Metadata Service

Central metadata service for IntelGraph platform that manages data sources, datasets, field mappings, licenses, and lineage.

## Overview

The Data Catalog service provides:

- **Data Source Registry**: Track all connector configurations and connection status
- **Dataset & Field Catalog**: Comprehensive metadata for all data assets
- **Schema Registry**: Versioned schema management with compatibility checking
- **Mapping Registry**: Track transformations from source to canonical models
- **License Management**: Data usage rights and compliance tracking
- **Lineage Summaries**: Lightweight impact analysis
- **Metadata Search**: Fast, indexed search across all metadata

## Architecture

```
┌─────────────────┐
│  Ingestion      │──► Register datasets, mappings
│  Service        │
└─────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│     Catalog Service (REST API)          │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  Metadata    │  │  Schema         │  │
│  │  Controller  │  │  Registry       │  │
│  └──────────────┘  └─────────────────┘  │
│         │                    │          │
│         ▼                    ▼          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  Metadata    │  │  Schema         │  │
│  │  Service     │  │  Registry Svc   │  │
│  └──────────────┘  └─────────────────┘  │
│         │                    │          │
│         ▼                    ▼          │
│  ┌─────────────────────────────────┐   │
│  │  PostgreSQL Metadata Store      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Metadata)    │
└─────────────────┘
```

## Key Features

### 1. Data Source Management

Register and track all data connectors:

```bash
POST /api/v1/metadata/sources
{
  "name": "production-postgres",
  "displayName": "Production PostgreSQL",
  "type": "DATABASE",
  "connectorId": "postgres-connector-v1",
  "connectorVersion": "1.2.0",
  "owner": "data-team",
  "tags": ["production", "finance"]
}
```

### 2. Dataset Registration

Track datasets with full metadata:

```bash
POST /api/v1/metadata/datasets
{
  "dataset": {
    "sourceId": "source-production-postgres-123",
    "name": "customers",
    "fullyQualifiedName": "production.public.customers",
    "policyTags": ["PII", "GDPR"],
    "licenseId": "license-internal-use-456",
    "owner": "product-team"
  },
  "fields": [
    {
      "name": "customer_id",
      "dataType": "INTEGER",
      "isPrimaryKey": true,
      "canonicalFieldName": "Person.id"
    },
    {
      "name": "email",
      "dataType": "VARCHAR(255)",
      "policyTags": ["PII"],
      "sensitivityLevel": "CONFIDENTIAL",
      "canonicalFieldName": "Person.email"
    }
  ]
}
```

### 3. Schema Registry

Version control for schemas with compatibility checking:

```bash
# Register new schema version
POST /api/v1/connectors/schemas
{
  "schemaId": "customer-schema",
  "schema": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "email": { "type": "string" }
    }
  },
  "format": "JSON_SCHEMA",
  "description": "Customer schema v2",
  "checkCompatibility": true
}

# Check compatibility
POST /api/v1/connectors/schemas/customer-schema/compatibility
{
  "schema": { ... },
  "format": "JSON_SCHEMA"
}

# Response
{
  "compatible": false,
  "breakingChanges": [
    "Added required field: phone_number"
  ],
  "warnings": [
    "Added optional field: middle_name"
  ]
}
```

### 4. Mapping Management

Track transformations from source to canonical:

```bash
POST /api/v1/metadata/mappings
{
  "name": "customer-to-person",
  "sourceId": "source-production-postgres-123",
  "datasetId": "dataset-customers-789",
  "canonicalEntityType": "Person",
  "fieldMappings": [
    {
      "sourceFieldName": "customer_id",
      "targetFieldName": "id",
      "transformationType": "DIRECT"
    },
    {
      "sourceFieldName": "first_name",
      "targetFieldName": "givenName",
      "transformationType": "DIRECT"
    },
    {
      "sourceFieldName": "last_name",
      "targetFieldName": "familyName",
      "transformationType": "DIRECT"
    }
  ]
}
```

### 5. Metadata Search

Fast search across all catalog metadata:

```bash
# Universal search
GET /api/v1/metadata/search?q=customer

# Dataset search with filters
GET /api/v1/metadata/datasets/search?q=user&filters=[
  {"field":"policyTags","operator":"in","value":["PII"]}
]

# Find fields by canonical mapping
GET /api/v1/metadata/fields/canonical/Person.email
```

### 6. License Management

Track data usage rights:

```bash
POST /api/v1/metadata/licenses
{
  "name": "internal-use-only",
  "licenseType": "PROPRIETARY",
  "termsAndConditions": "For internal use only...",
  "allowedPurposes": ["analytics", "reporting"],
  "prohibitedPurposes": ["external-sharing"],
  "requiresAttribution": false,
  "complianceFrameworks": ["GDPR", "CCPA"]
}

# Get datasets using a license
GET /api/v1/metadata/licenses/{licenseId}/usage
```

### 7. Impact Analysis

Understand downstream dependencies:

```bash
# Get dataset impact
GET /api/v1/metadata/datasets/{datasetId}/impact

# Response
{
  "datasetId": "dataset-customers-789",
  "affectedDatasets": [...],
  "affectedMappings": [...],
  "totalAffected": 15
}

# Get mapping impact
GET /api/v1/metadata/mappings/{mappingId}/impact
```

## API Reference

### Data Sources

- `GET /api/v1/metadata/sources` - List all data sources
- `GET /api/v1/metadata/sources/{id}` - Get source with datasets
- `POST /api/v1/metadata/sources` - Register new source
- `PATCH /api/v1/metadata/sources/{id}/status` - Update connection status

### Datasets

- `GET /api/v1/metadata/datasets` - List datasets (with filters)
- `GET /api/v1/metadata/datasets/search` - Search datasets
- `GET /api/v1/metadata/datasets/{id}` - Get dataset with fields
- `POST /api/v1/metadata/datasets` - Register dataset
- `PATCH /api/v1/metadata/datasets/{id}/statistics` - Update profiling stats
- `GET /api/v1/metadata/datasets/{id}/impact` - Impact analysis

### Fields

- `GET /api/v1/metadata/fields/search` - Search fields
- `GET /api/v1/metadata/fields/canonical/{name}` - Find by canonical mapping

### Mappings

- `GET /api/v1/metadata/mappings` - List mappings
- `GET /api/v1/metadata/mappings/{id}` - Get mapping details
- `POST /api/v1/metadata/mappings` - Create mapping
- `POST /api/v1/metadata/mappings/{id}/validate` - Validate and activate
- `GET /api/v1/metadata/mappings/{id}/impact` - Impact analysis

### Licenses

- `GET /api/v1/metadata/licenses` - List active licenses
- `GET /api/v1/metadata/licenses/{id}` - Get license
- `POST /api/v1/metadata/licenses` - Create license
- `GET /api/v1/metadata/licenses/{id}/usage` - Get datasets using license

### Connectors

- `GET /api/v1/connectors/registry` - List available connectors
- `GET /api/v1/connectors/registry/{id}` - Get connector details
- `POST /api/v1/connectors/registry` - Register connector

### Schema Registry

- `POST /api/v1/connectors/schemas` - Register schema version
- `POST /api/v1/connectors/schemas/validate` - Validate schema
- `GET /api/v1/connectors/schemas/{schemaId}` - Get latest version
- `GET /api/v1/connectors/schemas/{schemaId}/versions` - List versions
- `GET /api/v1/connectors/schemas/{schemaId}/versions/{version}` - Get specific version
- `POST /api/v1/connectors/schemas/{schemaId}/compatibility` - Check compatibility
- `GET /api/v1/connectors/schemas/{schemaId}/diff/{from}/{to}` - Compare versions

## Database Schema

The service uses PostgreSQL with the following key tables:

- `catalog_data_sources` - Data source configurations
- `catalog_datasets` - Dataset metadata
- `catalog_fields` - Field-level metadata
- `catalog_mappings` - Source-to-canonical mappings
- `catalog_field_mappings` - Field-level mapping rules
- `catalog_transformation_rules` - Transformation logic
- `catalog_licenses` - License definitions
- `catalog_schema_registry` - Schema versions
- `catalog_connector_registry` - Available connectors
- `catalog_lineage_summary` - Lineage summaries for impact analysis

Migrations are located in `packages/data-catalog/migrations/`.

## Configuration

Environment variables:

```bash
# Service
CATALOG_SERVICE_PORT=3100

# Database
CATALOG_DB_HOST=localhost
CATALOG_DB_PORT=5432
CATALOG_DB_NAME=intelgraph_catalog
CATALOG_DB_USER=catalog_user
CATALOG_DB_PASSWORD=<secure-password>

# Connection pool
CATALOG_DB_POOL_MIN=2
CATALOG_DB_POOL_MAX=20
```

## Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm --filter @intelgraph/data-catalog migrate

# Start service
pnpm --filter @intelgraph/catalog-service dev
```

### Running Tests

```bash
# Unit tests
pnpm --filter @intelgraph/data-catalog test

# Integration tests
pnpm --filter @intelgraph/catalog-service test:integration

# All tests
pnpm test
```

### Building

```bash
pnpm --filter @intelgraph/catalog-service build
```

## Integration Points

### Ingestion Service

The ingestion service registers datasets after extraction:

```typescript
// Register dataset after successful extraction
await catalogService.registerDataset({
  sourceId: connector.sourceId,
  name: tableName,
  fullyQualifiedName: `${dbName}.${schemaName}.${tableName}`,
  fields: discoveredFields,
  owner: job.owner,
  policyTags: inferredTags,
});
```

### Graph Core

Graph Core uses canonical mappings to ingest data:

```typescript
// Get mapping for source dataset
const mapping = await catalogService.getMapping(dataset.canonicalMappingId);

// Transform source data using field mappings
const canonicalEntity = transformUsingMapping(sourceRow, mapping);
```

### Case Service

Cases reference datasets and track lineage:

```typescript
// Track which datasets are used in a case
await catalogService.updateLineageSummary({
  entityId: caseId,
  entityType: 'CASE',
  upstreamDatasets: [datasetId1, datasetId2],
});
```

## Security & Compliance

### No PII in Logs

The service ensures no actual data values are logged, only metadata.

### Policy Tags

Support for standard policy tags:
- `PII` - Personally Identifiable Information
- `PHI` - Protected Health Information
- `FINANCIAL` - Financial data
- `CONFIDENTIAL` - Confidential business data
- `GDPR` - GDPR-regulated data
- `CCPA` - CCPA-regulated data

### Sensitivity Levels

- `PUBLIC` - Publicly available
- `INTERNAL` - Internal use
- `CONFIDENTIAL` - Restricted access
- `RESTRICTED` - Highly restricted
- `HIGHLY_RESTRICTED` - Maximum restrictions

## Performance Considerations

### Indexing

The service uses PostgreSQL full-text search with GIN indexes on:
- Dataset names and descriptions
- Field names and descriptions
- Tags and policy tags

### Caching

Consider adding Redis caching for:
- Frequently accessed schemas
- Connector registry lookups
- License definitions

### Pagination

All list endpoints support pagination:
- Default limit: 20 (datasets), 50 (fields)
- Maximum limit: 1000
- Use `offset` and `limit` query parameters

## Troubleshooting

### Schema compatibility failures

Check breaking changes in response and version incrementally:

```bash
# Get diff between versions
GET /api/v1/connectors/schemas/{schemaId}/diff/1/2
```

### Mapping validation errors

Ensure source and canonical schemas are registered before creating mappings.

### Search returning no results

Verify full-text search vectors are being updated (automatic via trigger).

## Contributing

See main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT
