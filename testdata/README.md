# Golden test fixtures

This directory holds deterministic fixtures for IntelGraph and Maestro integration tests.

## IntelGraph
- **File**: `intelgraph/golden-graph.json`
- **Scenarios**:
  - `toy`: single-tenant, single-service sanity checks.
  - `realistic-medium`: multi-tenant pipeline with open/closed incidents and cost signals.
  - `edge-cases`: disconnected components plus a dense dependency hub.
- **Use with**: `scripts/testing/load-golden-intelgraph.ts`

## Maestro
- **File**: `maestro/golden-runs.json`
- **Scenarios**:
  - `control-loop`: two orchestrator services with HIPAA-aware policy and fallback plan.
  - `edge-burst`: saturated hub service with cost spikes and cold spare.
- **Use with**: `scripts/testing/load-golden-maestro.ts`

All fixtures use synthetic identifiers, stable timestamps, and consistent IDs to keep tests deterministic.
