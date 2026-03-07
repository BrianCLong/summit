# IntelGraph Spine Contract

## Overview
IntelGraph serves as the central graph model in Summit for entities, relationships, evidence, and provenance. It is intended to serve as the shared spine for OSINT, investigations, threat intel, and work-graph / engineering workflows.

## Evidence and Schema Contract
The schema is locked to prevent unbounded supernode queries, ensure tenant isolation, and mandate provenance.
- All entities and edges must be evidence-linked.
- Schema churn is a tracked risk. Core entity/edge types and their evidence/provenance contracts are locked.
- Deterministic artifacts (`report.json`, `metrics.json`, `stamp.json`) are required for pattern-miner outputs. `stamp.json` must not contain wall-clock timestamps.
- All outputs carry a stable Evidence ID format: `IG-<domain>-<slug>-<nnnn>`.

## CI Gates Expectations
- Schema validation must pass for all IntelGraph artifacts.
- Performance budgets (e.g. p95 query latency, memory ceilings) must be enforced.
- Cross-tenant queries are blocked unless explicitly allowed by tenant-scoped guards.
- Feature-flags (via `@intelgraph/feature-flags`) gate IntelGraph templates; all risky behavior ships default OFF.

## Drift Monitoring Strategies
- Schema drift must be monitored and prevented unless properly versions.
- A nightly drift detector will report schema, performance, and policy regressions without unstable timestamps in deterministic files.
