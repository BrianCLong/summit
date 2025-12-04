# Summit Master Data Management (MDM) Platform Guide

## Overview

Summit's Master Data Management platform provides enterprise-grade capabilities for managing golden records, ensuring data quality, and governing master data across your organization.

## Core Capabilities

### 1. Golden Record Management

Create and manage golden records (master records) with advanced survivorship rules:

```typescript
import { GoldenRecordManager } from '@summit/golden-records';

const manager = new GoldenRecordManager({
  domain: 'customer',
  survivorshipRules: [
    {
      id: 'rule1',
      fieldName: 'email',
      strategy: 'most_recent',
      priority: 1
    },
    {
      id: 'rule2',
      fieldName: 'name',
      strategy: 'most_trusted_source',
      priority: 2
    }
  ],
  enableVersioning: true,
  enableLineageTracking: true
});

// Create golden record from multiple sources
const goldenRecord = await manager.createGoldenRecord([
  {
    sourceId: 'src1',
    sourceSystem: 'CRM',
    sourceRecordId: '123',
    data: { name: 'John Doe', email: 'john@example.com' },
    lastModified: new Date(),
    confidence: 0.95,
    priority: 1
  },
  {
    sourceId: 'src2',
    sourceSystem: 'ERP',
    sourceRecordId: '456',
    data: { name: 'J. Doe', email: 'jdoe@example.com' },
    lastModified: new Date(),
    confidence: 0.85,
    priority: 2
  }
]);
```

### 2. Entity Matching & Resolution

Match and resolve entities across different systems:

```typescript
import { EntityResolver } from '@summit/golden-records';
import { MatchingEngine } from '@summit/mdm-core';

const resolver = new EntityResolver({
  matchingConfig: {
    algorithm: 'hybrid',
    threshold: 0.85,
    autoApproveThreshold: 0.95,
    blockingEnabled: true,
    matchingRules: [
      {
        id: 'rule1',
        name: 'Name and Email Match',
        fields: [
          {
            fieldName: 'name',
            comparator: 'jaro_winkler',
            weight: 0.6,
            required: true
          },
          {
            fieldName: 'email',
            comparator: 'exact',
            weight: 0.4,
            required: false
          }
        ],
        weights: { name: 0.6, email: 0.4 },
        threshold: 0.85,
        priority: 1,
        active: true
      }
    ]
  },
  autoLinkThreshold: 0.95,
  manualReviewThreshold: 0.7,
  enableMLMatching: false
});

// Resolve entities
const result = await resolver.resolveEntities(entities);
console.log(`Found ${result.matches.length} matches`);
console.log(`Auto-linked: ${result.autoLinked}`);
console.log(`Requires review: ${result.manualReviewRequired}`);
```

### 3. Data Quality Management

Assess and improve data quality:

```typescript
import { QualityEngine } from '@summit/mdm-core';

const qualityEngine = new QualityEngine();

// Define quality rules
const rules = [
  {
    id: 'rule1',
    name: 'Email Required',
    description: 'Email field must be populated',
    domain: 'customer',
    dimension: 'completeness',
    ruleType: 'field_validation',
    severity: 'high',
    threshold: 1.0,
    expression: 'email required',
    active: true,
    autoFix: false,
    metadata: {
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system',
      version: 1,
      executionCount: 0
    }
  }
];

// Assess quality
const profile = await qualityEngine.assessQuality(
  'record-123',
  'customer',
  customerData,
  rules
);

console.log(`Overall quality score: ${profile.overallScore}`);
console.log(`Issues found: ${profile.issues.length}`);
```

### 4. Reference Data Management

Manage code lists and lookup tables:

```typescript
import { ReferenceDataManager } from '@summit/reference-data';

const refDataManager = new ReferenceDataManager();

// Create code list
const codeList = await refDataManager.createCodeList(
  'country_codes',
  'ISO 3166 Country Codes',
  'reference',
  [
    { code: 'US', value: 'United States' },
    { code: 'CA', value: 'Canada' },
    { code: 'MX', value: 'Mexico' }
  ],
  'data-steward'
);

// Lookup code
const country = await refDataManager.lookupCode('country_codes', 'US');
console.log(country?.value); // 'United States'
```

### 5. Hierarchical Data Management

Build and manage organizational and product hierarchies:

