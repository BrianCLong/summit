Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Governance Evidence

## Evidence Locations

- Docs integrity: `artifacts/governance/docs-integrity/<sha>/`
- SLSA Provenance Verification: `reports/provenance/status.txt`
- Branch protection drift: `artifacts/governance/branch-protection-drift/`
- SOC control verification: `soc-compliance-reports/`
- Release evidence bundles: `evidence-bundles/`
- SOC evidence report: `dist/evidence/<sha>/SOC_EVIDENCE_REPORT.md`
- Control evidence index: `docs/governance/CONTROL_EVIDENCE_INDEX.md`

## Evidence Collection

- Run `pnpm ci:docs-governance` to emit docs integrity artifacts.
- Run `gsv attest-verify` (via CI) to emit provenance verification artifacts.
- Run `pnpm ci:branch-protection:check` to emit drift artifacts.
- Run `bash scripts/test-soc-controls.sh soc-compliance-reports` for SOC reports.
- Run `make ga-report` to emit SOC Evidence Report artifacts.
- SOC report outputs: `soc-compliance-reports/server-soc-controls.xml`, `soc-compliance-reports/soc2-compliance-service.xml`.
