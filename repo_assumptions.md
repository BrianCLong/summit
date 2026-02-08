# Repo Assumptions & Validation

## ✅ Verified Paths (in-repo)

| Path | Status | Notes |
| --- | --- | --- |
| `.github/workflows/` | ✅ Verified | Workflow directory present at repo root. |
| `docs/` | ✅ Verified | Documentation root. |
| `docs/standards/` | ✅ Verified | Standards repository (STD-*). |
| `docs/ops/runbooks/` | ✅ Verified | Ops runbooks directory. |
| `docs/security/data-handling/` | ✅ Verified | Security data-handling guidance. |
| `docs/roadmap/STATUS.json` | ✅ Verified | Roadmap execution ledger; updates required per governance. |
| `agent-contract.json` | ✅ Verified | Machine-readable GA contract referenced by governance. |

## ⚠️ Assumptions (Deferred pending validation)

| Topic | Assumption | Rationale |
| --- | --- | --- |
| Evidence schema | Evidence bundle schema lives under `evidence/` with JSON layout aligned to governance. | Prior repo pattern; not revalidated in this pass. |
| Adapter seams | Adapter interfaces live outside `docs/` and are wired through feature flags. | Planned for later PRs; not implemented here. |
| CI gate names | `pr-quality-gate.yml` and standard lint/test workflows enforce documentation updates. | Governance references only; workflow names unvalidated here. |

## Must-Not-Touch List (Governed Exceptions Required)

* `docs/governance/*` (policy and constitutional artifacts)
* `governance/*` (OPA/rego, policy enforcement)
* `.github/workflows/*` (CI policy enforcement)
* `agent-contract.json` (GA contract)
* `docs/ga/*` (GA guardrails and evidence gates)

## Next Action (Final)

Proceed with documentation-only additions for the sandboxed agent runtime pattern. All implementation changes remain deferred and feature-flagged until governance sign-off.
