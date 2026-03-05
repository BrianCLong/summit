# Repo Assumptions & Verification (Dyad v0.38.0 Subsumption)

## Verified repository facts

1. Agent orchestration and runtime logic exist under `agents/`, including `agents/orchestrator/src`, `agents/executor`, `agents/runner`, and `agents/antigravity`.
2. Evidence artifacts are already persisted under `artifacts/`, including machine-readable agent run records in `artifacts/agent-runs/*.json`.
3. CI is workflow-driven from `.github/workflows/` with `pr-quality-gate.yml` present as the stated PR gate standard.
4. Governance and prompt integrity enforcement scripts already exist under `scripts/ci/` (for example `verify-prompt-integrity.ts` and `validate-pr-metadata.ts`, per root policy docs).
5. A model routing/catalog surface already exists in `agents/orchestrator/src/daao/routing/modelCatalog.ts`, indicating model expansion should align there instead of introducing an unrelated registry format.

## Assumptions intentionally constrained for implementation planning

1. Planning preflight should be introduced behind a default-off feature flag (`SUMMIT_AGENT_PLANNING=0`) to preserve current behavior.
2. New planning/todo artifacts should align with existing artifact conventions (`artifacts/agent-runs/*.json` or adjacent deterministic JSON outputs) instead of ad hoc transient state.
3. The first increment should target one execution path (`agents/orchestrator` + one runner) before ecosystem-wide adoption.
4. CI gating for planning completeness should be added as an extension to existing quality gates rather than as a standalone pipeline.

## Validation checklist status

- [x] Confirmed location of agent orchestration logic.
- [x] Identified existing run evidence artifact pattern.
- [x] Verified available CI workflow names and quality gate entrypoint.
- [x] Confirmed deterministic JSON artifact norms in repository policy and existing artifacts.
- [x] Verified model catalog/registry surface exists.

## Commands used for verification

- `rg --files -g 'AGENTS.md'`
- `find agents -maxdepth 2 -type d`
- `find artifacts -maxdepth 2 -type f`
- `rg --files .github/workflows`
- `rg --files | rg 'registry\\.ya?ml$|models?/registry|agent.*model'`
