# Data Catalog & Governance Spine

The Data Catalog provides centralized dataset discovery, governance, and lineage tracking for Summit. It serves as the single source of truth for all datasets across the platform.

## Overview

The catalog system provides:

- **Dataset Registry**: Central inventory of all datasets with metadata, schemas, and governance policies
- **Lineage Tracking**: Column-level lineage showing data flow through pipelines
- **Access Control**: Integration with Authority system for dataset-level permissions
- **Quality Metrics**: Data quality scores and validation results
- **Schema Evolution**: Versioned schema tracking with change history
- **Audit Trail**: Complete access logs for compliance

## Quick Start

### 1. Initialize the Catalog

Run the database migration to create the catalog schema:

```bash
# Apply the catalog migration
psql $DATABASE_URL -f db/migrations/020_catalog_schema.sql
```

### 2. Populate with Golden Path Datasets

```bash
# Register golden path datasets
npx ts-node scripts/catalog-init.ts
```

### 3. Browse the Catalog

```bash
# List all datasets
make catalog:list

# Show specific dataset
make catalog:show DATASET_ID=users

# View statistics
make catalog:stats
```

## CLI Commands

### List Datasets

```bash
# Basic listing
make catalog:list

# Filter by type
make catalog:list ARGS="--type=audit"

# Filter by classification
make catalog:list ARGS="--classification=confidential"

# Search by name
make catalog:list ARGS="--search=users"

# Show only PII datasets
make catalog:list ARGS="--pii"

# Filter by owner
make catalog:list ARGS="--owner=data-engineering"

# Output as JSON
make catalog:list ARGS="--format=json"

# Output as CSV
make catalog:list ARGS="--format=csv"
```

### Show Dataset Details

```bash
# Basic info with lineage and schema
make catalog:show DATASET_ID=users

# Include access logs
make catalog:show DATASET_ID=users ARGS="--access"

# JSON output
make catalog:show DATASET_ID=users ARGS="--format=json"
```

### Catalog Statistics

```bash
make catalog:stats
```

## Using the Catalog Service

### Registering Datasets

```typescript
import { CatalogService, getCatalogService } from './server/src/catalog';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const catalogService = getCatalogService(pool);

// Register a new dataset
await catalogService.registerDataset({
  datasetId: 'user_transactions',
  name: 'User Transactions',
  description: 'E-commerce transaction history',
  dataType: 'analytics',
  classificationLevel: 'confidential',
  ownerTeam: 'data-engineering',
  ownerEmail: 'data-eng@company.com',
  storageSystem: 'postgres',
  storageLocation: 'analytics.transactions',
  schemaDefinition: [
    {
      name: 'id',
      type: 'UUID',
      nullable: false,
      description: 'Transaction ID',
    },
    {
      name: 'user_id',
      type: 'UUID',
      nullable: false,
      description: 'User who made the transaction',
      pii: true,
    },
    {
      name: 'amount',
      type: 'NUMERIC(10,2)',
      nullable: false,
      description: 'Transaction amount',
    },
  ],
  containsPersonalData: true,
  containsFinancialData: true,
  jurisdiction: ['US', 'EU'],
  tags: ['pii', 'financial', 'analytics'],
  licenseId: 'platform-license',
  authorityRequirements: ['LICENSE'],
  retentionDays: 2555, // 7 years
});
```

### Querying Datasets

```typescript
// Get specific dataset
const dataset = await catalogService.getDataset('users');

// List with filters
const datasets = await catalogService.listDatasets({
  dataType: 'analytics',
  containsPersonalData: true,
  tags: ['pii'],
});

// Search by name
const results = await catalogService.searchDatasets('transaction');

// Get statistics
const stats = await catalogService.getStats();
```

### Recording Lineage

```typescript
// Record lineage between datasets
await catalogService.recordLineage(
  'raw_events',           // source
  'processed_events',     // target
  'transform',            // transformation type
  'Clean and normalize events',
  'event-processing-job',
  [
    {
      sourceColumn: 'event_data',
      targetColumn: 'parsed_event',
      transformation: 'JSON parsing',
    },
  ]
);

// Get lineage graph
const lineage = await catalogService.getLineage('processed_events', {
  maxDepth: 5,
  direction: 'both',
});
```

### Logging Access

```typescript
// Log dataset access
await catalogService.logAccess(
  'users',                    // dataset
  userId,                     // who accessed
  'read',                     // access type
  true,                       // was it granted?
  {
    accessMethod: 'API',
    clearanceLevel: 3,
    reasonForAccess: 'User management dashboard query',
    rowCount: 150,
  }
);
```

