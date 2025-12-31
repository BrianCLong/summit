# SOC 2 Type II Audit Playbook

This playbook provides time-boxed responses to common SOC 2 requests using shipped artifacts and the evidence export script.

## Quick Start

1. Generate an evidence bundle for the requested window:
   ```bash
   pnpm exec ts-node scripts/regulatory/export_evidence.ts --regime soc2-type-ii --from <ISO_START> --to <ISO_END> --out artifacts/regulatory/soc2-type-ii
   ```
2. Provide the bundle plus this playbook to the auditor.

## Request-to-Evidence Guide

| Auditor Request                          | Where to Point                                                                                                                 | Procedure                                                                                                | SLA       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------- |
| "Show change approvals for deployment X" | `artifacts/regulatory/soc2-type-ii/change-events.json`                                                                         | Filter by PR number or commit hash; records include CODEOWNERS approvers and CI status.                  | ≤ 4 hours |
| "Show access controls for production"    | `docs/governance/CONSTITUTION.md` (GOV-002), `server/src/config.ts` guardrails, `COMPLIANCE_CONTROLS.md`                       | Share config excerpt and explain fail-closed defaults; export script includes file hashes for integrity. | ≤ 2 hours |
| "Show logging and monitoring evidence"   | `ga-graphai/packages/prov-ledger/README.md`, `artifacts/provenance/` samples, `docs/observability/phase-1-delivery-runbook.md` | Provide sample immutable ledger entries from requested window.                                           | ≤ 2 hours |
| "Show smoke/availability checks"         | `.github/workflows/pr-quality-gate.yml`, `smoke_test_output.txt` (latest), `artifacts/regulatory/soc2-type-ii/ci-runs.json`    | Supply the CI run IDs and smoke test outputs captured in the bundle.                                     | ≤ 2 hours |
| "Show incident management"               | `RUNBOOKS/`, `BACKUP_RESTORE_DR_GUIDE.md`, `INCIDENT_SIGNAL_MAP.md`                                                            | Provide the runbook PDFs/MD plus any incident reports included in evidence bundle.                       | ≤ 4 hours |

## Interview Preparation

- **Architecture reality:** use `ARCHITECTURE_MAP.generated.yaml` and `ARCHITECTURE.md` to anchor explanations; highlight policy-as-code enforcement and provenance ledger flow.
- **Shared responsibility:** clarify cloud provider vs. Summit vs. customer controls as recorded in `docs/regulatory/PROFILES.md`.
- **Configuration-driven stance:** emphasize that regional differences use profiles and feature flags—no forks—validated by drift detection described in `docs/regulatory/PROFILES.md`.

## Time-Boxed Process

- All requests are answered from the generated bundle and static docs; no ad-hoc data pulls.
- If evidence is missing, log the gap in `artifacts/regulatory/soc2-type-ii/gaps.json`, regenerate, and document remediation ETA in the response.
