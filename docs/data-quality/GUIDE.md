# Data Quality and Data Governance Platform Guide

## Overview

The Summit Data Quality and Data Governance Platform is a comprehensive enterprise solution for managing data quality, ensuring compliance, tracking data lineage, and maintaining master data across intelligence operations. This platform positions Summit as a superior alternative to specialized tools like Collibra and Alation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Getting Started](#getting-started)
4. [Data Quality Management](#data-quality-management)
5. [Data Governance](#data-governance)
6. [Data Lineage Tracking](#data-lineage-tracking)
7. [Master Data Management](#master-data-management)
8. [Data Catalog](#data-catalog)
9. [Advanced Features](#advanced-features)
10. [Integration Guide](#integration-guide)
11. [Troubleshooting](#troubleshooting)

## Architecture Overview

The platform consists of five core packages and two microservices:

### Core Packages

1. **@summit/data-quality**: Data profiling, validation, and quality metrics
2. **@summit/data-governance**: Policy management, compliance automation, and privacy controls
3. **@summit/data-lineage**: End-to-end lineage tracking and impact analysis
4. **@summit/master-data-mgmt**: Entity matching, merging, and golden record management
5. **@summit/data-catalog**: Metadata management and asset discovery

### Microservices

1. **data-quality-service**: REST API for data quality operations
2. **governance-service**: REST API for governance and compliance operations

## Core Components

### 1. Data Quality Engine

The Data Quality Engine provides comprehensive data profiling, validation, and quality assessment capabilities:

**Key Features:**
- Automated data profiling with statistical analysis
- Rule-based validation engine with multiple rule types
- Multi-dimensional quality scoring
- Anomaly detection and alerting
- Automated remediation workflows
- Quality trend analysis
- Real-time and batch validation

**Quality Dimensions:**
- **Completeness**: Percentage of non-null values
- **Uniqueness**: Percentage of unique values
- **Validity**: Conformance to validation rules
- **Consistency**: Cross-field consistency
- **Accuracy**: Correctness of data values
- **Timeliness**: Data freshness and currency

### 2. Data Governance Engine

The Data Governance Engine provides policy management, compliance automation, and privacy controls:

**Key Features:**
- Policy definition and enforcement framework
- Compliance framework support (GDPR, CCPA, HIPAA, SOC2)
- Privacy request automation
- Access control policies
- Data retention policies
- Audit logging and reporting
- Policy violation detection

**Policy Types:**
- Access Control
- Data Retention
- Data Privacy
- Data Security
- Data Quality
- Data Classification
- Data Lifecycle
- Compliance

### 3. Lineage Engine

The Lineage Engine tracks data flow through the organization:

**Key Features:**
- End-to-end lineage mapping
- Column-level lineage tracking
- Impact analysis tools
- Dependency graphs
- Transformation tracking
- Source-to-target mapping
- Automated lineage discovery
- Lineage visualization

### 4. MDM Engine

The Master Data Management Engine provides golden record creation and entity management:

**Key Features:**
- Entity matching with multiple algorithms
- Record merging with survivorship rules
- Hierarchy management
- Data stewardship workflows
- Reference data management
- Multi-domain MDM support
- Version control
- Audit trail

### 5. Data Catalog Engine

The Data Catalog Engine provides metadata management and asset discovery:

**Key Features:**
- Automated metadata extraction
- Business glossary integration
- Search and discovery interface
- Tag and classification systems
- Schema evolution tracking
- Documentation generation
- Asset certification
- Usage analytics

## Getting Started

### Installation

```bash
# Install all packages
pnpm add @summit/data-quality @summit/data-governance @summit/data-lineage @summit/master-data-mgmt @summit/data-catalog

# Or install individually
pnpm add @summit/data-quality
pnpm add @summit/data-governance
# etc.
```

### Basic Setup

```typescript
import { DataQualityEngine } from '@summit/data-quality';
import { DataGovernanceEngine } from '@summit/data-governance';
import { LineageEngine } from '@summit/data-lineage';
import { MDMEngine } from '@summit/master-data-mgmt';
import { DataCatalogEngine } from '@summit/data-catalog';
import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Initialize engines
const qualityEngine = new DataQualityEngine(pool);
const governanceEngine = new DataGovernanceEngine(pool);
const lineageEngine = new LineageEngine({ pool });
const mdmEngine = new MDMEngine({ pool });
const catalogEngine = new DataCatalogEngine({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

// Initialize catalog (creates database schema)
await catalogEngine.initialize();
```

## Data Quality Management

### Profiling Data

```typescript
// Profile entire dataset
const profiles = await qualityEngine.getProfiler().profileDataset('users');

// Profile specific column
const emailProfile = await qualityEngine.getProfiler().profileColumn(
  'users',
  'email',
  {
    sampleSize: 10000,
    includePatterns: true,
    includeDistribution: true,
    includeStatistics: true,
  }
);

console.log('Completeness:', emailProfile.completeness);
console.log('Uniqueness:', emailProfile.uniqueness);
console.log('Patterns:', emailProfile.patterns);
```

### Defining Quality Rules

```typescript
import { QualityRule } from '@summit/data-quality';

const rules: QualityRule[] = [
  // Completeness rule
  {
    id: 'email-completeness',
    name: 'Email Completeness',
    description: 'Email field must be at least 95% complete',
    type: 'completeness',
    severity: 'high',
    scope: 'column',
    condition: {
      operator: 'greater-than',
      value: 'email',
    },
    threshold: 95,
    actions: [
      { type: 'alert', config: { channel: 'email' } },
    ],
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Uniqueness rule
  {
    id: 'email-uniqueness',
    name: 'Email Uniqueness',
    description: 'Email must be unique',
    type: 'uniqueness',
    severity: 'critical',
    scope: 'column',
    condition: {
      operator: 'equals',
      value: 'email',
    },
    actions: [
      { type: 'reject', config: {} },
      { type: 'alert', config: { channel: 'slack' } },
    ],
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Pattern validation
  {
    id: 'email-format',
    name: 'Valid Email Format',
    description: 'Email must match RFC 5322 format',
    type: 'pattern',
    severity: 'high',
    scope: 'column',
    condition: {
      operator: 'matches',
      value: {
        column: 'email',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
    },
    actions: [
      { type: 'quarantine', config: {} },
    ],
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Referential integrity
  {
    id: 'user-account-fk',
    name: 'User Account Foreign Key',
    description: 'User ID must exist in accounts table',
    type: 'referential-integrity',
    severity: 'critical',
    scope: 'column',
    condition: {
      operator: 'equals',
      value: {
        foreignKey: 'user_id',
        referenceTable: 'accounts',
        referenceKey: 'id',
      },
    },
    actions: [
      { type: 'reject', config: {} },
    ],
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
```

### Running Quality Assessment

```typescript
// Run comprehensive quality assessment
const assessment = await qualityEngine.assessDataQuality('users', rules, {
  sampleSize: 50000,
  stopOnFirstError: false,
  maxViolations: 1000,
});

// Review results
console.log('Overall Quality Score:', assessment.qualityScore.overallScore);
console.log('Quality Dimensions:', assessment.qualityScore.dimensions);

// Check for failures
const failures = assessment.validationResults.filter(r => !r.passed);
if (failures.length > 0) {
  console.error('Quality issues detected:', failures);
}

// Review anomalies
if (assessment.anomalies.length > 0) {
  console.warn('Anomalies detected:', assessment.anomalies);
}
```

### Quality Dashboard

```typescript
// Get quality dashboard for a dataset
const dashboard = await qualityEngine.getQualityDashboard('users');

console.log('Overall Score:', dashboard.score.overallScore);
console.log('Trend:', dashboard.score.trendAnalysis.direction);
console.log('Recommendations:', dashboard.score.recommendations);
console.log('Recent Anomalies:', dashboard.recentAnomalies);
```

### Data Remediation

```typescript
// Create and execute remediation plan
const failedValidation = assessment.validationResults.find(r => !r.passed);

if (failedValidation) {
  // Create remediation plan
  const plan = await qualityEngine.remediateQualityIssues(
    failedValidation,
    'cleanse' // or 'standardize', 'deduplicate', 'impute', 'quarantine'
  );

  console.log('Remediation Status:', plan.status);
  console.log('Steps Completed:', plan.steps.filter(s => s.status === 'completed').length);
}
```

## Data Governance

### Policy Management

```typescript
import { GovernancePolicy } from '@summit/data-governance';

// Define a PII protection policy
const piiPolicy: GovernancePolicy = {
  id: 'pii-protection-001',
  name: 'PII Protection Policy',
  description: 'Protect personally identifiable information from unauthorized access',
  type: 'data-privacy',
  scope: {
    tables: ['users', 'customers', 'employees'],
    columns: ['email', 'ssn', 'phone', 'address'],
    dataClassifications: [{
      level: 'pii',
      encryptionRequired: true,
      accessRestrictions: [
        { role: 'analyst', permissions: ['read'] },
        { role: 'admin', permissions: ['read', 'write'] },
      ],
    }],
  },
  rules: [
    {
      id: 'deny-unauthorized',
      condition: {
        type: 'context',
        operator: 'not-in',
        attribute: 'userRole',
        value: ['analyst', 'admin', 'data-steward'],
      },
      action: {
        type: 'deny',
        config: {},
      },
      priority: 100,
      enabled: true,
    },
    {
      id: 'mask-for-analysts',
      condition: {
        type: 'context',
        operator: 'equals',
        attribute: 'userRole',
        value: 'analyst',
      },
      action: {
        type: 'mask',
        config: {
          maskType: 'partial',
          visibleChars: 4,
        },
      },
      priority: 90,
      enabled: true,
    },
  ],
  enforcement: {
    mode: 'enforce',
    violationAction: 'block',
    notificationChannels: ['email', 'slack'],
  },
  status: 'active',
  version: 1,
  effectiveDate: new Date(),
  owner: 'chief-data-officer',
  approvers: ['legal-team', 'security-team'],
  tags: ['pii', 'privacy', 'gdpr'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Register policy
await governanceEngine.registerPolicy(piiPolicy);
```

### Policy Evaluation

```typescript
// Evaluate access request
const accessResult = await governanceEngine.evaluateAccess(
  'user123',          // User ID
  'users.email',      // Resource
  'read',             // Action
  {                   // Context
    userRole: 'analyst',
    ipAddress: '192.168.1.1',
    timestamp: new Date(),
  }
);

if (accessResult.allowed) {
  console.log('Access granted');
  console.log('Applied policies:', accessResult.appliedPolicies);
} else {
  console.error('Access denied');
  console.error('Violations:', accessResult.violations);
}
```

### Compliance Management

```typescript
// Create GDPR compliance framework
const gdprFramework = await governanceEngine
  .getComplianceManager()
  .createGDPRFramework();

// Register framework
await governanceEngine.registerComplianceFramework(gdprFramework);

// Assess compliance
const compliance = await governanceEngine.assessCompliance('gdpr-framework');

console.log('Compliance Score:', compliance.complianceScore);
console.log('Gaps:', compliance.gaps);
console.log('Recommendations:', compliance.recommendations);
```

### Privacy Request Management

```typescript
// Submit data subject access request
const accessRequest = await governanceEngine.submitPrivacyRequest(
  'access',               // Request type
  'user123',              // Subject ID
  'user@example.com',     // Subject email
  {
    requestDetails: 'Please provide all my personal data',
  }
);

console.log('Request ID:', accessRequest.id);
console.log('Status:', accessRequest.status);

// Process erasure request (Right to be Forgotten)
const erasureRequest = await governanceEngine.submitPrivacyRequest(
  'erasure',
  'user123',
  'user@example.com',
  {
    reason: 'I no longer wish to use the service',
  }
);

// Execute erasure
await governanceEngine.processErasureRequest(erasureRequest.id);
```

## Data Lineage Tracking

### Registering Data Assets

```typescript
// Register a source table
await lineageEngine.registerNode({
  id: 'source_customers',
  name: 'customers',
  type: 'table',
  location: 'postgresql://prod-db/crm/customers',
  metadata: {
    schema: 'crm',
    database: 'prod-db',
    description: 'Customer master data',
  },
  columns: [
    { name: 'id', type: 'integer', tags: ['primary-key'] },
    { name: 'email', type: 'varchar', tags: ['pii'] },
    { name: 'created_at', type: 'timestamp', tags: [] },
  ],
  owner: 'data-team',
  tags: ['customer', 'master-data'],
  discoveryMethod: 'manual',
  confidence: 1.0,
});

// Register a transformation
await lineageEngine.registerNode({
  id: 'transform_customer_analytics',
  name: 'customer_analytics',
  type: 'transformation',
  location: 'airflow://dags/customer_etl',
  metadata: {
    transformationLogic: 'SELECT id, email, COUNT(*) as order_count FROM customers JOIN orders',
    transformationType: 'sql',
  },
  owner: 'analytics-team',
  tags: ['analytics', 'etl'],
  discoveryMethod: 'manual',
  confidence: 1.0,
});

// Register target table
await lineageEngine.registerNode({
  id: 'target_customer_metrics',
  name: 'customer_metrics',
  type: 'table',
  location: 'postgresql://analytics-db/metrics/customer_metrics',
  metadata: {
    schema: 'metrics',
    database: 'analytics-db',
  },
  columns: [
    { name: 'customer_id', type: 'integer', tags: [] },
    { name: 'order_count', type: 'integer', tags: [] },
  ],
  owner: 'analytics-team',
  tags: ['metrics', 'derived'],
  discoveryMethod: 'manual',
  confidence: 1.0,
});
```

### Tracking Relationships

```typescript
// Track lineage edge
await lineageEngine.trackEdge({
  sourceId: 'source_customers',
  targetId: 'transform_customer_analytics',
  edgeType: 'transformation',
  metadata: {
    tool: 'airflow',
    schedule: '0 2 * * *',
  },
});

await lineageEngine.trackEdge({
  sourceId: 'transform_customer_analytics',
  targetId: 'target_customer_metrics',
  edgeType: 'direct-copy',
  metadata: {},
});

// Track column-level lineage
await lineageEngine.trackColumnLineage({
  sourceNodeId: 'source_customers',
  targetNodeId: 'target_customer_metrics',
  mappings: [
    {
      sourceColumn: 'id',
      targetColumn: 'customer_id',
      transformations: [],
    },
    {
      sourceColumn: 'id',
      targetColumn: 'order_count',
      transformations: [{
        type: 'aggregation',
        logic: 'COUNT(orders.id)',
        description: 'Count of orders per customer',
      }],
    },
  ],
});
```

### Automated Lineage Discovery

```typescript
// Discover lineage from SQL
const sqlQuery = `
  INSERT INTO customer_metrics (customer_id, order_count)
  SELECT c.id, COUNT(o.id)
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
  GROUP BY c.id
`;

const discoveryResult = await lineageEngine.discoverFromSQL(sqlQuery, {
  defaultSchema: 'public',
  database: 'prod-db',
});

console.log('Discovered sources:', discoveryResult.sources);
console.log('Discovered targets:', discoveryResult.targets);
console.log('Discovered transformations:', discoveryResult.transformations);
```

### Impact Analysis

```typescript
// Analyze impact of changing a source table
const impact = await lineageEngine.analyzeImpact(
  'source_customers',
  'schema-change',
  {
    changes: {
      removedColumns: ['email'],
      addedColumns: ['contact_email'],
    },
  }
);

console.log('Affected nodes:', impact.affectedNodes.length);
console.log('Risk level:', impact.riskLevel);
console.log('Breaking changes:', impact.breakingChanges);
console.log('Recommendations:', impact.recommendations);
console.log('Estimated downtime:', impact.estimatedDowntime);
```

### Lineage Visualization

```typescript
// Build lineage graph
const graph = await lineageEngine.buildGraph('source_customers', {
  direction: 'downstream',
  depth: 5,
  includeColumnLineage: true,
});

// Export to different formats
const dotFormat = await lineageEngine.exportGraph(graph, 'dot');
const jsonFormat = await lineageEngine.exportGraph(graph, 'json');
const cytoscapeFormat = await lineageEngine.exportGraph(graph, 'cytoscape');
```

## Master Data Management

### Entity Matching

```typescript
import { MatchRule } from '@summit/master-data-mgmt';

// Define match rules
const matchRules: MatchRule[] = [
  {
    id: 'exact-email',
    name: 'Exact Email Match',
    fields: ['email'],
    algorithm: 'exact',
    weight: 1.0,
    threshold: 1.0,
  },
  {
    id: 'fuzzy-name',
    name: 'Fuzzy Name Match',
    fields: ['first_name', 'last_name'],
    algorithm: 'levenshtein',
    weight: 0.8,
    threshold: 0.85,
  },
  {
    id: 'phone-soundex',
    name: 'Phonetic Phone Match',
    fields: ['phone'],
    algorithm: 'soundex',
    weight: 0.6,
    threshold: 0.9,
  },
];

// Find matches
const sourceRecord = {
  id: 'src_001',
  domain: 'customer',
  attributes: {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '555-0123',
  },
};

const candidates = [
  {
    id: 'cand_001',
    domain: 'customer',
    attributes: {
      first_name: 'Jon',
      last_name: 'Smith',
      email: 'j.smith@example.com',
      phone: '555-0123',
    },
  },
];

const matches = await mdmEngine.findMatches(sourceRecord, candidates, matchRules);

console.log('Matches found:', matches);
```

### Record Merging

```typescript
import { MergeStrategy } from '@summit/master-data-mgmt';

// Define merge strategy with survivorship rules
const mergeStrategy: MergeStrategy = {
  id: 'customer-merge',
  name: 'Customer Merge Strategy',
  domain: 'customer',
  fieldStrategies: {
    email: {
      strategy: 'most_recent',
      priority: 1,
    },
    phone: {
      strategy: 'most_complete',
      priority: 2,
    },
    address: {
      strategy: 'highest_quality',
      priority: 3,
      qualityScoreField: 'data_quality_score',
    },
    preferences: {
      strategy: 'concatenate',
      priority: 4,
      separator: ',',
    },
  },
  conflictResolution: 'automatic',
};

// Merge records
const goldenRecord = await mdmEngine.mergeRecords(
  [sourceRecord, ...matches.map(m => m.candidate)],
  mergeStrategy
);

console.log('Golden Record:', goldenRecord);
console.log('Data Lineage:', goldenRecord.lineage);
```

### Hierarchy Management

```typescript
// Create entity hierarchy
await mdmEngine.createRelationship({
  parentId: 'org_acme_corp',
  childId: 'org_acme_west',
  relationshipType: 'parent-child',
  metadata: {
    region: 'west',
    established: '2020-01-01',
  },
});

// Build organizational hierarchy
const hierarchy = await mdmEngine.buildHierarchy('org_acme_corp', 5);

console.log('Hierarchy:', hierarchy);

// Get descendants
const descendants = await mdmEngine.getDescendants('org_acme_corp');

// Get ancestors
const ancestors = await mdmEngine.getAncestors('org_acme_west');
```

### Data Stewardship Workflows

```typescript
// Create stewardship task for manual review
const task = await mdmEngine.createStewardshipTask({
  title: 'Review Customer Merge',
  description: 'Multiple matches found for customer record, manual review required',
  type: 'review',
  priority: 'high',
  assignee: 'data-steward-team',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  entityId: goldenRecord.id,
  metadata: {
    matchConfidence: 0.85,
    conflictFields: ['email', 'phone'],
  },
});

console.log('Task created:', task.id);
```

## Data Catalog

### Metadata Extraction

```typescript
// Extract metadata from PostgreSQL
const extractionResult = await catalogEngine.extractMetadata({
  source: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL!,
  },
  profileData: true,
  enrichSemantics: true,
});

console.log('Assets discovered:', extractionResult.assets.length);
console.log('Schemas found:', extractionResult.schemas.length);

// Register extracted assets
const registeredIds = await catalogEngine.registerAssets(extractionResult.assets);

console.log('Registered assets:', registeredIds);
```

### Business Glossary

```typescript
// Create business term
const term = await catalogEngine.createTerm({
  name: 'customer_lifetime_value',
  displayName: 'Customer Lifetime Value',
  definition: 'The predicted net profit attributed to the entire future relationship with a customer',
  domain: 'Analytics',
  synonyms: ['CLV', 'LTV', 'lifetime_value'],
  relatedTerms: ['customer_value', 'revenue_per_customer'],
  status: 'approved',
  steward: 'analytics-team',
  owner: 'chief-analytics-officer',
  tags: ['kpi', 'customer', 'revenue'],
  examples: ['CLV = $5000 for premium customers'],
  businessRules: ['Calculated monthly using predictive model'],
});

// Link term to data asset
await catalogEngine.linkTermToAsset(term.id, registeredIds[0], {
  confidence: 0.95,
  verifiedBy: 'data-steward',
  notes: 'Primary calculation for CLV metrics',
});
```

### Search and Discovery

```typescript
// Search for assets
const searchResults = await catalogEngine.search({
  query: 'customer',
  types: ['TABLE', 'VIEW'],
  domains: ['Analytics'],
  tags: ['customer', 'kpi'],
  minQualityScore: 80,
  limit: 20,
});

console.log('Found assets:', searchResults.total);
console.log('Top results:', searchResults.results.slice(0, 5));

// Faceted search
const facetedResults = await catalogEngine.searchWithFacets({
  query: 'revenue',
  facets: ['type', 'domain', 'owner'],
});

console.log('Facets:', facetedResults.facets);

// Get asset details
const asset = await catalogEngine.getAsset(registeredIds[0]);
console.log('Asset:', asset);
```

## Advanced Features

### Quality Monitoring Dashboard

```typescript
// Set up continuous monitoring
async function monitorQuality(tableName: string) {
  const interval = setInterval(async () => {
    const dashboard = await qualityEngine.getQualityDashboard(tableName);

    // Check for quality degradation
    if (dashboard.score.overallScore < 80) {
      console.error(`Quality alert: ${tableName} score dropped to ${dashboard.score.overallScore}`);

      // Send alert
      await sendAlert({
        severity: 'high',
        message: `Data quality issue in ${tableName}`,
        score: dashboard.score.overallScore,
        dimensions: dashboard.score.dimensions,
      });
    }

    // Check for anomalies
    if (dashboard.recentAnomalies.length > 0) {
      console.warn(`Anomalies detected in ${tableName}:`, dashboard.recentAnomalies);
    }
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}

// Start monitoring
const stopMonitoring = await monitorQuality('users');
```

### Compliance Reporting

```typescript
// Generate comprehensive compliance report
async function generateComplianceReport(frameworkId: string) {
  const assessment = await governanceEngine.assessCompliance(frameworkId);

  const report = {
    framework: assessment.framework.name,
    assessmentDate: new Date(),
    overallScore: assessment.complianceScore,
    status: assessment.framework.status,
    requirements: {
      total: assessment.framework.requirements.length,
      met: assessment.framework.requirements.filter(r => r.status === 'met').length,
      notMet: assessment.framework.requirements.filter(r => r.status === 'not-met').length,
    },
    gaps: assessment.gaps.map(gap => ({
      code: gap.code,
      description: gap.description,
      category: gap.category,
      mandatory: gap.mandatory,
    })),
    recommendations: assessment.recommendations,
    controls: assessment.framework.controls.map(ctrl => ({
      name: ctrl.name,
      type: ctrl.type,
      automated: ctrl.automated,
      effectiveness: ctrl.effectiveness,
    })),
  };

  return report;
}

const gdprReport = await generateComplianceReport('gdpr-framework');
console.log('GDPR Compliance Report:', JSON.stringify(gdprReport, null, 2));
```

### Automated Lineage Discovery Pipeline

```typescript
// Set up automated lineage discovery
async function discoverLineageAutomatically() {
  // Scan database for tables
  const tables = await scanDatabaseTables();

  // Register all tables as nodes
  for (const table of tables) {
    await lineageEngine.registerNode({
      id: `table_${table.schema}_${table.name}`,
      name: table.name,
      type: 'table',
      location: `postgresql://${table.schema}/${table.name}`,
      metadata: {
        schema: table.schema,
        rowCount: table.rowCount,
      },
      columns: table.columns,
      owner: table.owner,
      tags: table.tags,
      discoveryMethod: 'metadata-scanning',
      confidence: 0.9,
    });
  }

  // Scan query logs for relationships
  const queries = await getQueryLogs();

  for (const query of queries) {
    const discovery = await lineageEngine.discoverFromSQL(query.sql, {
      defaultSchema: 'public',
      database: 'prod-db',
    });

    // Discovery result includes sources, targets, and transformations
    // Lineage edges are automatically created
  }

  console.log('Lineage discovery complete');
}

await discoverLineageAutomatically();
```

## Integration Guide

### REST API Integration

The platform provides two microservices with comprehensive REST APIs:

#### Data Quality Service

```bash
# Start the service
cd services/data-quality-service
pnpm install
pnpm dev

# Service runs on http://localhost:3000
# Swagger docs: http://localhost:3000/api-docs
```

Example API calls:

```bash
# Health check
curl http://localhost:3000/health

# Profile dataset
curl -X POST http://localhost:3000/api/v1/profiling/profile \
  -H "Content-Type: application/json" \
  -d '{"tableName": "users", "config": {"sampleSize": 10000}}'

# Run quality assessment
curl -X POST http://localhost:3000/api/v1/quality/assess \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "users",
    "rules": [...],
    "config": {}
  }'

# Get quality dashboard
curl http://localhost:3000/api/v1/quality/dashboard/users
```

#### Governance Service

```bash
# Start the service
cd services/governance-service
pnpm install
pnpm dev

# Service runs on http://localhost:3030
# Swagger docs: http://localhost:3030/api-docs
```

Example API calls:

```bash
# Health check
curl http://localhost:3030/health

# Register policy
curl -X POST http://localhost:3030/api/v1/policies \
  -H "Content-Type: application/json" \
  -d '{...policy definition...}'

# Evaluate access
curl -X POST http://localhost:3030/api/v1/policies/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "resource": "users.email",
    "action": "read",
    "context": {"userRole": "analyst"}
  }'

# Submit privacy request
curl -X POST http://localhost:3030/api/v1/privacy/requests \
  -H "Content-Type: application/json" \
  -d '{
    "type": "access",
    "subjectId": "user123",
    "subjectEmail": "user@example.com"
  }'
```

### Event-Driven Integration

```typescript
// Example: Integrate with event streaming platform
import { EventEmitter } from 'events';

class DataQualityEvents extends EventEmitter {
  async monitorQuality() {
    setInterval(async () => {
      const dashboard = await qualityEngine.getQualityDashboard('users');

      // Emit quality score event
      this.emit('quality:score', {
        dataset: 'users',
        score: dashboard.score.overallScore,
        dimensions: dashboard.score.dimensions,
        timestamp: new Date(),
      });

      // Emit anomaly events
      dashboard.recentAnomalies.forEach(anomaly => {
        this.emit('quality:anomaly', {
          dataset: 'users',
          anomaly,
          timestamp: new Date(),
        });
      });
    }, 60000);
  }
}

const qualityEvents = new DataQualityEvents();

// Subscribe to events
qualityEvents.on('quality:score', (data) => {
  console.log('Quality score updated:', data);
  // Send to Kafka, RabbitMQ, etc.
});

qualityEvents.on('quality:anomaly', (data) => {
  console.warn('Anomaly detected:', data);
  // Trigger alerts
});

await qualityEvents.monitorQuality();
```

## Troubleshooting

### Common Issues

#### Issue: Database Connection Errors

```typescript
// Solution: Use connection pooling with retry logic
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds
});

