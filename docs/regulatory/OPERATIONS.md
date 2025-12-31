# Ongoing Compliance Operations

This runbook defines change-impact rules, re-attestation cadence, and drift management for regulatory packs.

## Change Impact Rules

- **Requires re-assessment:**
  - Changes to policy-as-code or control definitions (`COMPLIANCE_CONTROLS.md`, `docs/governance/*`).
  - Modifications to CI/CD guardrails, provenance ledger configuration, or audit log retention.
  - Introduction of new regions, data residency changes, or profile defaults.
- **Pre-approved (no re-attestation):**
  - Cosmetic documentation changes unrelated to controls.
  - Dependency patch bumps that do not alter enforcement code paths.
  - Adding new evidence samples without changing controls.

## Periodic Re-Attestation

- **Cadence:** Monthly evidence refresh plus post-incident refresh.
- **Procedure:**
  1. Run `pnpm exec ts-node scripts/regulatory/export_evidence.ts --regime <regime> --from <ISO_START> --to <ISO_END> --profile <profile>`.
  2. Review `gaps.json`; open remediation tickets for any missing artifacts.
  3. Publish updated bundle manifest and profile snapshot to the release record.

## Drift Alerts

- The export script records profile and control hashes; differences between successive bundles trigger drift alerts in CI.
- Fail-closed behavior: if required fields (audit logging, provenance sink, retention) are missing, the script exits non-zero and CI blocks deployment.

## Ownership & Escalation

- **DRI:** Compliance engineering (mirrors GA hardening contract) owns profile definitions and evidence automation.
- **Escalation:** Security council for control regressions; DevOps for CI enforcement failures; governance for scope disputes.
