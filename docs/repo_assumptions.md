# Repo Assumptions & Reality Check

## Verified Paths
- `api-schemas/` exists at the root.
- `server/src/maestro/` exists and contains core maestro orchestration code.
- `server/src/intelgraph/` exists and contains IntelGraph client code.
- `scripts/monitoring/` exists or is a valid place for scripts.
- CI workflows are located in `.github/workflows/` (e.g., `ci.yml`).
- `__tests__/` exists at root or package level for testing.

## Assumed Paths (Now mapped to reality)
- `agents/maestro/epistemic/intent-evaluate.ts` -> `server/src/maestro/epistemic/intent-evaluate.ts`
- `agents/maestro/epistemic/policy-engine.ts` -> `server/src/maestro/epistemic/policy-engine.ts`
- `intelgraph/schema/epistemic.*` -> schema integration into existing IntelGraph setup.
- `intelgraph/queries/epistemic/*` -> `server/src/intelgraph/epistemic/queries.ts`

## Must-Not-Touch List
- `.github/workflows/ci.yml` (unless adding specific tests safely)
- `.opa/policy/**`
- Existing evidence bundle schemas
- Security baselines under `SECURITY/**` and `.security/**`
