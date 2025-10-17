# Chronos Aeternum Delivery Phases

## Phase 1 – Intent Engine & Deterministic Core
- Natural language / YAML compilation into canonical IR DAGs.
- Baseline workflow schema validation with Zod.
- Go runtime skeleton with deterministic execution, retries, and in-memory persistence.
- CI workflows to guarantee build + test coverage.

## Phase 2 – Policy & Observability Foundations
- OpenTelemetry tracer wiring with stdout exporters for quick inspection.
- OPA admission policy stubs for namespace and activity enforcement.
- Docker and docker-compose definitions for local reproduction.
- Provenance scaffolding via spec hashing and event journaling.

## Phase 3 – State Graph & Predictive Enhancements (In Progress)
- Planned integration with Neo4j lineage store and predictive scheduling agents.
- Evidence bundle generation and compliance automation.
- Conversational explainability surface fed by stored events and traces.
