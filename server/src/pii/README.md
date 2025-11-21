# PII Detection and Redaction System

## Overview

Summit's PII detection and redaction system provides comprehensive protection for sensitive data across the entire platform:

- **Detection**: Rule-based + ML-based pattern matching for 73 PII types
- **Classification**: Hierarchical sensitivity levels (PUBLIC → TOP_SECRET)
- **Tagging**: Metadata propagation to catalog, graph (Neo4j), and SQL databases
- **Redaction**: Role-based and context-aware data masking
- **Copilot Integration**: Input sanitization and output filtering
- **Audit**: Complete trail of PII access and redaction decisions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Ingestion Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Connectors → IngestionHook → PII Detection → Tagging       │
│  (S3, Splunk, Chronicle, etc.)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├── Catalog Metadata Store (PostgreSQL)
                     ├── Graph Tagging (Neo4j)
                     └── SQL Metadata Columns
                     │
┌────────────────────┴────────────────────────────────────────┐
│                      Query/API Layer                         │
├─────────────────────────────────────────────────────────────┤
│  GraphQL/REST → RedactionMiddleware → Access Control        │
│                                                              │
│  User Context → Clearance Check → Redaction Policy          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    Copilot Integration                       │
├─────────────────────────────────────────────────────────────┤
│  Prompt Sanitization → LLM → Output Redaction               │
│                                                              │
│  EnhancedGuardedGenerator → PII Filter → Role-based Mask    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     └── Audit Hash Chain
```

## Quick Start

### 1. Setup PII Detection in Connectors

```typescript
import { createIngestionHook, withPIIDetection } from './pii/ingestionHooks.js';
import { createMetadataStore } from './pii/metadataStore.js';

// Create metadata store
const metadataStore = createMetadataStore({
  postgresClient: db.getClient(),
  neo4jDriver: neo4j.getDriver(),
});

// Create ingestion hook
const piiHook = createIngestionHook({
  enabled: true,
  minimumConfidence: 0.7,
  metadataStore,
  autoTagCatalog: true,
  autoTagGraph: true,
  strictMode: false, // Set to true to block high-severity PII
  onHighSeverityDetected: async (entities) => {
    console.warn(`High-severity PII detected:`, entities.map(e => e.type));
    // Send alert, create task, etc.
  },
});

// Wrap your connector
const connector = new SplunkConnector(config);
const protectedConnector = withPIIDetection(connector, piiHook, {
  onDetection: (result) => {
    console.log(`PII detected: ${result.entities.length} entities`);
  },
  onBlocked: (result) => {
    console.error(`Ingestion blocked: ${result.blockReason}`);
  },
});

// Use connector normally
const data = await protectedConnector.fetch();
// PII is automatically detected and tagged
```

### 2. Enable Redaction in GraphQL Resolvers

```typescript
import { RedactionMiddleware, createGraphQLRedactionMiddleware } from './pii/redactionMiddleware.js';

// Create redaction middleware
const redactionMiddleware = new RedactionMiddleware({
  metadataStore,
});

// Wrap GraphQL resolvers
const redactionWrapper = createGraphQLRedactionMiddleware(redactionMiddleware);

// Apply to your schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      getUser: redactionWrapper(async (_, { id }, context) => {
        return db.users.findById(id);
        // Response is automatically redacted based on context.user
      }),
    },
  },
});
```

### 3. Enable Redaction in REST APIs

```typescript
import { createRESTRedactionMiddleware } from './pii/redactionMiddleware.js';

const app = express();

// Apply redaction middleware globally
app.use(createRESTRedactionMiddleware(redactionMiddleware));

// Your endpoints
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user); // Automatically redacted based on req.user
});
```

### 4. Integrate with Copilot

```typescript
import { EnhancedGuardedGenerator, applyCopilotPIIGuard } from './pii/copilotIntegration.js';

const copilotGuard = new EnhancedGuardedGenerator();

