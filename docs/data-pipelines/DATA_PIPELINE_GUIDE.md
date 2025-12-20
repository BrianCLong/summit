# Summit Data Pipeline & ETL Infrastructure Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-11-20
> **Owner**: Data Platform Team

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Pipeline Patterns](#pipeline-patterns)
5. [Change Data Capture (CDC)](#change-data-capture-cdc)
6. [Data Quality Framework](#data-quality-framework)
7. [Incremental Loading](#incremental-loading)
8. [Provenance & Lineage Tracking](#provenance--lineage-tracking)
9. [API Reference](#api-reference)
10. [Operations Guide](#operations-guide)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Summit's data pipeline infrastructure provides a comprehensive ETL/ELT framework for ingesting, transforming, and loading data across the intelligence platform. The system is designed for:

- **Scalability**: Handle millions of records with batch and streaming support
- **Reliability**: Built-in error handling, retry logic, and monitoring
- **Observability**: Complete lineage tracking and data quality monitoring
- **Flexibility**: Support for multiple source types and transformation patterns
- **Compliance**: Full audit trails and provenance tracking

### Key Capabilities

✅ **Multiple Extraction Strategies**: Full, incremental, CDC, real-time
✅ **Data Transformation**: Mapping, filtering, aggregation, enrichment
✅ **Data Quality Monitoring**: Six-dimensional quality assessment
✅ **Change Data Capture**: Timestamp, version, trigger, and log-based CDC
✅ **Incremental Loading**: Watermark-based state management
✅ **Provenance Tracking**: Complete lineage from source to target
✅ **REST API**: Full pipeline management and monitoring

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Sources                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │PostgreSQL│  │  MySQL   │  │ MongoDB  │  │REST APIs │  ...  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ETL Framework Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Data Connectors                          │  │
│  │  PostgreSQL │ MySQL │ MongoDB │ S3 │ REST API │ Custom   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Extraction Strategies                       │  │
│  │  Full │ Incremental │ CDC │ Scheduled │ Real-time       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Data Transformation                          │  │
│  │  Map │ Filter │ Aggregate │ Join │ Normalize │ Custom   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Data Validation                             │  │
│  │  Schema │ Type │ Range │ Format │ Referential │ Custom  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                Data Enrichment                            │  │
│  │  Geolocation │ IP Enrichment │ Entity Resolution │ ML    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Data Loading                             │  │
│  │  Bulk │ Upsert │ SCD Type 2 │ Append │ Delta │ Custom   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │                             │                │
        ▼                             ▼                ▼
┌─────────────────┐    ┌─────────────────────┐  ┌──────────────┐
│  Data Quality   │    │   Provenance        │  │   Target     │
│    Monitor      │    │     Ledger          │  │  Databases   │
└─────────────────┘    └─────────────────────┘  └──────────────┘
```

### Component Overview

| Component | Purpose | Location |
|-----------|---------|----------|
| **ETL Framework** | Core pipeline execution engine | `packages/etl-framework/` |
| **Data Integration** | Connectors and data source abstractions | `packages/data-integration/` |
| **ETL Service** | REST API for pipeline management | `services/etl-service/` |
| **Pipeline Orchestrator** | Multi-pipeline coordination | `services/orchestration/` |
| **Provenance Ledger** | Lineage and audit trail tracking | `services/prov-ledger/` |

---

## Core Components

### 1. Pipeline Executor

The `PipelineExecutor` orchestrates the complete ETL/ELT workflow.

```typescript
import { PipelineExecutor } from '@intelgraph/etl-framework';
import { createLogger } from 'winston';

const logger = createLogger({ level: 'info' });
const executor = new PipelineExecutor(logger);

// Execute pipeline
const run = await executor.execute(connector, config);

console.log(`Loaded ${run.recordsLoaded} records in ${run.metrics.totalDurationMs}ms`);
```

**Key Features**:
- Event-driven execution (start, progress, completed, failed)
- Automatic error handling and retry logic
- Comprehensive metrics collection
- Built-in lineage tracking

### 2. CDC Engine

The `CDCEngine` captures data changes using multiple strategies.

```typescript
import { CDCEngine, CDCStrategy } from '@intelgraph/etl-framework';

const cdcEngine = new CDCEngine(
  {
    strategy: CDCStrategy.TIMESTAMP,
    sourceTable: 'users',
    primaryKeys: ['id'],
    trackingColumn: 'updated_at',
    pollIntervalSeconds: 60,
    batchSize: 1000
  },
  logger
);

await cdcEngine.connect(connectionString);
await cdcEngine.start();

// Listen for changes
cdcEngine.on('changes', (cdcRecords) => {
  console.log(`Captured ${cdcRecords.length} changes`);
});
```

### 3. Data Quality Monitor

The `DataQualityMonitor` assesses data quality across six dimensions.

```typescript
import { DataQualityMonitor, QualityDimension } from '@intelgraph/etl-framework';

const monitor = new DataQualityMonitor(logger);

// Add custom quality rules
monitor.addRule({
  id: 'email-format',
  name: 'Email Format Validation',
  dimension: QualityDimension.VALIDITY,
  rule: {
    type: 'format',
    config: { field: 'email', format: 'email' }
  },
  threshold: 95.0,
  severity: 'high',
  enabled: true
});

// Generate quality report
const report = await monitor.generateReport(pipelineRun, data);

console.log(`Overall Quality Score: ${report.overallScore.toFixed(2)}%`);
console.log(`Issues Found: ${report.issues.length}`);
```

### 4. Incremental Loader

The `IncrementalLoader` handles watermark-based incremental loading.

```typescript
import { IncrementalLoader } from '@intelgraph/etl-framework';

const loader = new IncrementalLoader(
  {
    sourceTable: 'transactions',
    targetTable: 'transactions_dwh',
    incrementalColumn: 'created_at',
    primaryKeys: ['transaction_id'],
    watermark: {
      watermarkColumn: 'created_at',
      watermarkType: 'timestamp',
      lookbackWindow: 300 // 5 minutes lookback
    },
    batchSize: 5000
  },
  logger
);

await loader.connect(sourceConnectionString, targetConnectionString);

// Perform incremental load
const loadState = await loader.load();

console.log(`Loaded ${loadState.recordsLoaded} new records`);
```

### 5. Provenance Integration

The `ProvenanceIntegration` tracks complete lineage and audit trails.

```typescript
import { ProvenanceIntegration } from '@intelgraph/etl-framework';

const provenance = new ProvenanceIntegration(
  {
    baseURL: 'http://localhost:4010',
    authorityId: 'etl-service',
    reasonForAccess: 'pipeline execution',
    enabled: true
  },
  logger
);

// Register pipeline run as evidence
const evidenceId = await provenance.registerPipelineRun(pipelineRun, 'case-001');

// Create provenance chain
const chainId = await provenance.createProvenanceChain(
  pipelineRun,
  [evidenceId],
  'claim-001'
);
```

---

## Pipeline Patterns

### Pattern 1: Full Load

Complete data extraction and load.

```yaml
# Pipeline Configuration
pipeline:
  id: users-full-load
  name: Users Full Load
  extraction:
    strategy: full
    batchSize: 10000
  transformation:
    transformations:
      - type: map
        config:
          fieldMapping:
            user_id: id
            email: email_address
            full_name: name
  loading:
    strategy: bulk
    targetTable: users_dwh
```

**Use Cases**:
- Initial data migration
- Small tables that change infrequently
- Daily full refresh scenarios

**Pros**: Simple, no state management
**Cons**: Resource intensive for large datasets

### Pattern 2: Incremental Load with Watermark

Load only new or updated records.

```yaml
pipeline:
  id: transactions-incremental
  name: Transactions Incremental Load
  extraction:
    strategy: incremental
    incrementalColumn: updated_at
    batchSize: 5000
  watermark:
    type: timestamp
    initialValue: "2025-01-01T00:00:00Z"
    lookbackWindow: 300
  loading:
    strategy: upsert
    upsertKey: [transaction_id]
```

**Use Cases**:
- Large, frequently updated tables
- Real-time or near-real-time sync
- Append-only logs or events

**Pros**: Efficient, scalable
**Cons**: Requires watermark management

### Pattern 3: CDC with Trigger-Based Capture

Capture all changes using database triggers.

```yaml
pipeline:
  id: products-cdc
  name: Products CDC Pipeline
  cdc:
    strategy: trigger
    sourceTable: products
    primaryKeys: [product_id]
    captureDeletes: true
    pollIntervalSeconds: 10
  loading:
    strategy: scd_type2
    upsertKey: [product_id]
```

**Use Cases**:
- Audit requirements
- Historical change tracking
- Regulatory compliance

**Pros**: Captures all changes including deletes
**Cons**: Overhead on source system

### Pattern 4: Streaming with Real-Time Processing

Continuous data ingestion and processing.

```yaml
pipeline:
  id: events-streaming
  name: Real-Time Events Pipeline
  extraction:
    strategy: real_time
    streamConfig:
      topic: user-events
      consumerGroup: etl-consumers
  transformation:
    transformations:
      - type: filter
        config:
          filterFunction: "record => record.event_type !== 'test'"
      - type: aggregate
        config:
          groupBy: [user_id]
          window: 60 # seconds
  loading:
    strategy: append_only
```

**Use Cases**:
- Event processing
- Metrics aggregation
- Real-time dashboards

**Pros**: Low latency, real-time insights
**Cons**: Complex setup, requires message queues

### Pattern 5: SCD Type 2 (Slowly Changing Dimensions)

Track historical changes with effective dates.

```yaml
pipeline:
  id: customers-scd2
  name: Customer Dimension SCD Type 2
  extraction:
    strategy: incremental
    incrementalColumn: updated_at
  loading:
    strategy: scd_type2
    upsertKey: [customer_id]
    timestampColumn: effective_from
```

**Schema**:
```sql
CREATE TABLE customers_dwh (
  surrogate_key SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true
);
```

**Use Cases**:
- Maintaining history for reporting
- Point-in-time analysis
- Regulatory compliance

---

## Change Data Capture (CDC)

### CDC Strategies

#### 1. Timestamp-Based CDC

Tracks changes using `updated_at` or similar timestamp column.

```typescript
const cdcConfig = {
  strategy: CDCStrategy.TIMESTAMP,
  sourceTable: 'orders',
  trackingColumn: 'updated_at',
  primaryKeys: ['order_id'],
  pollIntervalSeconds: 60
};
```

**Pros**: Simple, no database changes required
**Cons**: Can't distinguish INSERT from UPDATE, can't capture DELETEs

#### 2. Version-Based CDC

Uses version/sequence number for tracking.

```typescript
const cdcConfig = {
  strategy: CDCStrategy.VERSION,
  sourceTable: 'inventory',
  trackingColumn: 'version',
  primaryKeys: ['sku'],
  pollIntervalSeconds: 30
};
```

**Pros**: Deterministic ordering, can handle out-of-order updates
**Cons**: Requires version column in source table

#### 3. Trigger-Based CDC

Database triggers populate a change tracking table.

```typescript
const cdcConfig = {
  strategy: CDCStrategy.TRIGGER,
  sourceTable: 'accounts',
  primaryKeys: ['account_id'],
  captureDeletes: true,
  includeOldValues: true,
  pollIntervalSeconds: 10
};
```

**Pros**: Captures all operations (INSERT, UPDATE, DELETE)
**Cons**: Overhead on source system, requires DBA permissions

#### 4. Log-Based CDC

Parses database transaction logs (requires external tools).

```typescript
// Use Debezium or similar for log-based CDC
// Summit ETL framework can consume CDC events from Kafka
```

**Pros**: Minimal impact on source, captures all changes
**Cons**: Complex setup, requires specialized tools (Debezium, etc.)

### CDC Best Practices

1. **Choose the Right Strategy**:
   - Use timestamp-based for simple cases with updates only
   - Use trigger-based when deletes must be captured
   - Use log-based for mission-critical, high-volume scenarios

2. **Manage Watermarks**:
   - Always use lookback windows for timestamp-based CDC
   - Store watermarks in target database for durability
   - Monitor watermark lag to detect delays

3. **Handle Backpressure**:
   - Use batch processing to handle change bursts
   - Implement rate limiting if downstream can't keep up
   - Alert on excessive lag

4. **Test Failure Scenarios**:
   - What happens if CDC engine crashes mid-batch?
   - Can watermarks be recovered?
   - Are changes applied exactly once?

---

## Data Quality Framework

### Quality Dimensions

Summit's data quality framework assesses six dimensions:

1. **Completeness** (20% weight): Percentage of non-null values
2. **Accuracy** (25% weight): Correctness of values against rules
3. **Consistency** (15% weight): Logical coherence across fields
4. **Timeliness** (15% weight): Data freshness and pipeline SLA
5. **Validity** (15% weight): Conformance to formats and rules
6. **Uniqueness** (10% weight): Absence of duplicates

### Quality Rules

Define custom quality rules:

```typescript
const completenessRule: QualityRuleConfig = {
  id: 'email-completeness',
  name: 'Email Completeness Check',
  dimension: QualityDimension.COMPLETENESS,
  rule: {
    type: 'null_check',
    config: { field: 'email', allowNull: false }
  },
  threshold: 95.0,
  severity: 'high',
  enabled: true
};

const formatRule: QualityRuleConfig = {
  id: 'phone-format',
  name: 'Phone Format Validation',
  dimension: QualityDimension.VALIDITY,
  rule: {
    type: 'format',
    config: { field: 'phone', format: 'phone' }
  },
  threshold: 90.0,
  severity: 'medium',
  enabled: true
};

monitor.addRule(completenessRule);
monitor.addRule(formatRule);
```

### Quality Report Structure

```json
{
  "pipelineRunId": "run_abc123",
  "timestamp": "2025-11-20T10:00:00Z",
  "overallScore": 94.5,
  "dimensions": {
    "completeness": 98.0,
    "accuracy": 95.0,
    "consistency": 92.0,
    "timeliness": 96.0,
    "validity": 93.0,
    "uniqueness": 99.0
  },
  "issues": [
    {
      "severity": "high",
      "type": "completeness",
      "field": "address",
      "message": "Field 'address' has 12.5% null values",
      "affectedRecords": 1250
    }
  ],
  "statistics": {
    "totalRecords": 10000,
    "nullCounts": { "address": 1250 },
    "distinctCounts": { "user_id": 10000 }
  }
}
```

### Quality Alerting

Set up alerts for quality issues:

```typescript
monitor.on('quality:issue', (issue) => {
  if (issue.severity === 'critical') {
    // Alert ops team
    alertService.send({
      title: 'Critical Data Quality Issue',
      message: issue.message,
      severity: 'critical'
    });
  }
});
```

---

## Incremental Loading

### Watermark Management

Watermarks track the last successfully processed value:

```sql
CREATE TABLE etl_watermarks (
  id SERIAL PRIMARY KEY,
  source_table VARCHAR(255) NOT NULL,
  last_loaded_value TEXT NOT NULL,
  last_load_time TIMESTAMP NOT NULL,
  records_loaded INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_watermarks_source_table
ON etl_watermarks(source_table, last_load_time DESC);
```

### Lookback Windows

Use lookback windows to handle late-arriving data:

```typescript
const config: IncrementalConfig = {
  sourceTable: 'events',
  targetTable: 'events_dwh',
  incrementalColumn: 'event_time',
  primaryKeys: ['event_id'],
  watermark: {
    watermarkColumn: 'event_time',
    watermarkType: 'timestamp',
    lookbackWindow: 3600 // 1 hour lookback
  }
};
```

**Why lookback windows?**
- Handles clock skew between systems
- Captures updates to recently inserted records
- Provides safety buffer for distributed systems

### Reset Watermark

Reset watermark for full reload:

```typescript
await loader.resetWatermark();
```

---

## Provenance & Lineage Tracking

### Evidence Registration

Register pipeline runs as evidence:

```typescript
const evidenceId = await provenance.registerPipelineRun(pipelineRun, 'case-001');
```

### Provenance Chain

Create complete lineage chain:

```typescript
const chainId = await provenance.createProvenanceChain(
  pipelineRun,
  ['evidence-001', 'evidence-002'],
  'claim-001'
);
```

### Disclosure Bundle

Generate disclosure bundle with Merkle tree:

```typescript
const bundle = await provenance.generateDisclosureBundle('case-001');

console.log(`Merkle Root: ${bundle.merkleRoot}`);
console.log(`Evidence Count: ${bundle.evidence.length}`);
```

### Verification

Verify pipeline run integrity:

```typescript
const isValid = await provenance.verifyPipelineRun(pipelineRun, expectedHash);
```

---

## API Reference

### Base URL

```
http://localhost:4020
```

### Authentication

Currently uses authority-based headers (production would use JWT):

```
x-authority-id: etl-service
x-reason-for-access: pipeline management
```

### Endpoints

#### Create Pipeline

```http
POST /pipelines
Content-Type: application/json

{
  "id": "users-pipeline",
  "name": "Users ETL Pipeline",
  "type": "database",
  "connectionConfig": { ... },
  "extractionConfig": { ... },
  "loadConfig": { ... }
}
```

#### Execute Pipeline

```http
POST /pipelines/:id/execute

Response:
{
  "id": "run_abc123",
  "pipelineId": "users-pipeline",
  "status": "success",
  "recordsLoaded": 10000,
  "metrics": { ... }
}
```

#### Get Pipeline Runs

```http
GET /pipelines/:id/runs?limit=10

Response: [
  { "id": "run_abc123", ... },
  { "id": "run_abc124", ... }
]
```

#### Start CDC

```http
POST /pipelines/:id/cdc/start

Response:
{
  "message": "CDC started successfully",
  "pipelineId": "users-pipeline"
}
```

#### Get Quality Report

```http
GET /quality/reports/:runId

Response:
{
  "pipelineRunId": "run_abc123",
  "overallScore": 94.5,
  "dimensions": { ... },
  "issues": [ ... ]
}
```

#### Get Metrics

```http
GET /metrics

Response:
{
  "totalPipelines": 15,
  "activeCDCEngines": 3,
  "totalRuns": 1234,
  "successfulRuns": 1200,
  "failedRuns": 34,
  "totalRecordsProcessed": 15000000
}
```

---

## Operations Guide

### Starting the ETL Service

```bash
# Development
cd services/etl-service
pnpm install
pnpm dev

# Production
pnpm build
pnpm start
```

### Environment Variables

```bash
ETL_SERVICE_PORT=4020
ETL_SERVICE_HOST=0.0.0.0
DATABASE_URL=postgresql://localhost:5432/summit
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

### Monitoring

#### Health Check

```bash
curl http://localhost:4020/health
```

#### Metrics

```bash
curl http://localhost:4020/metrics
```

#### Logs

Structured JSON logs via Winston:

```json
{
  "level": "info",
  "message": "Pipeline execution completed",
  "pipelineId": "users-pipeline",
  "runId": "run_abc123",
  "recordsLoaded": 10000,
  "durationMs": 15234,
  "timestamp": "2025-11-20T10:00:00.000Z"
}
```

### Troubleshooting Common Issues

#### Pipeline Execution Fails

```bash
# Check pipeline configuration
curl http://localhost:4020/pipelines/:id

# Check last run errors
curl http://localhost:4020/pipelines/:id/runs | jq '.[0].errors'

# Review logs
tail -f logs/etl-service.log | jq
```

#### CDC Not Capturing Changes

```bash
# Verify CDC is running
curl http://localhost:4020/metrics | jq '.activeCDCEngines'

# Check watermark table
psql -d summit -c "SELECT * FROM etl_cdc_watermarks ORDER BY last_processed_time DESC LIMIT 5;"

# Restart CDC
curl -X POST http://localhost:4020/pipelines/:id/cdc/stop
curl -X POST http://localhost:4020/pipelines/:id/cdc/start
```

#### Quality Score Drops

```bash
# Get quality report
curl http://localhost:4020/quality/reports/:runId | jq

# Review issues
curl http://localhost:4020/quality/reports/:runId | jq '.issues[]'
```

---

## Best Practices

### 1. Pipeline Design

- **Keep pipelines focused**: One source → one target
- **Use idempotent operations**: Pipelines should be rerunnable
- **Batch appropriately**: 1K-10K records per batch is optimal
- **Handle failures gracefully**: Implement retry logic and dead-letter queues

### 2. Performance Optimization

- **Use incremental loading**: Avoid full loads for large tables
- **Parallelize when possible**: Load independent tables in parallel
- **Optimize queries**: Add indexes on incremental columns
- **Monitor watermark lag**: Alert on excessive delays

### 3. Data Quality

- **Validate early**: Catch issues during extraction
- **Monitor continuously**: Track quality trends over time
- **Set thresholds**: Define acceptable quality levels
- **Alert on degradation**: Notify ops when quality drops

### 4. Security & Compliance

- **Encrypt connections**: Always use TLS for database connections
- **Rotate credentials**: Use secrets management (Vault, AWS Secrets Manager)
- **Track lineage**: Enable provenance integration for audit trails
- **Mask PII**: Apply redaction rules for sensitive data

### 5. Observability

- **Log everything**: Structured JSON logs with context
- **Track metrics**: Pipeline duration, throughput, error rates
- **Set up alerts**: Critical failures, SLA breaches, quality issues
- **Dashboard visibility**: Real-time pipeline monitoring

---

## Troubleshooting

### Common Issues

#### Issue: Watermark Not Advancing

**Symptoms**: Incremental load repeatedly processes same records

**Solution**:
```sql
-- Check watermark table
SELECT * FROM etl_watermarks WHERE source_table = 'your_table' ORDER BY last_load_time DESC;

-- Verify incremental column has increasing values
SELECT MIN(updated_at), MAX(updated_at) FROM your_table;

-- Reset watermark if needed
DELETE FROM etl_watermarks WHERE source_table = 'your_table';
```

#### Issue: CDC Falling Behind

**Symptoms**: Change capture lag increasing

**Solution**:
- Increase batch size: `batchSize: 5000`
- Reduce poll interval: `pollIntervalSeconds: 30`
- Add more CDC workers
- Check source database load

#### Issue: Quality Score Degradation

**Symptoms**: Data quality reports show declining scores

**Solution**:
1. Review quality report issues
2. Check source data quality
3. Add validation rules upstream
4. Quarantine bad records

#### Issue: Pipeline Memory Exhaustion

**Symptoms**: OOM errors during execution

**Solution**:
- Reduce batch size
- Enable streaming extraction
- Increase Node.js heap: `--max-old-space-size=4096`
- Profile memory usage

---

## Additional Resources

- **API Documentation**: [ETL Service OpenAPI Spec](./etl-service-api.yaml)
- **Architecture**: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- **Provenance Ledger**: [services/prov-ledger/README.md](../../services/prov-ledger/README.md)
- **Example Pipelines**: [examples/pipelines/](../../examples/pipelines/)

---

## Support

For issues, questions, or feature requests:
- **GitHub Issues**: [summit/issues](https://github.com/BrianCLong/summit/issues)
- **Internal Slack**: #summit-data-platform
- **Email**: data-platform-team@summit.io

---

## Changelog

### Version 1.0.0 (2025-11-20)

- Initial release of comprehensive ETL infrastructure
- CDC framework with multiple strategies
- Data quality monitoring with six dimensions
- Incremental loading with watermark management
- Full provenance and lineage tracking
- REST API for pipeline management