### Recording Quality Metrics

```typescript
// Record quality metrics
await catalogService.recordQualityMetrics('users', {
  completenessScore: 0.98,
  validityScore: 0.95,
  consistencyScore: 1.0,
  nullPercentage: 2.0,
  duplicatePercentage: 0.1,
  measurementJob: 'daily-quality-check',
  sampleSize: 10000,
});
```

## Authority Integration

The catalog integrates with the Authority system to enforce dataset-level access policies.

### Middleware Usage

```typescript
import { requireDatasetAccess } from './server/src/catalog';

// Protect a route with dataset access control
router.get(
  '/api/datasets/:datasetId/query',
  requireDatasetAccess(
    catalogService,
    (req) => req.params.datasetId,
    'read'
  ),
  async (req, res) => {
    // Access granted, execute query
    const { datasetId } = req.catalogContext;
    // ... query logic
  }
);
```

### Policy Decorator

```typescript
import { DatasetPolicy } from './server/src/catalog';

class DatasetController {
  @DatasetPolicy('users', 'read')
  async getUsers(req, res) {
    // Automatically enforces policy for 'users' dataset
    // Only executed if access is granted
  }

  @DatasetPolicy('users', 'export')
  async exportUsers(req, res) {
    // Requires export authority
  }
}
```

### Programmatic Policy Evaluation

```typescript
import { CatalogAuthorityGuard } from './server/src/catalog';

const guard = new CatalogAuthorityGuard(catalogService);

const decision = await guard.evaluateDatasetAccess(user, {
  datasetId: 'users',
  accessType: 'read',
  accessMethod: 'API',
  reasonForAccess: 'Customer support query',
});

if (decision.allow) {
  // Proceed with access
} else {
  console.log('Access denied:', decision.reasons);
  console.log('Required authority:', decision.requiredAuthority);
}
```

## Access Control Rules

The catalog enforces the following access rules:

### Classification-Based Clearance

| Classification | Required Clearance |
|----------------|-------------------|
| public         | 1                 |
| internal       | 2                 |
| confidential   | 3                 |
| restricted     | 4                 |
| regulated      | 5                 |

### Sensitivity Rules

- **PII Data**: Requires `LICENSE` authority + reason for access
- **Financial Data**: Requires clearance level 4+
- **Health Data**: Requires `ADMIN_AUTH` or `WARRANT`

### Operation-Specific Rules

- **Read**: Standard clearance + classification check
- **Write**: Same as read + dataset owner or admin
- **Export**: Requires `SUBPOENA`, `COURT_ORDER`, or `ADMIN_AUTH`
- **Delete**: Requires `ADMIN_AUTH`

### Custom Authority Requirements

Datasets can specify custom authority requirements in their metadata:

```typescript
{
  datasetId: 'classified_intelligence',
  authorityRequirements: ['WARRANT', 'COURT_ORDER'],
  // ... other fields
}
```

## Integration with Pipelines

### ETL Pipeline Example

```typescript
import { CatalogService } from './server/src/catalog';

async function runETLPipeline(runId: string) {
  // Record lineage as data flows through pipeline
  await catalogService.recordLineage(
    'source_crm',
    'staging_customers',
    'extract',
    'Extract customer data from CRM',
    `etl-pipeline-${runId}`
  );

  // ... transformation logic

  await catalogService.recordLineage(
    'staging_customers',
    'gold_customers',
    'transform',
    'Clean and deduplicate customer records',
    `etl-pipeline-${runId}`,
    [
      { sourceColumn: 'email', targetColumn: 'email_normalized', transformation: 'lowercase + trim' },
      { sourceColumn: 'phone', targetColumn: 'phone_e164', transformation: 'E.164 formatting' },
    ]
  );
}
```

### Integration with OpenLineage

The catalog is designed to work alongside OpenLineage:

```typescript
import { LineageTracker } from './server/data-pipelines/governance/lineage';
import { CatalogService } from './server/src/catalog';

// Track in OpenLineage
const runId = lineageTracker.start_run('my-job', 'transform');
lineageTracker.add_input_dataset(runId, 'namespace', 'dataset_a', columns);
lineageTracker.add_output_dataset(runId, 'namespace', 'dataset_b', columns);
lineageTracker.complete_run(runId);

// Also record in catalog for governance
await catalogService.recordLineage('dataset_a', 'dataset_b', 'transform');
```

## Copilot Integration

The catalog enables intelligent assistance:

