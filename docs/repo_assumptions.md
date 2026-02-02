# Repo Assumptions (CogOps Intake)

**Escalation anchor:** See the Summit Readiness Assertion in
`docs/SUMMIT_READINESS_ASSERTION.md`. This intake aligns to the existing
readiness posture and does not override governance.

## Verified vs. Assumed

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Monorepo uses pnpm workspaces | Verified | `pnpm-workspace.yaml` | Package manager scope confirmed. |
| Makefile as task runner | Verified | `Makefile` | Golden path target exists. |
| Docs CI policies exist | Verified | `docs/ci/REQUIRED_CHECKS_POLICY.yml` | Required checks policy file present. |
| Schema directory for JSON artifacts | Verified | `schemas/` | Existing schema registry directory. |
| Governance sources of truth | Verified | `docs/governance/CONSTITUTION.md` + `docs/governance/META_GOVERNANCE.md` | Must align changes to these authorities. |
| Evidence bundle conventions | Verified | `docs/evidence/evidence-map.yml` + `docs/governance/evidence-required.json` | Evidence catalog present. |
| Summit Readiness Assertion | Verified | `docs/SUMMIT_READINESS_ASSERTION.md` | Required escalation reference. |
| CI standard reference | Verified | `docs/CI_STANDARDS.md` | PR validation source of truth. |
| Runtime language mix | Deferred pending verification | N/A | Confirm which modules own new `cogops` code paths. |
| Evidence bundle hashing rules | Deferred pending verification | N/A | Confirm deterministic hash/ID practices in existing evidence tooling. |
| Required checks enforcement mechanism | Deferred pending verification | N/A | Confirm if policy is enforced via workflow or branch protection sync. |

## Must-not-touch files (without governance sign-off)

| Path | Rationale |
| --- | --- |
| `docs/governance/CONSTITUTION.md` | Governance authority; edits require explicit approval. |
| `docs/governance/META_GOVERNANCE.md` | Governance authority; edits require explicit approval. |
| `agent-contract.json` | Hardening contract; changes require governance approval. |
| `docs/ga/` | GA guardrails and testing strategy; changes require approval. |
| `.github/branch-protection-rules.md` | Branch protection contract; changes require release governance. |

## Next validation actions (deterministic)

1. Confirm `cogops` target module location and ownership boundaries.
2. Confirm evidence ID format in existing schema/tooling to avoid conflict.
3. Confirm required checks enforcement path for new CI jobs.

