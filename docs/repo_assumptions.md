# Repo Assumptions and Ground Truth

This document logs the verified paths and assumptions for implementing the Epistemic Assurance Plane based on the repository structure.

## Verified Paths

1. **Maestro Orchestrator**: `services/maestro-orchestrator/`
   - Entry point: `services/maestro-orchestrator/src/index.ts`
   - App setup: `services/maestro-orchestrator/src/app.ts`

2. **IntelGraph Schema**: `intelgraph/schema/`
   - Canonical types: `intelgraph/schema/canonical_types.py`
   - Graph primitives: `intelgraph/schema/graph_primitives.py`

3. **IntelGraph Server**: `intelgraph/server/src/`
   - Services module: `intelgraph/server/src/services/`
   - Graphql: `intelgraph/server/src/graphql/`

4. **API Schemas**: `api-schemas/`

5. **Workflows**: `.github/workflows/`

6. **Evidence Directory**: `evidence/`

## Missing / Assumed Paths to Create

- `api-schemas/epistemic/` (for claim, policy, decision schemas)
- `services/maestro-orchestrator/src/epistemic.ts` (for intent evaluate and policy engine)
- `intelgraph/schema/epistemic.py` (for epistemic schema definitions)
- `scripts/monitoring/epistemic-assurance-drift.ts` (for epistemic assurance drift detector)
- `evidence/epistemic-assurance/fixtures/` (for abuse-case fixtures)
- `tests/epistemic/` (for determinism test suites)

## Must-Not-Touch List

- `.github/workflows/ci.yml` (and core validation workflows unless directly adding jobs)
- Existing `.opa/policy/**`
- Existing evidence bundle schemas unless extending
- `SECURITY/**` and `.security/**`