```typescript
// Get context about available datasets
const accessibleDatasets = await guard.getAccessibleDatasets(user);

// Provide to copilot as context
const context = await Promise.all(
  accessibleDatasets.map(id => catalogService.getDataset(id))
);

// Copilot can now reference datasets by ID and understand:
// - What data is available
// - Access requirements
// - Schema structure
// - Lineage relationships
```

## Schema

### Core Tables

- **datasets**: Main dataset registry
- **schema_versions**: Schema evolution history
- **lineage_edges**: Dataset-to-dataset lineage
- **dataset_access_log**: Access audit trail
- **quality_metrics**: Data quality measurements
- **dataset_tags**: Tag taxonomy

### Key Fields

**Dataset Metadata**:
- `dataset_id`: Human-readable identifier
- `classification_level`: Access control level
- `owner_team`: Owning team
- `storage_system`: Where data lives (postgres, neo4j, s3, etc.)
- `schema_definition`: Column definitions with types and flags
- `authority_requirements`: Required authority bindings
- `license_id`: Associated license
- `retention_days`: Retention period

**Lineage Edge**:
- `source_dataset_id`: Where data came from
- `target_dataset_id`: Where data went to
- `transformation_type`: Type of transformation
- `column_mappings`: Column-level lineage

## Best Practices

### 1. Register All Datasets

Every dataset in your system should be registered in the catalog:

```typescript
// ✓ Good: Register on creation
await createTable('analytics.new_table', schema);
await catalogService.registerDataset({
  datasetId: 'new_table',
  // ... metadata
});

// ✗ Bad: Create dataset without registering
await createTable('analytics.new_table', schema);
```

### 2. Use Dataset IDs in Policies

Reference datasets by catalog ID instead of hardcoded paths:

```typescript
// ✓ Good: Reference catalog entry
const policy = {
  resource: 'dataset:users',
  action: 'read',
  effect: 'allow',
};

// ✗ Bad: Hardcode storage location
const policy = {
  resource: 'table:maestro.users',
  action: 'read',
  effect: 'allow',
};
```

### 3. Always Provide Reason for Access

For PII or sensitive data, always provide context:

```typescript
// ✓ Good: Include reason
req.headers['x-reason-for-access'] = 'Investigating fraud case #12345';

// ✗ Bad: No context
req.headers['x-reason-for-access'] = 'query';
```

### 4. Record Lineage at Pipeline Time

Track lineage as transformations happen:

```typescript
// ✓ Good: Record during pipeline execution
await transform(sourceData, targetData);
await catalogService.recordLineage('source', 'target', 'transform');

// ✗ Bad: Try to reconstruct lineage later
```

### 5. Keep Schemas Up to Date

Update catalog when schema changes:

```typescript
// ✓ Good: Update on migration
await alterTable('users', 'ADD COLUMN phone VARCHAR(20)');
await updateCatalogSchema('users', newSchema);

// ✗ Bad: Schema drift between catalog and reality
```

## Troubleshooting

### Dataset Not Found

```bash
# Check if dataset is registered
make catalog:show DATASET_ID=my_dataset

# List all datasets
make catalog:list

# Register if missing
npx ts-node scripts/catalog-init.ts
```

### Access Denied

```bash
# Check access logs
make catalog:show DATASET_ID=users ARGS="--access"

# Review denial reasons in logs
# Common issues:
# - Insufficient clearance
# - Missing authority binding
# - No reason for access (PII datasets)
# - Expired license
```

### Lineage Not Showing

```typescript
// Ensure both datasets are registered
await catalogService.getDataset('source');
await catalogService.getDataset('target');

// Verify lineage was recorded
const lineage = await catalogService.getLineage('target');
console.log(lineage.upstream);
```

## Future Enhancements

Planned features:

- **Data Contracts**: Formal SLAs and quality guarantees
- **Automated Discovery**: Scan databases and auto-register datasets
- **Impact Analysis**: "What breaks if I change this dataset?"
- **Data Mesh Integration**: Federated catalog across domains
- **ML Feature Store**: Integration with feature engineering
- **Cost Tracking**: Storage and compute costs per dataset
- **Deprecation Workflow**: Automated sunset process

## References

- [Governance Retention Policy](../governance/data-retention-policy.md)
- [Authority Middleware](../../server/src/middleware/authority.ts)
- [OpenLineage Integration](../../server/data-pipelines/governance/lineage.py)
- [Provenance Ledger](../../ga-graphai/packages/prov-ledger/)

## Support

For questions or issues:
- Check existing issues: https://github.com/anthropics/summit/issues
- Documentation: https://docs.summit.dev/catalog
- Team: data-governance@company.com
