# Repo Assumptions & Validation (CogWar MWS)

**Readiness reference:** Summit Readiness Assertion governs posture and exceptions. See
`docs/SUMMIT_READINESS_ASSERTION.md`.

## Validation Checklist (Executed)

1. `ls -la .github/workflows` → confirmed workflow inventory and gate candidates.
2. `cat package.json pnpm-workspace.yaml` → confirmed monorepo scripts + workspace layout.
3. `rg -n "evidence_id|report.json|stamp.json" -S` → confirmed evidence patterns + schemas.
4. `ls src` → confirmed `src/` root for new CogWar schema placement.

## Verified vs Deferred (Repo Shape)

| Item | Status | Notes |
| --- | --- | --- |
| `.github/workflows/` | ✅ Verified | Large workflow inventory present; see required check discovery in `required_checks.todo.md`. |
| `package.json` scripts | ✅ Verified | Jest-based root tests; pnpm scripts defined. |
| `pnpm-workspace.yaml` | ✅ Verified | Workspace spans `apps/*`, `packages/*`, `client`, `server`, `services/*`, `cli`, `tools/*`, etc. |
| `src/` root | ✅ Verified | `src/` exists; CogWar schemas placed under `src/cogwar/schema/`. |
| Evidence patterns | ✅ Verified | Evidence directories and schemas present under `evidence/`, `agentops/evidence/`, `intel/schema/`, `tests/evidence/`. |
| Required CI check names | ❓ Deferred pending verification | Branch protection API/UI confirmation required to map exact status check names. |
| Governance-required PR metadata | ❓ Deferred pending verification | Must align with `.github/PULL_REQUEST_TEMPLATE.md` metadata block before PR submission. |

## Must-Not-Touch Files (Governance/Authority)

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `agent-contract.json`

## Next Enforcement Actions

- Add CogWar schemas and tests in scoped paths only.
- Record updated roadmap status in `docs/roadmap/STATUS.json`.
- Use governed exceptions if any deviation from deterministic artifacts is required.
