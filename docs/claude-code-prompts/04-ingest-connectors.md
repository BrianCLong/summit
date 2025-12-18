# Prompt 4: Ingest Connectors (S3/CSV + HTTP)

## Role
Ingest Engineer

## Context
IntelGraph needs Day-0 data ingestion capabilities with robust provenance tracking. Initial connectors must support:
- Bulk data import (S3/CSV files)
- Real-time event streaming (HTTP webhooks)

All ingested data requires full provenance metadata for audit and compliance.

## Task
Build two connector SDKs and reference implementations:

### 1. S3/CSV Connector (`connector-sdk-s3csv`)
- Read CSV files from S3 buckets
- Schema mapping and validation
- Deduplication logic
- Batch processing with retry/backoff

### 2. HTTP Connector (`connector-http`)
- Webhook endpoint for real-time events
- Event buffering and batching
- Idempotency key handling
- Rate limiting and backpressure

### Shared Requirements
- Provenance attachment (source, hash, timestamps, purpose)
- Error handling and dead letter queue
- Metrics and observability
- Configuration via environment variables or JSON

## Guardrails (Throughput)

### Performance Targets
- **S3/CSV**: ≥ 50 MB/s per worker pod
- **HTTP**: ≥ 1,000 events/s per pod
- **Pre-storage latency**: p95 ≤ 100 ms

### Reliability
- At-least-once delivery semantics
- Idempotency on duplicate events
- Graceful degradation under backpressure

## Deliverables

### 1. Connector SDK Packages
- [ ] `packages/connector-sdk-s3csv/`
  - [ ] S3 client integration (AWS SDK v3)
  - [ ] CSV parser with schema validation
  - [ ] Batch processing logic
  - [ ] Deduplication using content hashing
  - [ ] Retry/backoff strategy
  - [ ] Provenance metadata attachment

- [ ] `packages/connector-http/`
  - [ ] Express/Fastify HTTP server
  - [ ] Event buffering and batching
  - [ ] Idempotency middleware (using Redis)
  - [ ] Rate limiting (using token bucket)
  - [ ] Webhook signature verification
  - [ ] Provenance metadata attachment

### 2. Reference Implementations
- [ ] `services/ingest-s3csv/` - Example S3/CSV ingest service
- [ ] `services/ingest-http/` - Example HTTP webhook service

### 3. Configuration
- [ ] Environment variable schema (documented)
- [ ] JSON config file support
- [ ] Example configurations for common use cases

### 4. Testing & Validation
- [ ] Unit tests for deduplication logic
- [ ] Integration tests with mocked S3/HTTP
- [ ] Golden CSV fixtures for testing
- [ ] k6 load tests for throughput validation
- [ ] Provenance validation tests

### 5. Documentation
- [ ] Connector SDK usage guide
- [ ] Configuration reference
- [ ] Performance tuning guide
- [ ] Troubleshooting guide

## Acceptance Criteria
- ✅ k6 load test shows S3/CSV throughput ≥ 50 MB/s per worker
- ✅ k6 load test shows HTTP throughput ≥ 1,000 events/s per pod
- ✅ Deduplication proven with unit tests (same content = same hash)
- ✅ Provenance fields emitted and validated on all ingested data
- ✅ Idempotency tests pass (duplicate events rejected)
- ✅ Error handling tests pass (malformed data, network failures)
- ✅ Dead letter queue captures failed events

## Provenance Schema

```typescript
interface ProvenanceMetadata {
  // Source identification
  sourceId: string;           // Unique source identifier
  sourceType: 'S3' | 'HTTP' | 'MANUAL';
  sourceUri: string;          // S3 bucket/key or HTTP endpoint

  // Content integrity
  contentHash: string;        // SHA-256 hash of raw content
  hashAlgorithm: 'SHA-256';

  // Timestamps (ISO 8601)
  ingestedAt: string;         // When data entered the system
  observedAt?: string;        // When event occurred (if known)

  // Purpose and classification
  purpose: string;            // Investigation ID or purpose tag
  classification?: string;    // Data classification level

  // Lineage
  parentId?: string;          // Parent entity/event ID (for derived data)
  transformations?: string[]; // Applied transformations

  // Audit
  ingestedBy: string;         // User or service that initiated ingest
  batchId?: string;           // Batch identifier for bulk imports
}
```

## Example Configuration

```json
{
  "s3csv": {
    "bucket": "intelgraph-data-lake",
    "region": "us-east-1",
    "prefix": "raw/",
    "batchSize": 1000,
    "concurrency": 4,
    "deduplication": {
      "enabled": true,
      "keyFields": ["id", "timestamp"]
    }
  },
  "http": {
    "port": 3001,
    "bufferSize": 100,
    "batchInterval": 1000,
    "idempotency": {
      "enabled": true,
      "ttl": 86400,
      "redisUrl": "redis://localhost:6379"
    },
    "rateLimit": {
      "maxPerSecond": 1000,
      "burstSize": 1500
    }
  }
}
```

## Related Files
- `/home/user/summit/docs/connectors/README.md` - Connector documentation
- `/home/user/summit/docs/provenance-export.md` - Provenance design
- `/home/user/summit/services/ingest/` - Existing ingest services

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 4: Ingest connectors implementation"

# Or use the slash command (if configured)
/ingest-connectors
```

## Notes
- Use AWS SDK v3 with credential chain for S3 access
- Implement circuit breakers for external dependencies
- Emit OpenTelemetry traces for end-to-end visibility
- Consider schema evolution for CSV mappings
- Use Zod or similar for runtime schema validation
