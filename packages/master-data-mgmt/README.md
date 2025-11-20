# Master Data Management (MDM) Package

Enterprise-grade Master Data Management solution with golden record creation, entity matching, record merging, hierarchy management, and data stewardship workflows.

## Features

- **Golden Record Creation**: Create and maintain single sources of truth for master data entities
- **Entity Matching**: Advanced matching algorithms including fuzzy, phonetic, Levenshtein, and Jaro-Winkler
- **Record Merging**: Intelligent merging with configurable survivorship rules and conflict resolution
- **Hierarchy Management**: Manage complex entity hierarchies and relationships
- **Data Stewardship**: Workflow engine for data governance and quality management
- **Multi-Domain MDM**: Support for customer, product, location, and custom domains
- **Version Control**: Complete audit trail with versioning for all master data changes
- **Reference Data Management**: Standardization and validation using reference data
- **SLA Management**: Configurable SLAs with automatic escalation
- **Production-Ready**: Full TypeScript typing, OpenTelemetry tracing, and error handling

## Installation

```bash
npm install @summit/master-data-mgmt
```

## Quick Start

```typescript
import { MDMEngine } from '@summit/master-data-mgmt';
import { Pool } from 'pg';

// Initialize MDM Engine
const mdm = new MDMEngine({
  database: {
    pool: new Pool({ connectionString: process.env.DATABASE_URL })
  },
  matching: {
    useBlocking: true,
    maxCandidates: 100
  },
  merging: {
    preserveSourceRecords: true,
    enableVersionControl: true
  },
  workflow: {
    enableNotifications: true,
    autoAssignment: true
  }
});

// Configure MDM domains
await mdm.initialize({
  domains: [
    {
      domain: 'customer',
      enabled: true,
      matchRules: [customerMatchRules],
      mergeStrategy: customerMergeStrategy,
      workflows: [customerWorkflows]
    }
  ],
  matching: {
    enableAutoMatching: true,
    autoMatchThreshold: 0.85
  },
  merging: {
    enableAutoMerge: true,
    autoMergeThreshold: 0.9
  }
});
```

## Core Concepts

### Source Records

Source records represent data from individual source systems before consolidation:

```typescript
import type { SourceRecord } from '@summit/master-data-mgmt';

const sourceRecord: SourceRecord = {
  recordId: 'src-001',
  sourceSystem: {
    systemId: 'crm-001',
    systemName: 'Salesforce',
    systemType: 'CRM',
    priority: 90
  },
  domain: 'customer',
  data: {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '555-0123'
  },
  confidence: 0.95,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date()
};

await mdm.addSourceRecord(sourceRecord);
```

### Golden Records

Golden records are the consolidated, single source of truth created by merging source records:

```typescript
// Find matches for a source record
const matches = await mdm.findMatches(sourceRecord);

// Merge matching records into golden record
const mergeResult = await mdm.mergeRecords(
  ['src-001', 'src-002', 'src-003'],
  'default-merge-strategy',
  'user-123'
);

console.log(mergeResult.goldenRecord);
console.log(`Conflicts: ${mergeResult.conflicts.length}`);
console.log(`Requires Review: ${mergeResult.requiresReview}`);
```

## Entity Matching

Configure matching rules with multiple algorithms:

```typescript
import type { MatchRule } from '@summit/master-data-mgmt';

const matchRule: MatchRule = {
  ruleId: 'customer-name-match',
  name: 'Customer Name and Email Match',
  domain: 'customer',
  algorithm: 'fuzzy',
  threshold: 0.8,
  weight: 1.0,
  enabled: true,
  priority: 1,
  fields: [
    {
      fieldName: 'firstName',
      weight: 0.3,
      algorithm: 'jaro_winkler',
      caseSensitive: false,
      normalizeWhitespace: true
    },
    {
      fieldName: 'lastName',
      weight: 0.4,
      algorithm: 'jaro_winkler',
      caseSensitive: false
    },
    {
      fieldName: 'email',
      weight: 0.3,
      algorithm: 'exact',
      caseSensitive: false
    }
  ],
  blocking: [
    {
      fields: ['lastName'],
      transform: 'first_n_chars',
      length: 3
    }
  ]
};

await mdm.registerMatchRule(matchRule);
```

### Matching Algorithms

- **exact**: Exact string matching
- **fuzzy**: Fuzzy matching using Levenshtein distance
- **levenshtein**: Levenshtein distance-based similarity
- **jaro_winkler**: Jaro-Winkler similarity (good for names)
- **phonetic**: Phonetic matching (Soundex, Metaphone)
- **ngram**: N-gram similarity

