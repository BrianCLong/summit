# Repository Reality Check — Cognitive Ops (CogOps)

This document captures verified observations and intentionally constrained assumptions for the
CogOps onboarding workstream. It is a living artifact and must be updated as verification expands.

## Verified vs Assumed

| Item | Status | Evidence |
| --- | --- | --- |
| Repository is a pnpm workspace | Verified | `pnpm-workspace.yaml` present in repo root. |
| Schemas live in `schemas/` | Verified | `schemas/` directory present with existing schema catalog. |
| Required checks policy file exists | Verified | `docs/ci/REQUIRED_CHECKS_POLICY.yml` present. |
| Evidence schemas exist (report/metrics/stamp) | Verified | `schemas/evidence*.schema.json` present. |
| Primary docs tree is `docs/` | Verified | `docs/` directory present with CI/governance content. |
| CogOps demo script path (`scripts/cogops/run_demo_fixture.sh`) | Deferred pending repo validation | No script verified yet; path to be confirmed. |
| Dedicated CogOps CI job naming (`cogops:tests`) | Deferred pending CI inventory | CI workflow names to be confirmed. |
| Evidence bundle conventions for CogOps | Deferred pending standard review | Requires alignment with `schemas/evidence*.schema.json`. |

## Must-Not-Touch Files (Current Constraints)
These files are governance-anchored and require explicit approval to change:

| Path | Rationale |
| --- | --- |
| `docs/SUMMIT_READINESS_ASSERTION.md` | Absolute readiness authority and enforced posture. |
| `docs/governance/*` | Constitutional and policy authority files. |
| `docs/ga/*` | GA guardrails and hard gates. |
| `agent-contract.json` | Machine-readable contract for agent operations. |
| `CODEOWNERS` | Ownership authority mapping. |

## Next Verification Pass
1. Confirm existing evidence bundle generators and naming conventions.
2. Identify current CI required checks and ensure cogops gating aligns.
3. Locate any existing cognitive-ops or misinfo modules to reuse.