```typescript
import { HierarchyBuilder } from '@summit/hierarchy-management';

const hierarchyBuilder = new HierarchyBuilder();

// Create hierarchy
const orgHierarchy = await hierarchyBuilder.createHierarchy(
  'Corporate Structure',
  'Company organizational hierarchy',
  'organization',
  'organizational'
);

// Add nodes
const division = await hierarchyBuilder.addNode(
  orgHierarchy.id,
  orgHierarchy.rootNodeId,
  'North America Division',
  'division-001',
  { region: 'NA' }
);

const department = await hierarchyBuilder.addNode(
  orgHierarchy.id,
  division.id,
  'Sales Department',
  'dept-sales',
  { type: 'sales' }
);

// Navigate hierarchy
const ancestors = await hierarchyBuilder.getAncestors(department.id);
const descendants = await hierarchyBuilder.getDescendants(division.id);
```

### 6. Multi-Source Synchronization

Synchronize data across multiple sources:

```typescript
import { SyncEngine } from '@summit/mdm-sync';

const syncEngine = new SyncEngine();

// Register sync configuration
await syncEngine.registerConfiguration({
  id: 'crm-erp-sync',
  name: 'CRM to ERP Synchronization',
  description: 'Sync customer data from CRM to ERP',
  domain: 'customer',
  syncType: 'scheduled',
  direction: 'unidirectional',
  sources: [/* source configs */],
  targets: [/* target configs */],
  schedule: {
    scheduleType: 'interval',
    interval: 300,
    intervalUnit: 'seconds',
    enabled: true
  },
  conflictResolution: {
    strategy: 'most_recent',
    priorityRules: [],
    notifyOnConflict: true,
    autoResolve: false
  },
  transformations: [],
  status: 'active',
  metadata: {
    createdAt: new Date(),
    createdBy: 'system',
    updatedAt: new Date(),
    updatedBy: 'system',
    version: 1,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0
  }
});

// Start sync job
const job = await syncEngine.startSync('crm-erp-sync');
```

### 7. Data Stewardship Workflows

Manage data stewardship and approval processes:

```typescript
import { StewardshipWorkflowManager } from '@summit/mdm-stewardship';

const stewardshipManager = new StewardshipWorkflowManager();

// Create change request
const changeRequest = await stewardshipManager.createChangeRequest(
  'customer',
  'record-123',
  'update',
  'john.steward',
  [
    {
      fieldName: 'email',
      currentValue: 'old@example.com',
      proposedValue: 'new@example.com',
      reason: 'Customer requested email update'
    }
  ],
  'Customer initiated change via support ticket #456'
);

// Create certification
const certification = await stewardshipManager.certifyRecord(
  'record-123',
  'customer',
  'data-steward',
  'gold',
  0.95
);
```

### 8. Governance & Compliance

Enforce governance policies and track compliance:

```typescript
import { GovernanceEngine } from '@summit/mdm-governance';

const governanceEngine = new GovernanceEngine();

// Register governance policy
await governanceEngine.registerPolicy('customer', {
  dataOwner: 'chief-data-officer',
  stewards: ['data-steward-1', 'data-steward-2'],
  accessControl: {
    roles: [],
    permissions: [],
    defaultAccess: 'deny'
  },
  changeManagement: {
    approvalRequired: true,
    approvers: ['manager-1'],
    minApprovals: 1,
    auditTrail: true
  },
  qualityThreshold: 0.85,
  certificationRequired: true,
  retentionPolicy: {
    retentionPeriod: 7,
    retentionUnit: 'years',
    archiveStrategy: 'archive',
    legalHoldEnabled: true
  },
  privacyPolicy: {
    piiFields: ['email', 'phone', 'ssn'],
    encryptionRequired: true,
    maskingRules: [],
    consentRequired: true,
    rightToErasure: true
  }
});

// Log audit event
await governanceEngine.logAudit(
  'user-123',
  'update',
  'master_record',
  'record-456',
  { field: 'email', oldValue: 'old@example.com', newValue: 'new@example.com' }
);

// Generate compliance report
const report = await governanceEngine.generateComplianceReport('customer', 'Q1-2024');
```

### 9. Analytics & Reporting

Create dashboards and generate reports:

```typescript
import { AnalyticsEngine } from '@summit/mdm-analytics';

const analyticsEngine = new AnalyticsEngine();

// Create dashboard
const dashboard = await analyticsEngine.createDashboard(
  'Customer MDM Dashboard',
  'customer',
  [
    {
      id: 'widget-1',
      type: 'metric',
      title: 'Total Master Records',
      dataSource: 'master_records',
      configuration: { metric: 'count' },
      position: { x: 0, y: 0, width: 4, height: 2 }
    },
    {
      id: 'widget-2',
      type: 'chart',
      title: 'Quality Score Trend',
      dataSource: 'quality_scores',
      configuration: { chartType: 'line', period: '30d' },
      position: { x: 4, y: 0, width: 8, height: 4 }
    }
  ]
);

// Generate report
const report = await analyticsEngine.generateReport(
  'Monthly MDM Report',
  'quality_summary',
  'customer',
  'monthly'
);
```

