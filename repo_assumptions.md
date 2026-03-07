# Repo Assumptions & Validation — Sandboxed Runtime Edge Router

## Verified Paths (✅)

| Item                         | Path                           | Status      | Notes                                                                   |
| ---------------------------- | ------------------------------ | ----------- | ----------------------------------------------------------------------- |
| Root governance instructions | `AGENTS.md`                    | ✅ Verified | Governs repository-wide behavior.                                       |
| Roadmap assignment registry  | `docs/roadmap/STATUS.json`     | ✅ Verified | Updated in same PR per execution invariant.                             |
| Standards doc location       | `docs/standards/`              | ✅ Verified | Added cloudflare-moltworker standard.                                   |
| Security data handling docs  | `docs/security/data-handling/` | ✅ Verified | Added adapter data-handling standard.                                   |
| Ops runbooks                 | `docs/ops/runbooks/`           | ✅ Verified | Added adapter runbook.                                                  |
| Prompt registry              | `prompts/registry.yaml`        | ✅ Verified | Prompt/task contract registered.                                        |
| Task spec schema             | `agents/task-spec.schema.json` | ✅ Verified | New task contract conforms.                                             |
| Runtime source zone          | `src/`                         | ✅ Verified | New sandbox runtime implementation created under `src/runtime/sandbox`. |
| Test zone                    | `tests/`                       | ✅ Verified | Runtime tests added under `tests/runtime`.                              |

## Assumptions (⚠️ Intentionally constrained)

| Assumption                                                                                                                              | Reason                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| The new sandbox runtime interfaces are additive and not yet wired into production orchestration paths.                                  | Deferred pending adapter integration PR.                |
| In-memory object store behavior is sufficient for deterministic CI validation of persistence semantics.                                 | Deferred pending provider adapter integration.          |
| Feature flags `FEATURE_SANDBOX_RUNTIME` and `FEATURE_SANDBOX_RUNTIME_ADAPTER_CLOUDFLARE` remain default OFF in production environments. | Controlled by deployment configuration outside this PR. |

## Must-Not-Touch List

- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/SUMMIT_READINESS_ASSERTION.md`
- `.github/workflows/pr-quality-gate.yml`
- `agent-contract.json`

## Validation Commands Used

- `cat docs/roadmap/STATUS.json`
- `cat agents/task-spec.schema.json`
- `git status -sb`
