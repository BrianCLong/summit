# Policy→Workflow→Evidence Registry (Authoritative)

Each policy/control below maps to definitive CI checks and a stable `evidence_id`.
**Gate logic**: a release is mergeable only if all `required: true` entries have their checks green **and** the declared artifacts exist and validate.

## GA-GATE — GA Release Readiness Gate
- Controls: SOC2:CC2.3, ISO27001:A.12.6.1
- Workflow: `.github/workflows/release-readiness.yml` → job `release-readiness`
- Check: `release-readiness:gate`
- Evidence: `evidence.ga.release_readiness.v1` → `artifacts/governance/ga_release_readiness.json`

## CI-CORE — CI Core (build, lint, unit tests)
- Controls: SSDF:PS.3.2, SOC2:CC7.2
- Checks:
  - `ci:test` → `evidence.ci.tests.v1` → `artifacts/ci/test_report.json`
  - `ci:lint` → `evidence.ci.lint.v1` → `artifacts/ci/lint_report.json`

## SEC-SCA — Software Composition Analysis
- Controls: SSDF:PW.8.2, SOC2:CC7.1
- Workflow: `.github/workflows/ci-security.yml` → job `dependency-scan`
- Check: `security:sca`
- Evidence: `evidence.security.sca.v1` → `artifacts/security/sca_findings.json`

## SBOM-PROV — SBOM & Build Provenance
- Controls: SLSA:Provenance, SSDF:PW.4.2
- Checks:
  - `supplychain:provenance` → `evidence.supplychain.provenance.v1` → `artifacts/provenance/attestation.json`
  - `supplychain:sbom` → `evidence.supplychain.sbom.v1` → `artifacts/provenance/sbom.spdx.json`

## BRANCH-PROTECT — Branch Protection Drift
- Controls: SSDF:RV.1.3, SOC2:CC6.1
- Workflow: `.github/workflows/branch-protection-drift.yml` → job `check-drift`
- Check: `governance:branch-protection`
- Evidence: `evidence.governance.branch_protection.v1` → `artifacts/governance/branch_protection.json`
