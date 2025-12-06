# Audit Black Box System - Architecture Document

## Executive Summary

The Audit Black Box System is an enterprise-grade, immutable audit logging infrastructure designed for the IntelGraph intelligence analysis platform. It provides cryptographically verifiable, tamper-evident audit trails that meet the most stringent compliance requirements (SOC2, GDPR, HIPAA, FedRAMP, CJIS, ISO 27001).

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SERVICES LAYER                                        │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│   API    │   Auth   │  Graph   │ Copilot  │Analytics │ Ingest   │   Other Services     │
│ Gateway  │ Service  │   API    │ Service  │ Engine   │ Workers  │   (150+ services)    │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────────┬───────────┘
     │          │          │          │          │          │                │
     │          │          │          │          │          │                │
     └──────────┴──────────┴──────────┼──────────┴──────────┴────────────────┘
                                      │
                           ┌──────────▼──────────┐
                           │  Service Adapters    │
                           │  (logging-pipeline)  │
                           │  - Event Enrichment  │
                           │  - Correlation IDs   │
                           │  - Schema Validation │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │    Redis Cluster     │
                           │  - Event Queue       │
                           │  - Priority Queue    │
                           │  - Dead Letter Queue │
                           │  - Backpressure Pub  │
                           └──────────┬──────────┘
                                      │
               ┌──────────────────────┼──────────────────────┐
               │                      │                      │
    ┌──────────▼──────────┐ ┌────────▼────────┐ ┌──────────▼──────────┐
    │   Event Processor    │ │ Anomaly Detector│ │  Retention Manager  │
    │   - Batch Consumer   │ │ - ML Pipeline   │ │  - Policy Engine    │
    │   - Deduplication    │ │ - Rule Engine   │ │  - Archive Jobs     │
    │   - Rate Limiting    │ │ - Alert Routing │ │  - Legal Hold       │
    └──────────┬──────────┘ └────────┬────────┘ └──────────┬──────────┘
               │                      │                      │
               └──────────────────────┼──────────────────────┘
                                      │
                           ┌──────────▼──────────┐
                           │   Event Buffer       │
                           │   - Priority Queue   │
                           │   - Backpressure     │
                           │   - Batch Coalescing │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │  Immutable Store     │
                           │  - Hash Chain Engine │
                           │  - Merkle Generator  │
                           │  - Signature Manager │
                           └──────────┬──────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
┌────────▼────────┐       ┌──────────▼──────────┐       ┌────────▼────────┐
│  PostgreSQL      │       │    TimescaleDB      │       │  Object Storage  │
│  Primary (HA)    │       │   (Time-Series)     │       │  (S3/MinIO)      │
│  - Events Table  │       │   - Metrics         │       │  - Archives      │
│  - Chain Table   │       │   - Aggregations    │       │  - Exports       │
│  - Checkpoints   │       │   - Retention       │       │  - Legal Holds   │
│  - Redactions    │       │                     │       │                  │
└────────┬────────┘       └──────────┬──────────┘       └────────┬────────┘
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                           ┌──────────▼──────────┐
                           │   Replication Layer  │
                           │   - Streaming Rep    │
                           │   - Cross-Region     │
                           │   - Point-in-Time    │
                           └─────────────────────┘
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUDIT EVENT LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
  │ Service │───▶│ ServiceAdapter│───▶│  Validation   │───▶│ Enrichment   │
  │  Code   │    │  logAccess() │    │  Zod Schema   │    │ Correlation  │
  └─────────┘    └──────────────┘    └───────────────┘    └──────┬───────┘
                                                                  │
                                                                  ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           REDIS EVENT QUEUE                              │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
  │  │  Priority   │  │   Normal    │  │    Dead     │  │  Backpressure   │ │
  │  │   Queue     │  │   Queue     │  │   Letter    │  │    Channel      │ │
  │  │ (Critical)  │  │ (Standard)  │  │   Queue     │  │   (Pub/Sub)     │ │
  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
  └──────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         EVENT PROCESSOR                                  │
  │                                                                         │
  │   1. Dequeue (priority first)                                          │
  │   2. Deduplicate (idempotency key)                                     │
  │   3. Calculate Event Hash: H(event) = SHA256(canonical_json)           │
  │   4. Get Previous Chain Hash                                           │
  │   5. Calculate Chain Hash: H_chain = SHA256(H_event:H_prev:seq)        │
  │   6. Sign: sig = HMAC_SHA256(H_event:H_chain:seq, key)                 │
  │   7. Persist in transaction                                            │
  │                                                                         │
  └──────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                      POSTGRESQL TRANSACTION                              │
  │                                                                         │
  │   BEGIN;                                                                │
  │   LOCK TABLE audit_chain IN EXCLUSIVE MODE;                            │
  │   INSERT INTO audit_events (...) VALUES (...);                         │
  │   INSERT INTO audit_chain (seq, event_hash, prev_hash, chain_hash, sig)│
  │   COMMIT;                                                               │
  │                                                                         │
  │   Every N events: Create Merkle Checkpoint                             │
  │                                                                         │
  └──────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                     MERKLE CHECKPOINT (every 1000 events)               │
  │                                                                         │
  │                              [Root]                                     │
  │                             /      \                                    │
  │                       [H1-4]        [H5-8]                             │
  │                       /    \        /    \                             │
  │                   [H1-2]  [H3-4] [H5-6]  [H7-8]                        │
  │                   /   \   /   \  /   \   /   \                         │
  │                 [1] [2] [3] [4][5] [6] [7] [8]  ← Chain Hashes         │
  │                                                                         │
  │   Checkpoint = { startSeq, endSeq, merkleRoot, signature, timestamp }  │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Component Dependency Graph

