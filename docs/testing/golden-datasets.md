# Golden Datasets for IntelGraph + Maestro

This document describes the deterministic, reusable "golden" datasets that back IntelGraph and Maestro integration tests.

## Goals

- Stable, repeatable fixtures that avoid bespoke per-test setup.
- Expressive scenarios that cover small toy graphs, realistic medium deployments, and edge cases (disconnected components and dense hubs).
- Fully synthetic data with sanitized identifiers.

## Entities Captured

- **Tenants**: synthetic tenants used to scope nodes, runs, and user access.
- **Users**: test users tied to tenants and tagged with roles.
- **Tags**: shared labels applied across services, runs, and policies (e.g., `hipaa`, `critical-path`).
- **Nodes**: services, environments, pipelines, stages, incidents, policies, and cost signals.
- **Edges**: explicit relationships when available plus implicit links derived from pipeline, dependency, and policy references.
- **Runs**: orchestration runs tying assets to policies, timestamps, and outcomes.

## Scenarios

| Scenario           | Shape                                                                                                                               | Purpose                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `toy`              | Minimal graph: 1 tenant, 1 service, 1 pipeline with a single stage, 1 incident                                                      | Fast smoke tests and schema validation                                                               |
| `realistic-medium` | Multi-tenant, 3 services (API, DB, analytics), 2 environments, 2 pipelines, open/closed incidents, HIPAA/SOX policies, cost signals | Primary integration path; mirrors everyday deploy + incident triage flows                            |
| `edge-cases`       | Disconnected services, one dense hub with many dependencies, isolated environment, cost spikes without incidents                    | Regression coverage for graph connectivity, fan-out/fan-in edges, and risk math under sparse signals |

## Non-goals

- No production or customer data; all fixtures are synthetic or anonymized.
- Not a performance benchmark dataset; optimized for determinism and clarity over size.

## Files

- `testdata/intelgraph/golden-graph.json`: canonical IntelGraph nodes/edges plus user + tenant metadata.
- `testdata/maestro/golden-runs.json`: Maestro asset catalog, policies, response strategies, and deterministic run/health timelines.
- `scripts/testing/load-golden-intelgraph.ts`: loader that wipes in-memory graph state and hydrates an `OrchestrationKnowledgeGraph` from fixtures.
- `scripts/testing/load-golden-maestro.ts`: loader that resets Maestro state, registers discovery/policy/response hooks, and replays fixture health signals and runs.
- `testdata/README.md`: quick reference for the fixtures and how to consume them in tests.

## Usage Guidance

- Only load golden fixtures in `test` or `development` environments; loaders enforce guards to prevent production use.
- Prefer importing loader utilities in integration tests instead of hand-rolled mocks.
- When adding new tests, document which scenario is required (e.g., `realistic-medium` or `edge-cases`) so future contributors reuse the same slices.
