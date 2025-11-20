# Data Catalog Integration Guide

Quick guide for integrating the Data Catalog into your services.

## For Ingestion Pipelines

When creating a new ingestion pipeline, register the datasets and record lineage:

```typescript
import { getCatalogService } from './server/src/catalog';

// 1. Register source dataset (if external)
await catalogService.registerDataset({
  datasetId: 'external_crm',
  name: 'External CRM Data',
  dataType: 'custom',
  classificationLevel: 'confidential',
  ownerTeam: 'data-engineering',
  ownerEmail: 'data-eng@company.com',
  storageSystem: 's3',
  storageLocation: 's3://external-data/crm/',
  schemaDefinition: [ /* columns */ ],
  containsPersonalData: true,
  tags: ['external', 'pii', 'crm'],
});

// 2. Register target dataset
await catalogService.registerDataset({
  datasetId: 'staging_crm',
  name: 'Staging CRM Data',
  // ... metadata
});

// 3. Record lineage during ETL
await catalogService.recordLineage(
  'external_crm',
  'staging_crm',
  'extract',
  'Extract CRM data to staging',
  'crm-ingestion-pipeline'
);
```

## For Analytics Services

Query the catalog to discover available datasets:

```typescript
import { getCatalogService } from './server/src/catalog';

// Find datasets by tags
const analyticsDatasets = await catalogService.listDatasets({
  tags: ['analytics'],
  classificationLevel: ['internal', 'public'],
});

// Get specific dataset info
const dataset = await catalogService.getDataset('users');
console.log(`Storage: ${dataset.storageSystem} at ${dataset.storageLocation}`);
console.log(`Schema:`, dataset.schemaDefinition);

// Check lineage
const lineage = await catalogService.getLineage('users', { direction: 'both' });
console.log(`Upstream datasets:`, lineage.upstream);
console.log(`Downstream datasets:`, lineage.downstream);
```

## For API Endpoints

Protect endpoints with dataset access control:

```typescript
import { requireDatasetAccess } from './server/src/catalog';
import express from 'express';

const router = express.Router();

// Protect route with dataset policy
router.get(
  '/api/users',
  requireDatasetAccess(
    catalogService,
    () => 'users',  // dataset ID
    'read'          // access type
  ),
  async (req, res) => {
    // Access granted, proceed with query
    const users = await db.query('SELECT * FROM users');
    res.json(users);
  }
);

// Export endpoint requires higher authority
router.post(
  '/api/users/export',
  requireDatasetAccess(
    catalogService,
    () => 'users',
    'export'  // requires SUBPOENA, COURT_ORDER, or ADMIN_AUTH
  ),
  async (req, res) => {
    const users = await db.query('SELECT * FROM users');
    res.attachment('users.csv');
    res.send(convertToCsv(users));
  }
);
```

## For Copilot/AI Services

Provide catalog context to AI assistants:

```typescript
import { CatalogAuthorityGuard } from './server/src/catalog';

async function getCopilotContext(user: User) {
  const guard = new CatalogAuthorityGuard(catalogService);

  // Get datasets user can access
  const accessibleDatasets = await guard.getAccessibleDatasets(user);

  // Get full metadata for context
  const context = await Promise.all(
    accessibleDatasets.map(id => catalogService.getDataset(id))
  );

  // Format for copilot
  return context.map(ds => ({
    id: ds.datasetId,
    name: ds.name,
    description: ds.description,
    columns: ds.schemaDefinition.map(col => ({
      name: col.name,
      type: col.type,
      description: col.description,
    })),
    location: `${ds.storageSystem}:${ds.storageLocation}`,
    tags: ds.tags,
  }));
}

// In copilot prompt:
const datasetContext = await getCopilotContext(user);
const prompt = `
Available datasets:
${JSON.stringify(datasetContext, null, 2)}

User query: ${userQuery}
`;
```

## For Data Quality Checks

Record quality metrics after validation:

```typescript
import { getCatalogService } from './server/src/catalog';

async function runQualityChecks(datasetId: string) {
  // Run checks
  const totalRows = await countRows(datasetId);
  const nullCount = await countNulls(datasetId);
  const duplicates = await countDuplicates(datasetId);

  // Calculate scores
  const completenessScore = 1 - (nullCount / totalRows);
  const duplicatePercentage = (duplicates / totalRows) * 100;

  // Record in catalog
  await catalogService.recordQualityMetrics(datasetId, {
    completenessScore,
    validityScore: 0.99, // from validation
    consistencyScore: 1.0,
    nullPercentage: (nullCount / totalRows) * 100,
    duplicatePercentage,
    outlierCount: 42,
    schemaViolationsCount: 0,
    measurementJob: 'daily-quality-check',
    sampleSize: totalRows,
  });
}
```

## For Policy Compilers

Reference catalog dataset IDs in policies:

