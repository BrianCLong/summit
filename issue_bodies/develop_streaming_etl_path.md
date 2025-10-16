### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "Streaming ETL path"

### Problem / Goal

Establish a scalable streaming ETL pipeline for data ingestion that produces nodes and edges in the graph.

### Proposed Approach

Design and implement a scalable streaming data pipeline capable of processing incoming data and transforming it into graph entities.

### Tasks

- [ ] Select streaming technology (e.g., Kafka, Flink).
- [ ] Implement data ingestion into streaming pipeline.
- [ ] Develop transformation logic to create nodes/edges.

### Acceptance Criteria

- Given a streaming data source, when data flows through the ETL path, then nodes and edges are continuously produced in the graph.
- Metrics/SLO: Streaming ETL processes 100 records/second with p95 latency < 500ms.
- Tests: Unit tests for transformation logic, E2E test for continuous data flow.
- Observability: Metrics for throughput, latency, and error rates in the streaming pipeline.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Streaming ETL architecture approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