// Test connection
try {
  const client = await pool.connect();
  console.log('Database connected successfully');
  client.release();
} catch (error) {
  console.error('Database connection failed:', error);
}
```

#### Issue: Performance with Large Datasets

```typescript
// Solution: Use sampling and batch processing
const profiles = await qualityEngine.getProfiler().profileDataset(
  'large_table',
  {
    sampleSize: 100000,  // Profile only 100k rows
    includePatterns: false,  // Skip pattern analysis
    includeDistribution: false,  // Skip distribution
  }
);

// Or use batch validation
const validator = qualityEngine.getValidator();
validator.registerRule(rule);

const results = await validator.validate('large_table', {
  stopOnFirstError: true,  // Stop at first failure
  maxViolations: 100,      // Limit violations collected
});
```

#### Issue: Memory Issues with Lineage Graphs

```typescript
// Solution: Limit graph depth and use pagination
const graph = await lineageEngine.buildGraph('node_id', {
  direction: 'downstream',
  depth: 3,  // Limit depth to 3 levels
  includeColumnLineage: false,  // Skip column details
});

// Or get nodes in batches
const upstreamNodes = await lineageEngine.getUpstreamNodes('node_id', 2);
```

## Best Practices

See [BEST_PRACTICES.md](./BEST_PRACTICES.md) for comprehensive best practices guide.

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/summit/data-quality-platform/issues
- Documentation: https://docs.summit.io/data-quality
- Support: support@summit.io

## License

MIT License - See LICENSE file for details
