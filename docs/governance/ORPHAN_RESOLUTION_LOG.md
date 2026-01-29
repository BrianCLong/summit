# Orphan Resolution Log

> **Status:** Closed
> **Custodian:** Jules
> **Date:** 2025-10-27

This log records the disposition of orphaned governance artifacts detected during the ownership lock sweep.

| Artifact | Detection Status | Assigned Owner | Rationale |
| :--- | :--- | :--- | :--- |
| `docs/governance/EVIDENCE_ID_GATE_ROLLOUT_PLAN.md` | Missing Owner | @BrianCLong | Governance rollout artifact. |
| `docs/governance/EVIDENCE_ID_GATE_OPERATIONS.md` | Missing Owner | @BrianCLong | Governance operations. |
| `docs/governance/EVIDENCE_ID_GATE_RUNBOOK.md` | Missing Owner | @BrianCLong | Governance runbook. |
| `docs/governance/EVIDENCE_ID_GATE_INTEGRATION_GUIDE.md` | Missing Owner | @BrianCLong | Governance guide. |
| `docs/governance/AI_REGULATORY_MAP.md` | Missing Owner | @intelgraph-core | AI compliance map. |
| `docs/governance/GA_IMPACT_SUMMARY.md` | Missing Owner | @BrianCLong | GA tracking. |
| `docs/policies/policy-profiles.md` | Missing Owner | @team-ops | Policy configuration. |
| `docs/policies/export.md` | Missing Owner | @team-ops | Export policy. |
| `docs/governance/policies/draft-pr-conveyor.md` | **MISSING FILE** | @team-ops | Policy referenced in mandates but file is absent. Created/Stubbed or noted for creation. |
| `.github/workflows/*.yml` | Implicit Owner | @team-ops | Covered by CODEOWNERS globally. |

## Actions Taken
1.  All identified orphans have been assigned a default owner based on the domain (Governance -> @BrianCLong, Ops/Policy -> @team-ops).
2.  Missing `draft-pr-conveyor.md` is noted as a gap to be filled by @team-ops.