### Blocking Strategies

Improve performance by pre-filtering candidates:

```typescript
blocking: [
  {
    fields: ['zipCode', 'lastName'],
    transform: 'lowercase'
  }
]
```

## Record Merging

Configure survivorship rules to determine which values survive in merges:

```typescript
import type { MergeStrategy, SurvivorshipRule } from '@summit/master-data-mgmt';

const mergeStrategy: MergeStrategy = {
  strategyId: 'customer-merge',
  name: 'Customer Merge Strategy',
  domain: 'customer',
  conflictResolution: 'hybrid',
  requiresApproval: false,
  autoMergeThreshold: 0.9,
  survivorshipRules: [
    {
      ruleId: 'email-priority',
      fieldName: 'email',
      priority: 1,
      strategy: 'source_priority' // Use highest priority source
    },
    {
      ruleId: 'phone-recent',
      fieldName: 'phone',
      priority: 2,
      strategy: 'most_recent' // Use most recently updated
    },
    {
      ruleId: 'address-complete',
      fieldName: 'address',
      priority: 3,
      strategy: 'most_complete' // Use most complete value
    },
    {
      ruleId: 'name-quality',
      fieldName: 'fullName',
      priority: 4,
      strategy: 'highest_quality' // Use highest confidence source
    }
  ]
};

await mdm.registerMergeStrategy(mergeStrategy);
```

### Survivorship Strategies

- **most_recent**: Most recently updated value
- **most_complete**: Value with most data
- **most_frequent**: Most common value across sources
- **highest_quality**: From highest quality/confidence source
- **source_priority**: Based on source system priority
- **longest**: Longest string value
- **highest_value**: Highest numeric value
- **lowest_value**: Lowest numeric value
- **concatenate**: Combine all unique values

### Conflict Resolution

```typescript
conflictResolution: 'automatic' // Auto-resolve using survivorship rules
conflictResolution: 'manual'    // Require human review
conflictResolution: 'hybrid'    // Auto for high confidence, manual for low
```

## Entity Hierarchies

Manage complex organizational and product hierarchies:

```typescript
import type { EntityRelationship } from '@summit/master-data-mgmt';

// Create relationships
const relationship = await mdm.createRelationship(
  'parent-entity-001',
  'child-entity-001',
  'parent_child',
  'customer',
  { relationshipStrength: 1.0 }
);

// Build hierarchy
const hierarchy = await mdm.buildHierarchy(
  relationships,
  'root-entity-001',
  'customer',
  'Customer Organization Hierarchy'
);

// Navigate hierarchy
const hierarchyManager = mdm.getHierarchyManager();

// Get descendants
const descendants = await hierarchyManager.getDescendants(
  'entity-001',
  relationships,
  3 // max depth
);

// Get ancestors
const ancestors = await hierarchyManager.getAncestors(
  'entity-001',
  relationships
);

// Find path between entities
const path = await hierarchyManager.findPath(
  'entity-001',
  'entity-002',
  relationships
);

// Get hierarchy statistics
const stats = await hierarchyManager.calculateStats(hierarchy);
console.log(`Total nodes: ${stats.totalNodes}`);
console.log(`Max depth: ${stats.maxDepth}`);
console.log(`Leaf nodes: ${stats.leafNodes}`);
```

### Hierarchy Validation

```typescript
const validation = {
  allowCycles: false,
  maxDepth: 10,
  allowMultipleParents: false,
  requireRoot: true
};

const hierarchy = await mdm.buildHierarchy(
  relationships,
  rootId,
  'customer',
  'Hierarchy Name',
  validation
);
```

## Data Stewardship Workflows

Automate data governance with configurable workflows:

```typescript
import type { WorkflowDefinition } from '@summit/master-data-mgmt';

const workflow: WorkflowDefinition = {
  workflowId: 'merge-review-workflow',
  name: 'Merge Review Workflow',
  domain: 'customer',
  taskType: 'merge_review',
  isActive: true,
  autoAssign: true,
  steps: [
    {
      stepId: 'review-conflicts',
      name: 'Review Data Conflicts',
      order: 1,
      type: 'manual',
      action: 'review_and_resolve',
      requiredRole: 'data-steward',
      timeout: 2880, // 48 hours
      onTimeout: 'escalate'
    },
    {
      stepId: 'approve-merge',
      name: 'Approve Merge',
      order: 2,
      type: 'manual',
      action: 'approve',
      requiredRole: 'data-manager'
    }
  ],
  assignmentRules: [
    {
      ruleId: 'assign-by-domain',
      priority: 1,
      conditions: [
        { field: 'domain', operator: 'equals', value: 'customer' }
      ],
      assignTo: 'customer-steward-team',
      balanceLoad: true
    }
  ],
  escalationRules: [
    {
      ruleId: 'escalate-overdue',
      triggerAfter: 2880, // 48 hours
      escalateTo: 'data-management-lead',
      notificationChannels: ['email', 'slack']
    }
  ],
  sla: {
    responseTime: 60, // 1 hour
    resolutionTime: 2880, // 48 hours
    businessHoursOnly: true,
    excludeWeekends: true,
    timezone: 'America/New_York'
  }
};

const workflowEngine = mdm.getWorkflowEngine();
await workflowEngine.registerWorkflow(workflow);
```

