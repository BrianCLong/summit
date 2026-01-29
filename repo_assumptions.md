# Repo Assumptions & Reality Check

## Verified Facts
*   **Language:** TypeScript (Node.js).
*   **Package Manager:** `pnpm` (Monorepo structure).
*   **Workflow Engine:** `packages/maestro-core` (Main engine), `packages/foundry`, `packages/skillpacks`.
*   **Tasks:** `packages/tasks-core` contains reference tasks and connectors.
*   **Persistence:** `packages/maestro-core` supports Postgres (`pg`) and S3. Neo4j is used in `server` and `graph-service`.
*   **Policy:** `policies/` directory contains OPA Rego files. `packages/maestro-core` has an `opa-policy-engine` export.
*   **CLI:** `packages/cli` (Summit CLI).
*   **Testing:** Vitest (`packages/tasks-core`), Jest (`packages/maestro-core`), Playwright (e2e).
*   **CI:** GitHub Actions in `.github/workflows`.

## Assumptions vs Reality Updates
| Assumption (Prompt) | Reality (Repo) | Action |
| :--- | :--- | :--- |
| `apps/cli` | `packages/cli` | Will implement CLI commands in `packages/cli`. |
| `packages/policy` | Not found (`policies/` exists) | Will create `packages/policy` or implement in `packages/orchestrator/src/policy` if appropriate. *Decision: Create `packages/policy` to match prompt structure.* |
| `packages/orchestrator` | Not found (New) | Will create `packages/orchestrator` as the home for this feature. |
| File-backed state | `maestro-core` uses Postgres | Will implement "File-backed state" as requested (Item Claim 01) but likely as an adapter or strictly for the "Inbox/Message" primitive if MWS requires it, or map to Postgres for "Surpass" goal. *Decision: Implement file-backed for MWS (as per "Item Claim 01"), but designed to be swappable for DB.* |

## Must-not-touch
*   `SECURITY.md`, `LICENSE`
*   Existing `packages/maestro-core` logic (unless minimal integration).
*   `packages/foundry` core loop.

## Integration Points
*   **CLI:** `packages/cli` will import `packages/orchestrator`.
*   **Policy:** `packages/orchestrator` will use `packages/policy` (new) which reads `policies/*.rego`.
*   **Maestro:** `packages/orchestrator` might eventually feed into `maestro-core`, but for this MWS, it will be a standalone "Skill" or sidecar engine.