```
                                  ┌─────────────────┐
                                  │  AuditBlackBox  │
                                  │     Service     │
                                  └────────┬────────┘
                                           │
           ┌───────────────┬───────────────┼───────────────┬───────────────┐
           │               │               │               │               │
           ▼               ▼               ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Immutable│    │Redaction │    │Integrity │    │  Anomaly │    │ Export   │
    │  Store   │    │ Service  │    │ Verifier │    │ Detector │    │ Service  │
    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │               │               │
         │               │               │               │               │
         ▼               ▼               ▼               ▼               ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                            Core Types                                    │
    │  - AuditEvent         - HashChainEntry      - MerkleCheckpoint         │
    │  - CriticalCategory   - RedactionRequest    - IntegrityResult          │
    │  - ComplianceFramework - AuditQuery         - ExportReport             │
    └─────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
    ┌──────────┐              ┌──────────────┐              ┌──────────┐
    │PostgreSQL│              │    Redis     │              │  Object  │
    │   Pool   │              │   Client     │              │ Storage  │
    └──────────┘              └──────────────┘              └──────────┘
```

## Cryptographic Architecture

### Hash Chain Design

```
Event[1]                    Event[2]                    Event[3]
   │                           │                           │
   ▼                           ▼                           ▼
┌─────────┐               ┌─────────┐               ┌─────────┐
│ H_event │──────────────▶│ H_event │──────────────▶│ H_event │
│ = SHA256│               │ = SHA256│               │ = SHA256│
│(event)  │               │(event)  │               │(event)  │
└────┬────┘               └────┬────┘               └────┬────┘
     │                         │                         │
     ▼                         ▼                         ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ H_chain[1]      │   │ H_chain[2]      │   │ H_chain[3]      │
│ = SHA256(       │──▶│ = SHA256(       │──▶│ = SHA256(       │
│   H_event[1] +  │   │   H_event[2] +  │   │   H_event[3] +  │
│   GENESIS +     │   │   H_chain[1] +  │   │   H_chain[2] +  │
│   seq=1)        │   │   seq=2)        │   │   seq=3)        │
└─────────────────┘   └─────────────────┘   └─────────────────┘

GENESIS = "0000000000000000000000000000000000000000000000000000000000000000"
```

