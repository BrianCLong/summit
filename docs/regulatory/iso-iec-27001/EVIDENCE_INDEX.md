# ISO/IEC 27001 Evidence Index

Use this index to deliver a complete, reproducible evidence pack for ISO/IEC 27001:2022 scope.

## Quick Regeneration

```bash
pnpm exec ts-node scripts/regulatory/export_evidence.ts --regime iso-iec-27001 --from 2025-12-01T00:00:00Z --to 2025-12-31T23:59:59Z --out artifacts/regulatory/iso-iec-27001
```

## Evidence Items

| Category                 | Evidence                                                   | Location                                                                                                                   | Generation Path                              |
| ------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| ISMS Policy & Governance | Constitution, Meta-Governance, shared responsibility notes | `docs/governance/CONSTITUTION.md`; `docs/governance/META_GOVERNANCE.md`; `docs/regulatory/PROFILES.md`                     | Bundled by export script.                    |
| Control Mapping          | Annex A mappings and control inventory                     | `COMPLIANCE_CONTROLS.md`; this pack's `CONTROL_MAPPING.md`; SOC mappings where shared                                      | Static bundle.                               |
| Logging & Monitoring     | Provenance ledger docs and samples                         | `ga-graphai/packages/prov-ledger/README.md`; `artifacts/provenance/` samples filtered by window                            | Script filters by timestamp.                 |
| Access Control           | Config guardrails and tenancy                              | `server/src/config.ts`; `tenancy/` docs; `docs/governance/CONSTITUTION.md`                                                 | Static inclusion with hash metadata.         |
| Change Management        | CI/CD quality gates and commit policy                      | `.github/workflows/pr-quality-gate.yml`; `.husky/commit-msg`; `Makefile` golden-path targets                               | Static inclusion.                            |
| Supplier Management      | Cloud/shared responsibility statements                     | `docs/regulatory/PROFILES.md`; customer-provided attestations stored under `artifacts/regulatory/iso-iec-27001/suppliers/` | Script copies attachments present in window. |
| Operations & Resilience  | Backup/restore runbooks; observability guidance            | `BACKUP_RESTORE_DR_GUIDE.md`; `docs/observability/phase-1-delivery-runbook.md`; `RUNBOOKS/`                                | Static inclusion.                            |
| Security Scanning        | Secret scan and dependency scan outputs                    | `.husky/pre-commit`; CI SARIF under `artifacts/security/`                                                                  | Script includes SARIF within window.         |
| Data Retention           | Active profile configuration snapshot                      | `artifacts/regulatory/iso-iec-27001/profile.json` generated per run                                                        | Generated JSON by export script.             |

## Time-Bounded Evidence Handling

- Export script writes `gaps.json` if supplier attestations or retention snapshots are missing for the window.
- No manual evidence collection is required; rerun the script with the desired window to refresh artifacts.
