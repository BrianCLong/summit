# Maestro Reasoning Budget + Tool Graph + Noise Harness Scaffold (v1)

## Mission

Ship an atomic Maestro scaffolding update that introduces:

1. A Reasoning Budget Contract with governance-ready policy bindings and evidence logging.
2. A typed tool dependency graph schema with deterministic task synthesis and verifiability checks.
3. A noise/drift harness for tool environments that can be used in regression suites.

## Requirements

- Keep the change inside the Server zone (`server/`) plus governance policy files (`policy/`) and required task metadata.
- Add unit tests for new logic.
- Do not introduce new external dependencies.
- Encode governance constraints as policy-as-code.
- Record reasoning budgets and outcomes as evidence on Maestro runs.

## Deliverables

- `server/src/maestro/budget.ts` with budget contract types, normalization, and evidence helpers.
- `server/src/maestro/tool-graph.ts` with typed tool graph schema, synthesis, and verification utilities.
- `server/src/maestro/noise-harness.ts` with deterministic noise injection.
- Maestro routes and run pipeline updated to accept and log reasoning budgets.
- OPA policy updates for budget limits.
- Unit tests for budget normalization, tool graph synthesis, and noise harness determinism.
- `docs/roadmap/STATUS.json` updated to reflect the work.
- Task spec JSON under `agents/examples/` referencing this prompt.

## Verification

- Run `scripts/check-boundaries.cjs`.
- Run unit tests relevant to the new Maestro modules.