### Signature Scheme

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNATURE GENERATION                          │
│                                                                 │
│   Input: (H_event, H_chain, sequence)                          │
│                                                                 │
│   1. Canonical JSON:                                           │
│      data = JSON.stringify({eventHash, chainHash, sequence})   │
│                                                                 │
│   2. HMAC-SHA256:                                               │
│      signature = HMAC(key, data)                               │
│                                                                 │
│   3. (Future) Hybrid Post-Quantum:                             │
│      sig_classical = ECDSA_P384(key_ec, data)                  │
│      sig_quantum = CRYSTALS-Dilithium(key_pq, data)            │
│      signature = sig_classical || sig_quantum                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEY HIERARCHY                                 │
│                                                                 │
│   ┌─────────────────┐                                          │
│   │  Master Key     │ ← Stored in HSM / Vault                  │
│   │  (KEK)          │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Signing Key     │ ← Encrypted with Master Key              │
│   │ (per-tenant)    │ ← Rotated annually                       │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Session Keys    │ ← Derived per service instance           │
│   │ (ephemeral)     │ ← Rotated hourly                         │
│   └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### PostgreSQL Schema (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              audit_events                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                                              │
│     event_type            TEXT NOT NULL                                     │
│     level                 TEXT NOT NULL (debug|info|warn|error|critical)    │
│     timestamp             TIMESTAMPTZ NOT NULL                              │
│     version               TEXT DEFAULT '1.0.0'                              │
│ FK  correlation_id        UUID NOT NULL → distributed_traces               │
│     session_id            UUID                                              │
│     request_id            UUID                                              │
│     trace_id              TEXT (OpenTelemetry)                             │
│     span_id               TEXT (OpenTelemetry)                             │
│     user_id               TEXT                                              │
│     tenant_id             TEXT NOT NULL                                     │
│     service_id            TEXT NOT NULL                                     │
│     service_name          TEXT NOT NULL                                     │
│     environment           TEXT NOT NULL                                     │
│     resource_type         TEXT                                              │
│     resource_id           TEXT                                              │
│     critical_category     TEXT                                              │
│     action                TEXT NOT NULL                                     │
│     outcome               TEXT NOT NULL                                     │
│     message               TEXT NOT NULL                                     │
│     details               JSONB DEFAULT '{}'                               │
│     old_values            JSONB                                             │
│     new_values            JSONB                                             │
│     ip_address            INET                                              │
│     user_agent            TEXT                                              │
│     geolocation           JSONB                                             │
│     compliance_relevant   BOOLEAN DEFAULT FALSE                            │
│     compliance_frameworks TEXT[]                                            │
│     data_classification   TEXT                                              │
│     legal_hold            BOOLEAN DEFAULT FALSE                            │
│     hash                  TEXT (SHA256)                                    │
│     signature             TEXT (HMAC)                                      │
│     previous_event_hash   TEXT                                              │
│     sequence_number       BIGINT                                            │
│     redacted              BOOLEAN DEFAULT FALSE                            │
│     created_at            TIMESTAMPTZ DEFAULT NOW()                        │
│                                                                             │
│ INDEXES:                                                                    │
│   - idx_timestamp DESC                                                      │
│   - idx_correlation_id                                                      │
│   - idx_tenant_id, timestamp DESC                                          │
│   - idx_user_id                                                             │
│   - idx_compliance_relevant WHERE true                                     │
│   - idx_legal_hold WHERE true                                              │
│   - idx_details GIN                                                        │
│                                                                             │
│ PARTITIONING: RANGE (timestamp) monthly                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:1
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              audit_chain                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  sequence              BIGINT                                            │
│     timestamp             TIMESTAMPTZ NOT NULL                              │
│     event_hash            TEXT NOT NULL (SHA256)                           │
│     previous_hash         TEXT NOT NULL (SHA256)                           │
│     chain_hash            TEXT NOT NULL (SHA256)                           │
│     signature             TEXT (HMAC)                                      │
│ FK  event_id              UUID NOT NULL → audit_events(id)                 │
│                                                                             │
│ CONSTRAINT: previous_hash must match chain_hash of sequence-1              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ N:1 (every 1000)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           audit_checkpoints                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                                              │
│     start_sequence        BIGINT NOT NULL                                   │
│     end_sequence          BIGINT NOT NULL                                   │
│     timestamp             TIMESTAMPTZ NOT NULL                              │
│     event_count           INTEGER NOT NULL                                  │
│     merkle_root           TEXT NOT NULL (SHA256)                           │
│     signature             TEXT NOT NULL                                     │
│     public_key_id         TEXT NOT NULL                                     │
│                                                                             │
│ Used for efficient batch verification of event ranges                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KUBERNETES CLUSTER                                 │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                        audit-blackbox namespace                         ││
│  │                                                                         ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        ││
│  │  │ Deployment:     │  │ Deployment:     │  │ Deployment:     │        ││
│  │  │ api (3 replicas)│  │ processor (5)   │  │ verifier (2)    │        ││
│  │  │                 │  │                 │  │                 │        ││
│  │  │ - REST API      │  │ - Queue Consumer│  │ - Cron Jobs     │        ││
│  │  │ - Health Probes │  │ - Hash Chain    │  │ - Integrity     │        ││
│  │  │ - Rate Limiting │  │ - Signatures    │  │ - Anomaly       │        ││
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        ││
│  │           │                    │                    │                  ││
│  │           └────────────────────┼────────────────────┘                  ││
│  │                                │                                       ││
│  │                    ┌───────────▼───────────┐                          ││
│  │                    │    Service: api       │                          ││
│  │                    │    ClusterIP:4001     │                          ││
│  │                    └───────────┬───────────┘                          ││
│  │                                │                                       ││
│  │                    ┌───────────▼───────────┐                          ││
│  │                    │    Ingress            │                          ││
│  │                    │    /audit/*           │                          ││
│  │                    └───────────────────────┘                          ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐  ││
│  │  │                    StatefulSets                                  │  ││
│  │  │                                                                  │  ││
│  │  │  ┌──────────────────┐  ┌──────────────────┐                    │  ││
│  │  │  │ PostgreSQL HA    │  │ Redis Cluster    │                    │  ││
│  │  │  │ (3 nodes)        │  │ (6 nodes)        │                    │  ││
│  │  │  │ - Primary        │  │ - 3 masters      │                    │  ││
│  │  │  │ - 2 Replicas     │  │ - 3 replicas     │                    │  ││
│  │  │  │ - Streaming Rep  │  │ - Sentinel       │                    │  ││
│  │  │  └──────────────────┘  └──────────────────┘                    │  ││
│  │  │                                                                  │  ││
│  │  └─────────────────────────────────────────────────────────────────┘  ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐  ││
│  │  │                    ConfigMaps & Secrets                          │  ││
│  │  │                                                                  │  ││
│  │  │  - audit-config (ConfigMap)                                     │  ││
│  │  │  - audit-secrets (Secret, encrypted at rest)                    │  ││
│  │  │  - signing-keys (SealedSecret)                                  │  ││
│  │  │                                                                  │  ││
│  │  └─────────────────────────────────────────────────────────────────┘  ││
│  │                                                                         ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY STACK                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          METRICS                                     │   │
│  │                                                                      │   │
│  │   Prometheus Metrics (via prom-client):                             │   │
│  │   - audit_events_total (counter, labels: type, level, outcome)      │   │
│  │   - audit_events_processing_seconds (histogram)                      │   │
│  │   - audit_buffer_size (gauge)                                        │   │
│  │   - audit_chain_sequence (gauge)                                     │   │
│  │   - audit_verification_duration_seconds (histogram)                  │   │
│  │   - audit_integrity_issues_total (counter)                          │   │
│  │   - audit_redaction_requests_total (counter)                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          TRACING                                     │   │
│  │                                                                      │   │
│  │   OpenTelemetry Integration:                                        │   │
│  │   - Span: audit.event.process                                       │   │
│  │   - Span: audit.hash.calculate                                      │   │
│  │   - Span: audit.store.write                                         │   │
│  │   - Span: audit.verify.chain                                        │   │
│  │                                                                      │   │
│  │   Context Propagation:                                              │   │
│  │   - W3C Trace Context                                               │   │
│  │   - Correlation ID mapping                                          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          LOGGING                                     │   │
│  │                                                                      │   │
│  │   Structured Logging (Pino):                                        │   │
│  │   - JSON format                                                     │   │
│  │   - Log levels: debug, info, warn, error                           │   │
│  │   - Correlation ID in every log                                     │   │
│  │   - Sensitive field redaction                                       │   │
│  │                                                                      │   │
│  │   Log Aggregation:                                                  │   │
│  │   - Loki/Elasticsearch                                              │   │
│  │   - 90-day retention                                                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Failure Modes & Recovery

### Failure Mode Analysis

| Failure Mode | Detection | Impact | Recovery |
|--------------|-----------|--------|----------|
| PostgreSQL Primary Down | Health check, connection error | Write blocked | Automatic failover to replica |
| Redis Cluster Partition | Sentinel detection | Queue backlog | Reconnect to new master |
| Signing Key Unavailable | HSM health check | Events unsigned | Queue until HSM recovers |
| Buffer Overflow | Backpressure signal | Event drops | Graceful degradation, alerts |
| Hash Chain Corruption | Integrity verification | Trust compromised | Forensic analysis, restore from checkpoint |
| Storage Full | Disk metrics | Write failure | Emergency retention, archive |

### Recovery Procedures

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DISASTER RECOVERY RUNBOOK                               │
│                                                                             │
│  1. CHAIN CORRUPTION DETECTED                                               │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ a) Identify corruption point via integrity verification          │    │
│     │ b) Locate nearest valid Merkle checkpoint                        │    │
│     │ c) Restore events from checkpoint to corruption point            │    │
│     │ d) Re-calculate chain from checkpoint                            │    │
│     │ e) Generate new signatures                                       │    │
│     │ f) Log recovery event with full details                          │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  2. COMPLETE DATABASE LOSS                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ a) Deploy fresh PostgreSQL cluster                               │    │
│     │ b) Restore from latest backup (PITR)                            │    │
│     │ c) Replay WAL logs to target time                               │    │
│     │ d) Verify chain integrity from start                            │    │
│     │ e) Resume operations                                             │    │
│     │ f) Full integrity audit                                          │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. SIGNING KEY COMPROMISE                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ a) Immediately rotate all signing keys                           │    │
│     │ b) Mark compromise timestamp                                     │    │
│     │ c) All events after compromise require re-signing                │    │
│     │ d) Generate compromise incident report                           │    │
│     │ e) Notify affected tenants                                       │    │
│     │ f) Legal/compliance notification                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
│                                                                             │
│  Layer 1: Network Security                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - TLS 1.3 for all connections                                        │   │
│  │ - Network policies (deny-by-default)                                 │   │
│  │ - Private subnets for databases                                      │   │
│  │ - WAF for public endpoints                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Layer 2: Authentication & Authorization                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - OIDC/JWT token validation                                          │   │
│  │ - RBAC + ABAC via OPA                                                │   │
│  │ - Service-to-service mTLS                                            │   │
│  │ - API key rotation                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Layer 3: Data Protection                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - Encryption at rest (AES-256)                                       │   │
│  │ - Field-level encryption for PII                                     │   │
│  │ - Cryptographic integrity (hash chain)                               │   │
│  │ - Key management via HSM/Vault                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Layer 4: Audit & Monitoring                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - All access logged (meta-audit)                                     │   │
│  │ - Anomaly detection                                                  │   │
│  │ - Real-time alerting                                                 │   │
│  │ - Immutable audit trail                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

### Throughput Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Events/second (sustained) | 10,000 | TBD |
| Events/second (burst) | 50,000 | TBD |
| P50 Latency (ingestion) | < 5ms | TBD |
| P99 Latency (ingestion) | < 50ms | TBD |
| Query latency (simple) | < 100ms | TBD |
| Query latency (complex) | < 1s | TBD |
| Verification (1M events) | < 60s | TBD |

### Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HORIZONTAL SCALING                                  │
│                                                                             │
│  API Layer:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Scale: Based on request rate                                         │   │
│  │ Min: 3 replicas                                                      │   │
│  │ Max: 20 replicas                                                     │   │
│  │ Target: 70% CPU                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Processor Layer:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Scale: Based on queue depth                                          │   │
│  │ Min: 5 replicas                                                      │   │
│  │ Max: 50 replicas                                                     │   │
│  │ Target: Queue depth < 10,000                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Database Layer:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Vertical: Increase instance size                                     │   │
│  │ Read replicas: Add for query load                                    │   │
│  │ Partitioning: Monthly time-based                                     │   │
│  │ Archival: Move old partitions to cold storage                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Compliance Matrix

| Requirement | SOC2 | GDPR | HIPAA | FedRAMP | CJIS | Implementation |
|-------------|------|------|-------|---------|------|----------------|
| Access Logging | ✓ | ✓ | ✓ | ✓ | ✓ | All access events captured |
| Tamper Evidence | ✓ | - | ✓ | ✓ | ✓ | Hash chain + signatures |
| Encryption at Rest | ✓ | ✓ | ✓ | ✓ | ✓ | AES-256 |
| Encryption in Transit | ✓ | ✓ | ✓ | ✓ | ✓ | TLS 1.3 |
| Data Retention | ✓ | ✓ | ✓ | ✓ | ✓ | Configurable policies |
| Right to Erasure | - | ✓ | - | - | - | RTBF with tombstones |
| Audit Trail | ✓ | ✓ | ✓ | ✓ | ✓ | Complete event history |
| Access Control | ✓ | ✓ | ✓ | ✓ | ✓ | RBAC + ABAC |
| Incident Response | ✓ | ✓ | ✓ | ✓ | ✓ | Anomaly detection + alerts |
| Business Continuity | ✓ | - | ✓ | ✓ | ✓ | HA + DR |

---

*Document Version: 2.0.0*
*Last Updated: 2024-01-15*
*Author: IntelGraph Platform Team*
