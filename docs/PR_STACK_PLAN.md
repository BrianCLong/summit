# PR Stack Plan

## #15380 Residual Inventory

**Status**: 1200+ files changed. Bundled/Poisoned.
**Decision**: Supersede with fresh, focused PRs.

**Buckets (observed from sample):**
*   **Supply Chain (Claude-owned)**: `scripts/generate-sbom.sh`, `server/src/evidence/integrity-service.ts` -> **REMOVE**
*   **ML/AI (Unrelated)**: `server/src/mlops/registry.ts`, `server/src/retrieval/RagContextBuilder.ts` -> **REMOVE**
*   **Core/Misc**: `server/src/routes/schema.ts` -> **REMOVE**
*   **Valid Concerns (to be extracted)**:
    *   Dependency Monitoring -> Moved to `chore/dependency-monitoring`
    *   Perf/k6 Baseline -> Moved to `test/perf-baseline`

## Superseding PRs

1.  `test/perf-baseline`: Establish k6 baseline (Clean implementation).
2.  `chore/dependency-monitoring`: Add dependency checks (Clean implementation).

## Action Plan

1.  Close #15380.
2.  Submit `test/perf-baseline`.
3.  Submit `chore/dependency-monitoring`.