### Task Management

```typescript
// Create task
const task = await mdm.createTask(
  'merge_review',
  'customer',
  'Review Customer Merge',
  'Please review and resolve conflicts',
  {
    recordIds: ['src-001', 'src-002'],
    conflicts: mergeResult.conflicts
  },
  'high',
  'user-123'
);

// Get tasks
const tasks = await workflowEngine.getTasks({
  status: 'pending',
  assignedTo: 'user-123',
  domain: 'customer'
});

// Update task
await workflowEngine.updateTaskStatus(
  task.taskId,
  'completed',
  'user-123',
  'All conflicts resolved'
);

// Add comment
await workflowEngine.addTaskComment(
  task.taskId,
  'user-123',
  'Verified with source system team'
);
```

### SLA Monitoring

```typescript
// Check for violations
const violations = await workflowEngine.checkSLAViolations();

for (const violation of violations) {
  console.log(`Task ${violation.taskId} violated ${violation.violationType}`);
  console.log(`Expected: ${violation.expectedTime}min, Actual: ${violation.actualTime}min`);
}

// Get metrics
const metrics = await workflowEngine.getTaskMetrics('customer');
console.log(`Total tasks: ${metrics.total}`);
console.log(`SLA compliance: ${metrics.slaCompliance}%`);
console.log(`Average resolution time: ${metrics.averageResolutionTime} minutes`);
```

## Reference Data Management

Standardize and validate data using reference data:

```typescript
import type { ReferenceDataSet, ReferenceData } from '@summit/master-data-mgmt';

const referenceDataSet: ReferenceDataSet = {
  setId: 'country-codes',
  name: 'Country Codes',
  domain: 'customer',
  category: 'geography',
  version: 1,
  isActive: true,
  updatedAt: new Date(),
  updatedBy: 'admin',
  data: [
    {
      referenceId: 'ref-001',
      domain: 'customer',
      category: 'geography',
      code: 'US',
      value: 'United States',
      description: 'United States of America',
      isActive: true,
      effectiveDate: new Date(),
      version: 1
    },
    {
      referenceId: 'ref-002',
      domain: 'customer',
      category: 'geography',
      code: 'CA',
      value: 'Canada',
      isActive: true,
      effectiveDate: new Date(),
      version: 1
    }
  ]
};

await mdm.registerReferenceDataSet(referenceDataSet);

// Validate data
const isValid = await mdm.validateReferenceData('country-codes', 'US');
console.log(`Valid country code: ${isValid}`);

// Get reference data
const countries = await mdm.getReferenceData('country-codes');
```

## Version Control

Track all changes to master data:

```typescript
// Get version history
const versions = await mdm.getVersionHistory('golden-001');

for (const version of versions) {
  console.log(`Version ${version.version}`);
  console.log(`Type: ${version.changeType}`);
  console.log(`Created: ${version.createdAt}`);
  console.log(`By: ${version.createdBy}`);
}

// Get specific version
const v2 = await mdm.getVersion('golden-001', 2);
console.log(v2?.data);
```

## Audit Logging

Complete audit trail of all MDM operations:

```typescript
// Get audit logs
const logs = await mdm.getAuditLogs({
  entityId: 'golden-001',
  entityType: 'golden_record',
  domain: 'customer',
  startDate: new Date('2024-01-01'),
  endDate: new Date()
});

for (const log of logs) {
  console.log(`${log.timestamp}: ${log.action} by ${log.userName}`);
  console.log(`Entity: ${log.entityType} ${log.entityId}`);
  if (log.changes) {
    for (const change of log.changes) {
      console.log(`  ${change.field}: ${change.oldValue} -> ${change.newValue}`);
    }
  }
}
```

## Auto-Merge

Automatically merge matching records above a threshold:

