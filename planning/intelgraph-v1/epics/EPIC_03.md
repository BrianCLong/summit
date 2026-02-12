# EPIC 3 — Ingestion & Connector Framework

**Goal**: Build a scalable, resilient ingestion pipeline with backpressure and provenance attachment.

**Architecture Reference**:
```mermaid
graph LR\n    A[Source] --> B[Connector]\n    B --> C[Validation Engine]\n    C --> D[PII Masking]\n    D --> E[Kafka Stream]\n    E --> F[Graph Writer]
```

**Constraints**: Align with Org Defaults (SLOs, Cost, Privacy).

### Risk Matrix
| Risk | Impact | Mitigation |
|---|---|---|
| Technical Debt | Medium | Regular refactoring blocks. |
| Resource Constraint | High | Parallel execution with modular agents. |

### Task: S3/CSV Connector Hardening
- **Description**: Implementation and validation of S3/CSV Connector Hardening for the IntelGraph platform.
- **Subtasks**:
  - Implement stream-based parsing
  - Add validation for large files
  - Setup chunked upload
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: Schema Subagent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - 1GB file ingested < 10m
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `benchmark:ingest`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: HTTP Ingest Resilience
- **Description**: Implementation and validation of HTTP Ingest Resilience for the IntelGraph platform.
- **Subtasks**:
  - Setup circuit breaker on ingest
  - Implement rate limiting
  - Verify payload sanitization
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Zero ingest crashes
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run load test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: File Drop Ingestion
- **Description**: Implementation and validation of File Drop Ingestion for the IntelGraph platform.
- **Subtasks**:
  - Setup SQS/S3 event triggers
  - Implement air-gap import scripts
  - Verify file integrity
- **Assigned Agent**:
  - Primary: DevOps Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - File ingest automated
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check S3 events
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default DevOps Policy.

### Task: Backpressure Control
- **Description**: Implementation and validation of Backpressure Control for the IntelGraph platform.
- **Subtasks**:
  - Implement Kafka flow control
  - Setup consumer lag alerting
  - Verify system stability
- **Assigned Agent**:
  - Primary: SRE Agent
  - Optional Subagents: Observability Subagent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - No memory exhaustion
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check SRE lag dashboard
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default SRE Policy.

### Task: Retry Logic Design
- **Description**: Implementation and validation of Retry Logic Design for the IntelGraph platform.
- **Subtasks**:
  - Implement exponential backoff
  - Setup retry topic in Kafka
  - Verify eventual consistency
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Transient errors resolved
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:retry`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: Dedupe Pipeline
- **Description**: Implementation and validation of Dedupe Pipeline for the IntelGraph platform.
- **Subtasks**:
  - Implement Bloom filter for ingest
  - Setup Redis-based dedupe
  - Verify throughput
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Duplicate rate < 0.1%
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check Redis hits
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Schema Validation Engine
- **Description**: Implementation and validation of Schema Validation Engine for the IntelGraph platform.
- **Subtasks**:
  - Implement Ajv/Zod validation
  - Setup schema registry integration
  - Verify error messages
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Schema Subagent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Only valid JSON ingested
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:schema`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Provenance Attachment
- **Description**: Implementation and validation of Provenance Attachment for the IntelGraph platform.
- **Subtasks**:
  - Implement hash generation at source
  - Attach agent signatures
  - Verify chain of custody
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Crypto Subagent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Provenance intact
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `verify-prov`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Streaming Pipeline
- **Description**: Implementation and validation of Streaming Pipeline for the IntelGraph platform.
- **Subtasks**:
  - Setup Kafka/NATS cluster
  - Implement producer/consumer logic
  - Verify message ordering
- **Assigned Agent**:
  - Primary: DevOps Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Ordering guaranteed
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run ordering test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default DevOps Policy.

### Task: Batch Worker Autoscaling
- **Description**: Implementation and validation of Batch Worker Autoscaling for the IntelGraph platform.
- **Subtasks**:
  - Configure KEDA scalers
  - Setup CPU/Memory HPA
  - Verify scaling speed
- **Assigned Agent**:
  - Primary: DevOps Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Scales to 100 workers
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check KEDA metrics
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default DevOps Policy.

### Task: Rate Limiting Enforcement
- **Description**: Implementation and validation of Rate Limiting Enforcement for the IntelGraph platform.
- **Subtasks**:
  - Implement token bucket in Go/Node
  - Setup per-tenant quotas
  - Verify rejection logic
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: FinOps Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Quotas strictly enforced
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:quota`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: PII Detection Hooks
- **Description**: Implementation and validation of PII Detection Hooks for the IntelGraph platform.
- **Subtasks**:
  - Integrate Presidio/Macie
  - Implement auto-masking rules
  - Verify redaction accuracy
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Compliance Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Zero PII leakage
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run PII scan
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: License Classifier
- **Description**: Implementation and validation of License Classifier for the IntelGraph platform.
- **Subtasks**:
  - Implement heuristic license check
  - Setup metadata extraction
  - Verify classification
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - License correctly tagged
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:classifier`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: Retention Tier Auto-assignment
- **Description**: Implementation and validation of Retention Tier Auto-assignment for the IntelGraph platform.
- **Subtasks**:
  - Implement tiering logic
  - Setup storage class rules
  - Verify data movement
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Data moves to cold storage
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check S3 classes
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Event Replay Mechanism
- **Description**: Implementation and validation of Event Replay Mechanism for the IntelGraph platform.
- **Subtasks**:
  - Implement Kafka offset reset tool
  - Setup replay audit trail
  - Verify data state
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Replay successful
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `replay-verify`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: Failure Recovery Strategy
- **Description**: Implementation and validation of Failure Recovery Strategy for the IntelGraph platform.
- **Subtasks**:
  - Define MTTR targets
  - Implement automated failover
  - Verify system state
- **Assigned Agent**:
  - Primary: SRE Agent
  - Optional Subagents: DevOps Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Recovery < 2m
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run chaos test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default SRE Policy.

### Task: Observability Metrics
- **Description**: Implementation and validation of Observability Metrics for the IntelGraph platform.
- **Subtasks**:
  - Export ingest counts to Prom
  - Setup latency histograms
  - Verify alert coverage
- **Assigned Agent**:
  - Primary: SRE Agent
  - Optional Subagents: Observability Subagent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - 100% metrics coverage
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check Grafana
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default SRE Policy.

### Task: Kafka Integration
- **Description**: Implementation and validation of Kafka Integration for the IntelGraph platform.
- **Subtasks**:
  - Setup schema registry
  - Configure SASL/SCRAM auth
  - Verify connectivity
- **Assigned Agent**:
  - Primary: DevOps Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Secure Kafka access
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check SASL logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default DevOps Policy.

### Task: DLQ Design
- **Description**: Implementation and validation of DLQ Design for the IntelGraph platform.
- **Subtasks**:
  - Implement dead letter queue
  - Setup manual retry interface
  - Verify DLQ routing
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Failed events preserved
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check DLQ counts
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: Performance Benchmark
- **Description**: Implementation and validation of Performance Benchmark for the IntelGraph platform.
- **Subtasks**:
  - Run baseline ingest test
  - Audit IO bottlenecks
  - Publish perf report
- **Assigned Agent**:
  - Primary: QA Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 3 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Performance > 10k eps
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check `perf.json`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default QA Policy.

### Parallelization Map
All tasks in this epic can run in parallel following the foundational architecture setup.

### Critical Path
Foundational ADR -> Core Implementation -> Policy Verification -> Go-Live.

### Rollback Strategy
Revert to previous stable tag; restore DB snapshots if schema change was involved.
