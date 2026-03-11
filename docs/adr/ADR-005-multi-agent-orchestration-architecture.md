# ADR-005: Multi-Agent Orchestration Architecture (Jules + Orchestrator Layer)

## Status
Accepted

## Context
Summit requires the coordination of multiple autonomous or semi-autonomous agents (such as Jules) across the monorepo to execute complex tasks (e.g., infrastructure updates, CI validation, UI features). Managing concurrent agent sessions without conflicts, especially in high-collision areas like `.github/workflows/` or `package.json`, requires a strict scheduling and isolation model.

## Decision
We utilize a workspace orchestrator architecture with a 10-lane Tab Allocation Matrix.

1.  **Jules as Workspace Scheduler:** When an agent (Jules) operates within the repository, it functions via the orchestrator layer.
2.  **10-Lane Tab Allocation Matrix:** The repository is partitioned into 10 logical lanes to prevent merge conflicts and concurrent access issues:
    -   Lane 1 (Infra): `infra/`, `terraform/`
    -   Lane 2 (CI): `ci/`, `.github/workflows/`, `scripts/ci/`
    -   Lane 3 (Docs): `docs/`
    -   Lane 4 (UI): `apps/web/`, `apps/summit-ui/`
    -   Lane 5 (Evidence): `evidence/`, `schemas/`
    -   Lane 6 (Observability): `observability/`, `telemetry/`
    -   Lane 7 (Testing): `tests/`
    -   Lane 8 (Feature): `src/`, `summit/`, `packages/cli/`
    -   Lane 9: Merge-Reconciliation
    -   Lane 10: Stalled Recovery
3.  **Strict Session Naming:** Agent orchestrator sessions must adhere to a strict naming convention: `[LANE:<code] [SURFACE:<owned-surface>] [BOUNDARY:<conflict-boundary>] [OUTCOME:<completion-condition>] <Title>`.
4.  **High-Collision Isolation:** High-collision surfaces must not have concurrent active tabs.

Master instructions for this orchestration are recorded in `prompts/jules_workspace_orchestrator.txt` and registered in `prompts/registry.yaml`.

## Consequences

**Positive:**
-   **Conflict Prevention:** Explicit lane allocations and boundary definitions drastically reduce the risk of merge conflicts and corrupted repository state.
-   **Auditable Operations:** Strict session naming provides immediate visibility into what an agent is doing, where it is operating, and what its completion criteria are.
-   **Structured Recovery:** Dedicated lanes for merge-reconciliation and stalled recovery provide a formal process for handling agent failures or conflicts.

**Negative:**
-   **Operational Overhead:** Requires careful planning and explicit command/control to launch and manage agent sessions.
-   **Bottlenecks:** High-collision surfaces are limited to single-agent access, potentially slowing down repository-wide refactors (e.g., global dependency updates).