```typescript
// Policy definition referencing catalog
const policy = {
  id: 'user-data-read',
  effect: 'allow',
  actions: ['read'],
  resources: [
    'dataset:users',           // Reference catalog entry
    'dataset:organizations',
  ],
  conditions: {
    'authority.type': ['LICENSE'],
    'classification.max': 'confidential',
  },
};

// Evaluate policy with catalog context
async function evaluatePolicy(policy: Policy, context: Context) {
  // Extract dataset IDs from resources
  const datasetIds = policy.resources
    .filter(r => r.startsWith('dataset:'))
    .map(r => r.replace('dataset:', ''));

  // Load dataset metadata from catalog
  const datasets = await Promise.all(
    datasetIds.map(id => catalogService.getDataset(id))
  );

  // Check conditions against catalog metadata
  for (const dataset of datasets) {
    if (dataset.classificationLevel > context.maxClassification) {
      return { allow: false, reason: 'Classification too high' };
    }

    if (dataset.authorityRequirements) {
      const hasRequired = dataset.authorityRequirements.every(req =>
        context.user.authorities.includes(req)
      );
      if (!hasRequired) {
        return {
          allow: false,
          reason: 'Missing required authority',
          required: dataset.authorityRequirements,
        };
      }
    }
  }

  return { allow: true };
}
```

## Common Patterns

### Pattern: Dataset Discovery

```typescript
// Find datasets by purpose
const investigationDatasets = await catalogService.listDatasets({
  tags: ['investigation'],
});

// Find datasets with specific sensitivity
const piiDatasets = await catalogService.listDatasets({
  containsPersonalData: true,
});

// Search by name
const userDatasets = await catalogService.searchDatasets('user');
```

### Pattern: Lineage Graph

```typescript
// Get full lineage graph
const lineage = await catalogService.getLineage('final_report', {
  maxDepth: 10,
  direction: 'upstream',
});

// Visualize dependencies
function printLineage(edge: LineageEdge, depth = 0) {
  console.log('  '.repeat(depth) + `${edge.sourceDatasetId} → ${edge.targetDatasetId}`);
  console.log('  '.repeat(depth) + `  via ${edge.transformationType}`);
}

lineage.upstream.forEach(edge => printLineage(edge));
```

### Pattern: Access Audit

```typescript
// Check who accessed a dataset
const logs = await db.query(`
  SELECT
    dal.accessed_at,
    u.email,
    dal.access_type,
    dal.access_granted,
    dal.reason_for_access
  FROM catalog.dataset_access_log dal
  JOIN catalog.datasets d ON dal.dataset_id = d.id
  JOIN maestro.users u ON dal.user_id = u.id::text
  WHERE d.dataset_id = $1
  ORDER BY dal.accessed_at DESC
  LIMIT 100
`, ['users']);
```

### Pattern: Schema Evolution

```typescript
// Get schema history
const versions = await db.query(`
  SELECT version, schema_definition, changes, applied_at
  FROM catalog.schema_versions
  WHERE dataset_id = (
    SELECT id FROM catalog.datasets WHERE dataset_id = $1
  )
  ORDER BY version DESC
`, ['users']);

// Check for breaking changes
const breakingChanges = versions.filter(v => v.breaking_changes);
```

## Testing

### Mock Catalog Service

```typescript
// For unit tests
class MockCatalogService {
  async getDataset(id: string) {
    return {
      datasetId: id,
      name: 'Mock Dataset',
      classificationLevel: 'internal',
      containsPersonalData: false,
      // ... minimal required fields
    };
  }

  async logAccess() {
    // No-op for tests
  }
}
```

### Integration Tests

```typescript
describe('Dataset Access', () => {
  let catalogService: CatalogService;

  beforeAll(async () => {
    // Set up test catalog
    catalogService = new CatalogService(testPool);
    await catalogService.registerDataset(testDataset);
  });

  it('should enforce PII access rules', async () => {
    const guard = new CatalogAuthorityGuard(catalogService);

    const decision = await guard.evaluateDatasetAccess(userWithoutPiiAccess, {
      datasetId: 'pii_dataset',
      accessType: 'read',
    });

    expect(decision.allow).toBe(false);
    expect(decision.reasons).toContain('License required for PII access');
  });
});
```

## Checklist

When integrating catalog into a new service:

- [ ] Add catalog service to dependency injection
- [ ] Register all datasets the service creates
- [ ] Record lineage when transforming data
- [ ] Protect endpoints with `requireDatasetAccess`
- [ ] Log access attempts
- [ ] Record quality metrics (if applicable)
- [ ] Reference dataset IDs in policies
- [ ] Add catalog context to AI/copilot features
- [ ] Update documentation with dataset references
- [ ] Add integration tests

## Examples

See complete examples in:
- [ETL Pipeline Example](../../server/data-pipelines/examples/catalog-integration.ts)
- [API Endpoint Example](../../server/src/api/examples/protected-endpoint.ts)
- [Policy Compiler Example](../../contracts/policy-pack/examples/catalog-policy.ts)

## Support

Questions? Check:
- [Full Documentation](./README.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Team: data-governance@company.com
