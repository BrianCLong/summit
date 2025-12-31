# ISO/IEC 27001:2022 Control Mapping

This mapping links Annex A controls to Summit controls and evidence. Coverage is configuration-driven to avoid region-specific forks.

| Annex A Control                   | Summit Control(s)               | Evidence Pointers                                                                                                                    |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A.5.1 Information Security Policy | GOV-001, GOV-003                | `docs/governance/CONSTITUTION.md`; `docs/governance/META_GOVERNANCE.md` policy supremacy.                                            |
| A.5.32 Change Management          | CICD-001, CICD-002, CICD-003    | `.github/workflows/pr-quality-gate.yml`; `.husky/commit-msg`; `Makefile` golden-path smoke.                                          |
| A.5.20 Logging and Monitoring     | AUD-002, CFM-001                | `ga-graphai/packages/prov-ledger/README.md`; `docs/observability/phase-1-delivery-runbook.md`; provenance samples via export script. |
| A.5.15 Access Control             | GOV-002, SEC-002                | Human primacy (`docs/governance/CONSTITUTION.md`), production guardrails `server/src/config.ts`; tenancy docs `tenancy/`.            |
| A.8.16 Monitoring Activities      | CFM-001, CFM-002                | Continuous monitoring controls in `COMPLIANCE_CONTROLS.md`; CI regression gates `.github/workflows/pr-quality-gate.yml`.             |
| A.8.33 Data Retention             | SEC-002 + Profiles              | Data retention defaults and overrides defined in `docs/regulatory/PROFILES.md`; enforced by profile flags (fail-closed if disabled). |
| A.5.19 Supplier Relationships     | GOV-005 + Shared Responsibility | `docs/governance/META_GOVERNANCE.md` standards; supplier/customer responsibilities captured in `docs/regulatory/PROFILES.md`.        |
| A.8.28 Secure Coding              | SEC-001, SEC-003, CICD-001      | Secret scanning `.husky/pre-commit`; dependency scanning in `.github/workflows/pr-quality-gate.yml`; CI quality gates.               |

## Mapping Notes

- Evidence regeneration command: `pnpm exec ts-node scripts/regulatory/export_evidence.ts --regime iso-iec-27001 --from <ISO_START> --to <ISO_END> --out artifacts/regulatory/iso-iec-27001`.
- The same controls power both SOC 2 and ISO packs to prevent divergence; regional requirements are toggled via profiles (see `docs/regulatory/PROFILES.md`).
