# SOC 2 Type II Control Mapping

This mapping links SOC 2 Type II Trust Services Criteria (Security, Availability, Confidentiality) to Summit controls and concrete evidence artifacts. Each evidence item is executable or automatically generated (CI logs, configuration, policy-as-code).

| SOC 2 Clause                        | Summit Control(s)            | Evidence Pointers                                                                                                                                                        |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CC1.1 Control Environment & Purpose | GOV-001, GOV-003             | `docs/governance/CONSTITUTION.md`; `docs/governance/META_GOVERNANCE.md` for governance supremacy and conflict resolution.                                                |
| CC3.2 Change Management             | CICD-001, CICD-002, CICD-003 | `.github/workflows/pr-quality-gate.yml` (quality gates & smoke); `.husky/commit-msg` (conventional commits); `Makefile` + `make smoke` path.                             |
| CC4.1 Risk Assessment               | CFM-002, CFM-003             | `COMPLIANCE_CONTROLS.md` continuous monitoring controls; `docs/governance/quality-assurance.md` cadence; CI regression tests in `.github/workflows/pr-quality-gate.yml`. |
| CC6.1 Logical Access                | GOV-002, SEC-002             | `docs/governance/CONSTITUTION.md` human-primacy; `server/src/config.ts` production guardrails; environment enforcement in `Makefile` golden path.                        |
| CC7.2 Monitoring                    | AUD-002, CFM-001             | Immutable provenance ledger implementation in `ga-graphai/packages/prov-ledger/README.md`; observability runbook `docs/observability/phase-1-delivery-runbook.md`.       |
| A1.1 Capacity/Availability          | GOV-005, CICD-003            | Standards enforcement in `docs/governance/META_GOVERNANCE.md`; golden-path smoke in `.github/workflows/pr-quality-gate.yml`.                                             |
| C1.1 Data Confidentiality           | SEC-001, SEC-002             | Secret scanning hook `.husky/pre-commit`; production config guardrails `server/src/config.ts`.                                                                           |

## Mapping Notes

- Evidence items are regenerable via `scripts/regulatory/export_evidence.ts --regime soc2-type-ii --from <ISO> --to <ISO>` which assembles the referenced artifacts into an auditable bundle.
- Additional privacy-related clauses leverage ISO/IEC 27001 Annex A mappings to avoid duplication and to keep the pack configuration-driven rather than code-forked.
