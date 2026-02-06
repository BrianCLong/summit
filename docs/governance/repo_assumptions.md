# Repository Assumptions & Verified Facts

**Target:** `BrianCLong/summit`
**Module:** `narrative-io-inference-convergence`

## Verified Facts
*   **Workflows:** Existing GitHub Actions are in `.github/workflows/`.
*   **Structure:** Monorepo with `services/`, `packages/`, and root-level `src/` containing TypeScript code (e.g., `src/agents/`).
*   **Language:** TypeScript/Node.js is used for the logic in `src/` and `package.json` confirms dependencies like `typescript`, `jest`, `neo4j-driver`.
*   **Testing:** `jest` and `vitest` are available. `jest.config.cjs` exists in root.

## Assumptions
*   **Narrative Pipeline Entrypoints:** We are adding new entrypoints in `src/narrative/`. Existing pipeline integration points are assumed to be flexible enough to consume these new modules via import or CLI execution.
*   **Evidence Ledger:** We assume a file-based evidence output for this module (`trace.jsonl`, `report.json`) compatible with existing Summit governance policies.
*   **Golden Fixtures:** Stored in `tests/narrative/fixtures/`.

## Must-not-touch
*   Existing CI core workflows (additive jobs only).
*   Existing graph schema (extend, don’t rewrite).
*   Existing public API contracts.

## Validation Checklist
- [x] Locate `src` directory.
- [x] Confirm TypeScript environment.
- [ ] Verify narrative pipeline integration (deferred to future integration steps).