// In your copilot handler
async function handleCopilotQuery(query: string, user: User) {
  // Sanitize input
  const inputGuard = await copilotGuard.guardInput(query, {
    user: {
      userId: user.id,
      role: user.role,
      clearance: user.clearance,
    },
    query,
  });

  // Call LLM with sanitized input
  const rawOutput = await llm.generate(inputGuard.sanitized);

  // Redact output
  const outputGuard = await copilotGuard.guard(rawOutput, {
    user: {
      userId: user.id,
      role: user.role,
      clearance: user.clearance,
    },
    query,
    includeRedactionNotices: true,
  });

  return {
    content: outputGuard.content,
    warnings: outputGuard.warnings,
  };
}
```

## Sensitivity Classes

| Class | Clearance | Use Cases | Examples |
|-------|-----------|-----------|----------|
| PUBLIC | 0 | Public information | Product names, public URLs |
| INTERNAL | 1 | Authenticated users | Internal docs, usernames |
| CONFIDENTIAL | 2 | Role-based access | Names, addresses, emails |
| HIGHLY_SENSITIVE | 3 | Need-to-know + purpose | Licenses, financial accounts |
| TOP_SECRET | 5 | Compartmentalized | SSN, passwords, medical records |

## PII Types (73 total)

### Identity
- `fullName`, `firstName`, `lastName`, `email`, `username`

### Contact
- `phoneNumber`, `mobileNumber`, `email`, `homeAddress`

### Government IDs
- `socialSecurityNumber`, `passportNumber`, `driverLicenseNumber`

### Financial
- `creditCardNumber`, `bankAccountNumber`, `routingNumber`

### Healthcare (PHI)
- `patientId`, `healthRecordNumber`, `medicalDiagnosis`, `prescription`

### Biometric
- `biometricFingerprint`, `biometricFace`, `biometricDNA`

### Network
- `ipAddress`, `macAddress`, `deviceId`

### Credentials
- `password`, `accountToken`, `accountPin`

[See full list in `types.ts`]

## Role-Based Redaction Policies

### ADMIN
- **Clearance**: 10
- **Redaction**: None
- **Access**: All data

### ANALYST
- **Clearance**: 3
- **Redaction**: Critical PII fully redacted, high PII partially masked
- **Access**: Must provide purpose for confidential+ data

### VIEWER
- **Clearance**: 1
- **Redaction**: High and critical PII fully redacted
- **Access**: Limited to internal and public data

## Configuration

### Ingestion Hook Options

```typescript
{
  enabled: boolean;              // Enable/disable PII detection
  minimumConfidence: number;     // Threshold (0.0-1.0, default 0.7)
  metadataStore?: MetadataStore; // Optional persistence
  autoTagCatalog: boolean;       // Auto-tag catalog entries
  autoTagGraph: boolean;         // Auto-tag Neo4j nodes
  autoTagSQL: boolean;           // Auto-tag SQL records
  strictMode: boolean;           // Block high-severity PII
  onHighSeverityDetected?: (entities) => Promise<void>;
}
```

### Redaction Options

```typescript
{
  strategy: 'NONE' | 'FULL' | 'PARTIAL' | 'HASH' | 'NULL' | 'REMOVE';
  showLast?: number;             // For PARTIAL masking
  maskPattern?: string;          // Default: '***'
  preserveStructure?: boolean;   // Keep field with null value
}
```

## Database Schema Setup

### PostgreSQL - Catalog Metadata

```sql
-- Run this migration to add catalog sensitivity tracking
-- (Already defined in metadata.ts)

-- Create catalog_sensitivity table
CREATE TABLE catalog_sensitivity (
  id SERIAL PRIMARY KEY,
  catalog_id VARCHAR(255) UNIQUE NOT NULL,
  catalog_type VARCHAR(50) NOT NULL,
  fully_qualified_name VARCHAR(500) NOT NULL,
  sensitivity_class VARCHAR(50) NOT NULL,
  pii_types JSONB,
  regulatory_tags JSONB,
  min_clearance INTEGER DEFAULT 0,
  -- ... see CATALOG_METADATA_SCHEMA in metadata.ts
);
```

### PostgreSQL - SQL Table Sensitivity Columns

```sql
-- Add sensitivity metadata to any existing table
ALTER TABLE your_table
  ADD COLUMN sensitivity_class VARCHAR(50),
  ADD COLUMN pii_types JSONB,
  ADD COLUMN min_clearance INTEGER DEFAULT 0,
  -- ... see SQL_SENSITIVITY_SCHEMA in metadata.ts