## API Reference

### MDM Service Endpoints

The MDM service provides RESTful APIs for all MDM operations:

**Base URL:** `http://localhost:3100/api/v1`

#### Master Records
- `POST /master-records` - Create golden record
- `GET /master-records/:id` - Get master record
- `POST /master-records/:id/certify` - Certify record

#### Matching
- `POST /matching/match` - Match two records
- `POST /matching/batch` - Batch match records

#### Quality
- `POST /quality/assess` - Assess data quality

#### Reference Data
- `POST /reference-data/code-lists` - Create code list
- `GET /reference-data/code-lists/:id` - Get code list
- `GET /reference-data/lookup/:tableName` - Perform lookup

#### Hierarchies
- `POST /hierarchies` - Create hierarchy
- `GET /hierarchies/:id` - Get hierarchy

#### Sync
- `POST /sync/configurations` - Register sync config
- `POST /sync/:configId/start` - Start sync job
- `GET /sync/jobs/:jobId` - Get job status

#### Stewardship
- `POST /stewardship/workflows` - Create workflow
- `GET /stewardship/workflows/user/:userId` - Get user workflows

#### Governance
- `POST /governance/audit` - Log audit event
- `GET /governance/compliance/:domain/report` - Get compliance report

#### Analytics
- `POST /analytics/dashboards` - Create dashboard
- `POST /analytics/reports` - Generate report

## Best Practices

### Golden Record Creation

1. **Define Clear Survivorship Rules**: Establish clear rules for determining which source provides the most trustworthy data for each attribute
2. **Enable Lineage Tracking**: Always track data lineage to understand the provenance of golden record values
3. **Set Quality Thresholds**: Define minimum quality scores for automatic certification
4. **Version Control**: Enable versioning to maintain history of changes

### Entity Matching

1. **Use Blocking Strategies**: Implement blocking to improve performance on large datasets
2. **Tune Thresholds**: Carefully tune auto-approval and manual review thresholds
3. **Combine Algorithms**: Use hybrid matching approaches for better accuracy
4. **Review Match Results**: Implement workflows for stewards to review uncertain matches

### Data Quality

1. **Define Comprehensive Rules**: Cover all quality dimensions (completeness, accuracy, consistency, etc.)
2. **Automate Quality Checks**: Integrate quality assessment into data ingestion pipelines
3. **Monitor Trends**: Track quality metrics over time to identify degradation
4. **Enable Auto-Fix**: Implement auto-fix for common quality issues where appropriate

### Governance

1. **Establish Clear Ownership**: Assign data owners and stewards for each domain
2. **Implement Approval Workflows**: Require approvals for critical data changes
3. **Enable Comprehensive Auditing**: Log all data access and modifications
4. **Regular Compliance Reviews**: Generate and review compliance reports regularly

## Configuration

### Environment Variables

```bash
# MDM Service
MDM_SERVICE_PORT=3100
MDM_DB_URL=postgresql://localhost:5432/mdm
MDM_CACHE_ENABLED=true

# Reference Data Service
REF_DATA_SERVICE_PORT=3101
REF_DATA_CACHE_TTL=3600

# Quality Engine
QUALITY_AUTO_FIX_ENABLED=true
QUALITY_DEFAULT_THRESHOLD=0.85

# Matching Engine
MATCHING_DEFAULT_ALGORITHM=hybrid
MATCHING_DEFAULT_THRESHOLD=0.85

# Sync Engine
SYNC_MAX_CONCURRENT_JOBS=5
SYNC_RETRY_ATTEMPTS=3
```

## Performance Optimization

1. **Enable Caching**: Use caching for reference data and frequently accessed master records
2. **Batch Operations**: Process records in batches for better throughput
3. **Async Processing**: Use asynchronous processing for long-running operations
4. **Index Optimization**: Create appropriate database indexes for query performance
5. **Connection Pooling**: Use connection pooling for database access

## Troubleshooting

### Common Issues

**Issue:** Low match rates
- **Solution:** Review and tune matching thresholds and field weights

**Issue:** Poor quality scores
- **Solution:** Review quality rules and data sources, implement data cleansing

**Issue:** Sync failures
- **Solution:** Check source/target connectivity, review transformation logic

**Issue:** Slow API responses
- **Solution:** Enable caching, optimize database queries, increase resources

## Support

For additional support and documentation:
- GitHub: https://github.com/summit/mdm-platform
- Documentation: https://docs.summit.io/mdm
- Support: mdm-support@summit.io
