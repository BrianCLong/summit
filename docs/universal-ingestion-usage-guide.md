# Universal Data Ingestion + ETL Assistant - Usage Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Connector Development](#connector-development)
3. [Using the ETL Assistant](#using-the-etl-assistant)
4. [License Policy Management](#license-policy-management)
5. [API Reference](#api-reference)
6. [Examples](#examples)

---

## Quick Start

### Start the Services

```bash
# 1. Start License Registry (Postgres required)
cd services/license-registry
pnpm dev

# 2. Start Universal Ingestion Service
cd services/universal-ingestion
pnpm dev
```

### Sample Workflow

```bash
# 1. Analyze sample data
curl -X POST http://localhost:4040/ingest/sources/my-source/sample \
  -H "Content-Type: application/json" \
  -d '{
    "samples": [
      {"name": "John Doe", "email": "john@example.com", "phone": "555-1234"},
      {"name": "Jane Smith", "email": "jane@example.com", "phone": "555-5678"}
    ],
    "licenseId": "open-data-cc-by",
    "schemaHint": "person"
  }'

# Response:
{
  "sourceId": "my-source",
  "schema": {
    "entityType": "Person",
    "confidence": 0.95,
    "fieldMappings": [
      {
        "sourceField": "name",
        "targetField": "name",
        "confidence": 1.0,
        "required": true
      },
      {
        "sourceField": "email",
        "targetField": "email",
        "confidence": 0.9,
        "required": false
      }
    ],
    "reasoning": "Inferred entity type \"Person\" based on field analysis..."
  },
  "pii": {
    "piiFields": [
      {
        "field": "email",
        "piiType": "email",
        "confidence": 0.95,
        "detectionMethod": "combined",
        "recommendedStrategy": "MASK"
      },
      {
        "field": "phone",
        "piiType": "phone",
        "confidence": 0.85,
        "recommendedStrategy": "MASK"
      }
    ],
    "riskLevel": "medium",
    "summary": "Detected 2 PII field(s) containing: email, phone. Overall risk level: MEDIUM."
  }
}

# 2. Register the source
curl -X POST http://localhost:4040/ingest/sources/my-source/register \
  -H "Content-Type: application/json" \
  -d '{
    "connectorType": "csv-file",
    "connectorConfig": {
      "filePath": "/data/my-file.csv"
    },
    "licenseId": "open-data-cc-by",
    "entityType": "Person",
    "redactionRules": {
      "email": "MASK",
      "phone": "MASK"
    }
  }'

# 3. Check export policy
curl -X POST http://localhost:4040/exports/check \
  -H "Content-Type: application/json" \
  -d '{
    "licenseId": "open-data-cc-by",
    "operation": "EXPORT",
    "audience": "external",
    "jurisdiction": "US"
  }'
```

---

## Connector Development

### Creating a New Connector

1. **Extend the Base Connector**

```typescript
// packages/connector-sdk/src/connectors/my-connector.ts
import { PullConnector } from '../base-connector';
import type {
  ConnectorManifest,
  ConnectorConfig,
  ConnectorContext,
  ConnectorResult,
} from '../types';

export class MyConnector extends PullConnector {
  readonly manifest: ConnectorManifest = {
    id: 'my-connector',
    name: 'My Custom Connector',
    version: '1.0.0',
    description: 'Custom connector description',
    status: 'stable',
    category: 'custom',
    capabilities: ['pull'],
    entityTypes: ['GenericRecord'],
    relationshipTypes: [],
    authentication: ['api-key'],
    requiredSecrets: ['apiKey'],
    license: 'MIT',
    maintainer: 'Your Name',
    configSchema: {
      type: 'object',
      properties: {
        apiUrl: { type: 'string' },
      },
      required: ['apiUrl'],
    },
  };

  async testConnection(): Promise<{ success: boolean; message: string }> {
    // Test connectivity
    return { success: true, message: 'Connected' };
  }

  async pull(context: ConnectorContext): Promise<ConnectorResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    let entitiesProcessed = 0;

    try {
      // Fetch data from your source
      const records = await this.fetchData();

      for (const record of records) {
        await context.rateLimiter.acquire();

        const entity = {
          type: 'GenericRecord',
          externalId: this.generateExternalId('my-source', record.id),
          props: record,
          confidence: 1.0,
          observedAt: new Date(),
        };

        await context.emitter.emitEntity(entity);
        entitiesProcessed++;
      }

      await context.emitter.flush();

      return this.successResult(
        entitiesProcessed,
        0,
        Date.now() - startTime
      );
    } catch (error) {
      return this.failureResult(
        error as Error,
        entitiesProcessed,
        0,
        Date.now() - startTime
      );
    }
  }

  private async fetchData(): Promise<any[]> {
    // Your data fetching logic
    return [];
  }
}
```

2. **Export Your Connector**

```typescript
// packages/connector-sdk/src/connectors/index.ts
export { MyConnector } from './my-connector';
```

3. **Use Your Connector**

```typescript
import { MyConnector } from '@intelgraph/connector-sdk/connectors';

const connector = new MyConnector();

await connector.initialize({
  config: {
    apiUrl: 'https://api.example.com',
  },
  secrets: {
    apiKey: 'your-api-key',
  },
  tenantId: 'tenant-123',
});

const result = await connector.pull(context);
```

---

## Using the ETL Assistant

### Schema Inference

```typescript
import { SchemaInference } from '@intelgraph/etl-assistant';

const inference = new SchemaInference();

const samples = [
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 28 },
];

const result = inference.inferSchema(samples, 'person');

console.log('Entity Type:', result.entityType); // "Person"
console.log('Confidence:', result.confidence); // 0.95
console.log('Field Mappings:', result.fieldMappings);
/*
[
  {
    sourceField: 'name',
    targetField: 'name',
    confidence: 1.0,
    required: true
  },
  ...
]
*/
```

### PII Detection

```typescript
import { PIIDetection } from '@intelgraph/etl-assistant';

const detection = new PIIDetection();

const samples = [
  { name: 'John Doe', email: 'john@example.com', ssn: '123-45-6789' },
];

const result = detection.detectPII(samples);

console.log('Risk Level:', result.riskLevel); // "critical"
console.log('PII Fields:', result.piiFields);
/*
[
  {
    field: 'email',
    piiType: 'email',
    confidence: 0.95,
    recommendedStrategy: 'MASK'
  },
  {
    field: 'ssn',
    piiType: 'ssn',
    confidence: 1.0,
    recommendedStrategy: 'DROP'
  }
]
*/

// Apply redaction
const redacted = PIIDetection.redact('john@example.com', 'MASK');
console.log(redacted); // "j***@e***.com"
```

### Canonical Mapping

```typescript
import { CanonicalMapper, MappingConfig } from '@intelgraph/etl-assistant';

const mapper = new CanonicalMapper();

const config: MappingConfig = {
  entityType: 'Person',
  fieldMappings: [
    { sourceField: 'name', targetField: 'name', ... },
    { sourceField: 'email', targetField: 'email', ... },
  ],
  redactionRules: {
    email: 'MASK',
  },
  connectorId: 'csv-file-connector',
  sourceId: 'my-source',
  licenseId: 'open-data-cc-by',
};

const records = [
  { name: 'John Doe', email: 'john@example.com' },
];

const canonical = mapper.mapRecords(records, config);

console.log(canonical);
/*
[
  {
    type: 'Person',
    externalId: 'csv-file-connector:my-source:record_0',
    props: {
      name: 'John Doe',
      email: 'j***@e***.com' // Redacted
    },
    confidence: 1.0,
    sourceMeta: {
      connectorId: 'csv-file-connector',
      sourceId: 'my-source',
      licenseId: 'open-data-cc-by',
      ingestedAt: '2025-11-22T12:00:00.000Z',
      piiRedacted: true
    }
  }
]
*/
```

### Unified ETL Assistant

```typescript
import { ETLAssistant } from '@intelgraph/etl-assistant';

const assistant = new ETLAssistant();

const samples = [
  { name: 'John Doe', email: 'john@example.com', ssn: '123-45-6789' },
];

const analysis = assistant.analyze(samples, 'person');

console.log('Schema:', analysis.schema);
console.log('PII:', analysis.pii);
```

---

## License Policy Management

### Defining Licenses

Create a license in the License Registry:

```bash
curl -X POST http://localhost:4030/licenses \
  -H "Content-Type: application/json" \
  -H "x-authority-id: admin" \
  -H "x-reason-for-access: License registration" \
  -d '{
    "name": "Open Data License",
    "type": "open_source",
    "template": "cc-by-4.0"
  }'
```

Or use the Policy Engine directly:

```typescript
import { PolicyEngine } from '@intelgraph/license-registry/policy-engine';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const policyEngine = new PolicyEngine(pool);

const decision = await policyEngine.evaluate({
  operation: 'EXPORT',
  licenseId: 'open-data-cc-by',
  audience: 'external',
  jurisdiction: 'US',
});

console.log('Allow:', decision.allow);
console.log('Reason:', decision.reason);
```

### License Templates

Pre-configured templates:

1. **cc-by-4.0**: Creative Commons Attribution 4.0
   - Commercial use: ✅
   - Export: ✅
   - Research only: ❌
   - Attribution required: ✅

2. **commercial-restricted**: Commercial License - Export Restricted
   - Commercial use: ✅
   - Export: ❌
   - Research only: ❌
   - Attribution required: ✅

3. **research-only**: Academic Research Only
   - Commercial use: ❌
   - Export: ❌
   - Research only: ✅
   - Attribution required: ✅

---

## API Reference

### POST /ingest/sources/:sourceId/sample

Analyze sample records and return schema inference + PII detection results.

**Request:**
```json
{
  "samples": [{ "field": "value" }],
  "licenseId": "string",
  "schemaHint": "string (optional)"
}
```

**Response:**
```json
{
  "sourceId": "string",
  "schema": { ... },
  "pii": { ... },
  "statistics": { ... }
}
```

### POST /ingest/sources/:sourceId/register

Register a data source with connector config and mappings.

**Request:**
```json
{
  "connectorType": "csv-file | rest-pull | s3-bucket",
  "connectorConfig": { ... },
  "licenseId": "string",
  "entityType": "string (optional)",
  "fieldMappings": [ ... ],
  "redactionRules": { ... }
}
```

**Response:**
```json
{
  "sourceId": "string",
  "status": "registered",
  "complianceStatus": "allow | warn | block",
  "warnings": [ ... ]
}
```

### POST /exports/check

Check if an export operation is allowed under license policy.

**Request:**
```json
{
  "licenseId": "string",
  "operation": "INGEST | EXPORT | SHARE | TRANSFORM",
  "audience": "string (optional)",
  "jurisdiction": "string (optional)",
  "purpose": "string (optional)"
}
```

**Response:**
```json
{
  "allow": true/false,
  "reason": "string",
  "licenseId": "string",
  "violations": [ ... ],
  "warnings": [ ... ]
}
```

---

## Examples

### Example 1: CSV Ingestion with PII Redaction

```typescript
import { CsvFileConnector } from '@intelgraph/connector-sdk/connectors';
import { ETLAssistant } from '@intelgraph/etl-assistant';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// 1. Read CSV samples
const csvContent = readFileSync('./data/users.csv', 'utf-8');
const samples = parse(csvContent, { columns: true });

// 2. Analyze with ETL Assistant
const etl = new ETLAssistant();
const analysis = etl.analyze(samples.slice(0, 100)); // Analyze first 100 records

console.log('Entity Type:', analysis.schema.entityType);
console.log('PII Risk:', analysis.pii.riskLevel);

// 3. Register source via API
const response = await fetch('http://localhost:4040/ingest/sources/users-csv/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connectorType: 'csv-file',
    connectorConfig: {
      filePath: './data/users.csv',
    },
    licenseId: 'open-data-cc-by',
    entityType: analysis.schema.entityType,
    fieldMappings: analysis.schema.fieldMappings,
    redactionRules: analysis.pii.recommendations.reduce((acc, rec) => {
      acc[rec.field] = rec.strategy;
      return acc;
    }, {}),
  }),
});

console.log('Registration:', await response.json());
```

### Example 2: REST API Polling

```typescript
import { RestPullConnector } from '@intelgraph/connector-sdk/connectors';

const connector = new RestPullConnector();

await connector.initialize({
  config: {
    baseUrl: 'https://api.example.com',
    path: '/users',
    method: 'GET',
    pagination: {
      type: 'offset',
      pageSize: 100,
      limitParam: 'limit',
      offsetParam: 'offset',
      maxPages: 10,
    },
    responseDataPath: 'data',
  },
  secrets: {
    apiKey: process.env.API_KEY,
  },
  tenantId: 'tenant-123',
});

const result = await connector.pull(context);
console.log('Ingested:', result.entitiesProcessed, 'entities');
```

### Example 3: S3 Bucket Ingestion

```typescript
import { S3BucketConnector } from '@intelgraph/connector-sdk/connectors';

const connector = new S3BucketConnector();

await connector.initialize({
  config: {
    bucket: 'my-data-bucket',
    prefix: 'ingestion/',
    filePattern: '.*\\.json$',
    parseJson: true,
    entityType: 'Document',
  },
  secrets: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  tenantId: 'tenant-123',
});

const result = await connector.pull(context);
console.log('Files processed:', result.metadata.filesProcessed);
console.log('Entities processed:', result.entitiesProcessed);
```

---

## Troubleshooting

### Common Issues

**License Registry not accessible:**
- Ensure License Registry is running on port 4030
- Set `LICENSE_REGISTRY_URL` environment variable if using different port

**Policy check fails:**
- Verify license exists in registry
- Check that required headers are included (`x-authority-id`, `x-reason-for-access`)

**CSV connector fails:**
- Verify file path is absolute
- Check file encoding (default: utf-8)
- Ensure file has proper CSV format

---

## Next Steps

- [Connector SDK Documentation](./connector-sdk-guide.md)
- [ETL Assistant API Reference](./etl-assistant-api.md)
- [Policy Engine Guide](./policy-engine-guide.md)
- [Architecture Documentation](./universal-ingestion-etl-architecture.md)