CREATE INDEX idx_your_table_sensitivity
  ON your_table(sensitivity_class);
```

### Neo4j - Sensitivity Properties

```cypher
// Tag a node with sensitivity metadata
MATCH (n:Entity {id: 'entity123'})
SET n.sensitivityClass = 'HIGHLY_SENSITIVE',
    n.piiTypes = 'email,phoneNumber',
    n.minClearance = 3,
    n.requiresStepUp = true

// Create indexes
CREATE INDEX sensitivity_class_idx IF NOT EXISTS
FOR (n:Entity) ON (n.sensitivityClass);
```

## Testing

### Run Integration Tests

```bash
npm test -- src/pii/__tests__/integration.test.ts
```

### Test with Sample Data

```typescript
import {
  criticalSensitivityDataset,
  testUsers,
} from './pii/__tests__/fixtures/testDatasets.js';

// Test detection
const record = criticalSensitivityDataset[0];
const result = await ingestionHook.processRecord({
  id: record.id,
  data: record,
  source: 'test',
});

console.log('Detected PII types:', result.entities.map(e => e.type));
console.log('Sensitivity class:', result.sensitivityMetadata?.sensitivityClass);

// Test redaction
const redacted = await redactionMiddleware.redact(record, testUsers.analyst);
console.log('Redacted fields:', redacted.redactedFields);
```

## Compliance

### GDPR
- All personal identifiers automatically tagged
- Right to erasure supported via catalog tracking
- Data minimization enforced via redaction policies

### HIPAA
- PHI (Protected Health Information) automatically detected
- Access logging via audit trail
- Minimum necessary standard enforced via role-based redaction

### PCI DSS
- Payment card data (PAN) detection
- Cardholder data redaction
- Access controls and audit logging

### CCPA
- California resident data identification
- Consumer data request support via catalog
- Opt-out and deletion tracking

## Audit and Logging

All PII access is logged to the audit trail with:

```typescript
{
  userId: string;
  action: 'DATA_ACCESS' | 'EXPORT' | 'ACCESS_DENIED';
  timestamp: Date;
  fieldsRedacted: string[];
  dlpRules: string[];
  purpose?: string;
  stepUpToken?: string;
}
```

Integration with existing audit hash chain:

```typescript
import { auditHashChain } from '../audit/hashchain.js';

// Log PII access
await auditHashChain.appendEvent({
  actor: user.id,
  action: 'DATA_ACCESS',
  resource: catalogId,
  purpose: 'investigation',
  result: 'allow',
  fieldsRedacted: redactionResult.redactedFields,
  dlpRules: redactionResult.auditEntry.dlpRules,
});
```

## Migration Guide

### Existing Connectors

1. Import ingestion hooks
2. Create hook with your config
3. Wrap connector with `withPIIDetection()`
4. Deploy and monitor

### Existing API Endpoints

1. Import redaction middleware
2. Add middleware to Express/GraphQL
3. Ensure user context includes clearance level
4. Test with different roles

### Existing Copilot Integration

1. Import `EnhancedGuardedGenerator`
2. Replace existing guard logic
3. Add input sanitization
4. Add output redaction

## Performance Considerations

- **Detection**: ~5-10ms per record (single-threaded)
- **Batch Processing**: Use `processBatch()` for better throughput
- **Caching**: Metadata store results are cached
- **Indexes**: Ensure proper indexes on sensitivity columns

## Troubleshooting

### PII Not Detected

- Check `minimumConfidence` threshold (lower if needed)
- Verify pattern matching in `patterns.ts`
- Check schema field hints for better context

### False Positives

- Increase `minimumConfidence` threshold
- Add custom patterns with higher confidence
- Use `signalBoost` to adjust specific PII types

### Access Denied Unexpectedly

- Check user clearance level
- Verify purpose is provided for confidential+ data
- Check if step-up authentication is required

### Performance Issues

- Enable caching in metadata store
- Use batch processing for bulk operations
- Optimize database indexes

## Support and Contributing

- File issues: GitHub Issues
- Documentation: `/docs/pii-system.md`
- Examples: `/server/src/pii/__tests__/fixtures/`

## License

Internal use only - Summit Intelligence Graph Platform