```typescript
// Auto-merge all customer records with 90%+ match score
const mergeResults = await mdm.autoMerge(
  'customer',
  0.90, // match threshold
  'system'
);

console.log(`Created ${mergeResults.length} golden records`);

for (const result of mergeResults) {
  console.log(`Golden ID: ${result.goldenRecord.goldenId}`);
  console.log(`Merged ${result.sourceRecordIds.length} source records`);
  console.log(`Conflicts: ${result.conflicts.length}`);
  console.log(`Confidence: ${result.confidence}`);
}
```

## Statistics and Monitoring

Get insights into your MDM operations:

```typescript
// Get overall statistics
const stats = await mdm.getStatistics('customer');
console.log(stats);
// {
//   sourceRecords: 1500,
//   goldenRecords: 1200,
//   matchRules: 3,
//   mergeStrategies: 1,
//   referenceDataSets: 5,
//   auditLogs: 3500
// }

// Get task metrics
const workflowEngine = mdm.getWorkflowEngine();
const taskMetrics = await workflowEngine.getTaskMetrics('customer');
console.log(taskMetrics);
// {
//   total: 50,
//   byStatus: { pending: 10, in_progress: 15, completed: 25 },
//   byPriority: { low: 5, medium: 30, high: 10, critical: 5 },
//   averageResolutionTime: 1440,
//   slaCompliance: 95.5
// }
```

## Advanced Configuration

### Complete MDM Configuration

```typescript
const mdmConfig: MDMConfig = {
  domains: [
    {
      domain: 'customer',
      enabled: true,
      matchRules: [customerMatchRules],
      mergeStrategy: customerMergeStrategy,
      workflows: [mergeReviewWorkflow, dataQualityWorkflow],
      referenceDataSets: ['country-codes', 'state-codes']
    },
    {
      domain: 'product',
      enabled: true,
      matchRules: [productMatchRules],
      mergeStrategy: productMergeStrategy,
      workflows: [productReviewWorkflow]
    }
  ],
  matching: {
    enableAutoMatching: true,
    autoMatchThreshold: 0.85,
    reviewThreshold: 0.7,
    maxCandidates: 100,
    useBlocking: true,
    parallelProcessing: true,
    batchSize: 50
  },
  merging: {
    enableAutoMerge: false,
    autoMergeThreshold: 0.95,
    defaultConflictResolution: 'hybrid',
    preserveSourceRecords: true,
    versionControl: true
  },
  hierarchy: {
    validation: {
      allowCycles: false,
      maxDepth: 10,
      allowMultipleParents: false,
      requireRoot: true
    },
    enableCaching: true,
    cacheTimeout: 300000,
    allowDynamicHierarchies: true
  },
  stewardship: {
    enableWorkflows: true,
    autoAssignment: true,
    enableNotifications: true,
    notificationChannels: ['email', 'slack'],
    enableSLA: true
  },
  storage: {
    type: 'postgresql',
    connectionString: process.env.DATABASE_URL
  },
  audit: {
    enabled: true,
    logLevel: 'detailed',
    retentionDays: 365,
    includeDataSnapshots: true
  }
};

await mdm.initialize(mdmConfig);
```

## Best Practices

1. **Use Blocking**: Enable blocking strategies to improve matching performance on large datasets
2. **Tune Thresholds**: Adjust match and merge thresholds based on your data quality
3. **Prioritize Sources**: Set source system priorities to ensure highest quality data wins
4. **Enable Versioning**: Always enable version control for audit trails
5. **Configure Workflows**: Set up stewardship workflows for critical data changes
6. **Monitor SLAs**: Regularly check for SLA violations and adjust timeouts
7. **Use Reference Data**: Standardize values using reference data sets
8. **Review Conflicts**: Set appropriate review thresholds to catch low-confidence merges
9. **Batch Operations**: Use batch matching and merging for bulk processing
10. **Cache Hierarchies**: Enable caching for frequently accessed hierarchies

## Performance Optimization

- Use blocking keys to reduce match candidates
- Enable parallel processing for large datasets
- Configure appropriate batch sizes
- Cache frequently accessed hierarchies
- Use database connection pooling
- Monitor and tune match algorithm weights

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  SourceRecord,
  GoldenRecord,
  MatchRule,
  MatchResult,
  MergeStrategy,
  MergeResult,
  EntityHierarchy,
  StewardshipTask,
  WorkflowDefinition
} from '@summit/master-data-mgmt';
```

## OpenTelemetry Integration

Built-in distributed tracing:

```typescript
import { trace } from '@opentelemetry/api';

// All major operations are automatically traced
const tracer = trace.getTracer('master-data-mgmt');
```

## License

MIT

## Support

For issues and questions, please refer to the main Summit documentation.
