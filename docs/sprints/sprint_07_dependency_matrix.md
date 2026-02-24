# Sprint 07 Dependency Matrix

## Epic-Level Dependencies

| Epic | Depends On | Reason |
| --- | --- | --- |
| SWB-07A Approvals UI | SWB-07B, SWB-07C | UI must render authoritative policy/risk output and signed receipt status. |
| SWB-07B OPA/ABAC Coverage | None | Foundational policy control plane. |
| SWB-07C Provenance Ledger v1 | SWB-07B | Policy hash/version required in receipts. |
| SWB-07D Timeline Sync | SWB-07C | Timeline drill-down needs receipt reference and verification state. |
| SWB-07E Observability Pack | SWB-07A, SWB-07C | Latency/error metrics depend on approval and signer/ledger paths. |
| SWB-07F FinOps Attribution | SWB-07A, SWB-07C | Cost snapshot must be captured pre-approval and embedded in receipt. |
| SWB-07G Packaging & Deploy | SWB-07B, SWB-07C, SWB-07E | Helm/Terraform package policy bundle, signer stack, dashboards, alerts. |
| SWB-07H Validation & Evidence | SWB-07A through SWB-07G | Integration/chaos evidence only valid after all control surfaces land. |

## Story-Level Critical Path

1. `SWB-07B` role/attribute expansion -> simulation CLI/CI gate -> coverage report.
2. `SWB-07C` receipt schema freeze -> signer integration -> ledger worker.
3. `SWB-07A` dual-control + rationale enforcement + stale-simulation guard.
4. `SWB-07D` timeline/graph receipt linkage.
5. `SWB-07E` SLO metrics + alerts.
6. `SWB-07G` Helm/Terraform packaging.
7. `SWB-07H` integration/chaos/evidence closure.

## Stop-The-Line Conditions

- Any unsigned privileged action.
- Policy coverage below 85%.
- p95 approval latency above 1.5s for 5 minutes.
- Dual-control bypass detected for `risk_tier=critical`.
