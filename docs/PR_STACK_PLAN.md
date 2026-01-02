# PR Stack Plan

## Necessity Decision: packages/memory (from #15380)

*   **Evidence:**
    *   Package `@intelgraph/memory` found in `packages/memory` (via `git ls-tree` and `git cat-file` on remote branch `codex/implement-persistent-memory-layer-for-summit`).
    *   Zero code dependencies in `main`.
    *   Zero code dependencies in the `#15380` bundle (verified via `git grep` on remote branch). Only references are in documentation (`docs/ai/memory-layer.md`) and status reports (`docs/roadmap/STATUS.json`).
*   **Classification:** **C) Optional foundation**
    *   Rationale: The package is a foundational capability not yet integrated into the application's runtime. It does not meet the "Required now" criteria.
*   **Decision:** **Park**
    *   Action: The package should be removed from the `#15380` bundle.
    *   Status: **Deferred**
    *   Note: Due to sandbox limitations (excessive file count in the bundle branch), the actual removal commit could not be performed in this session. The parking decision is recorded here.
