# Unified Governance Gate

**Status:** Active | **CI Job:** `ga-gate` | **Command:** `make ga`

The **Unified Gate** is the single authoritative check that determines if a release candidate is ready for General Availability (GA). It aggregates all other checks (security, testing, compliance) into a single pass/fail status.

## Purpose
To ensure that no artifact reaches production without passing all required quality and security controls.

## Scope of Checks

The `make ga` command orchestrates the following checks:

1.  **Build Verification:**
    *   Clean build of all packages (`pnpm build`).
    *   Reproducibility check (`scripts/check-reproducibility.sh`).

2.  **Testing:**
    *   Unit Tests (`pnpm test:unit`).
    *   Integration Tests.
    *   End-to-End Tests (Playwright).

3.  **Security & Compliance:**
    *   Secret Scanning (`trivy`).
    *   Dependency Risk Audit (`pnpm audit`).
    *   License Compliance.
    *   SBOM Generation.

4.  **Governance:**
    *   Policy Validation (`validate_governance_policies.sh`).
    *   Evidence Collection (Bundled into `dist/evidence/`).

## Evidence Output

Successful execution produces an **Evidence Bundle** at:
`artifacts/ga/`

Key files:
*   `ga_report.md`: Human-readable summary.
*   `ga_snapshot.json`: Machine-readable state.
*   `checksums.sha256`: Integrity verification.

## Failure Troubleshooting

If the gate fails:
1.  Check the "Job Summary" in GitHub Actions.
2.  Download the `ga-report` artifact.
3.  Consult the [Release Captain Runbook](./RUNBOOKS/release_captain.md).

## Bypass Protocol

**Emergency Only.**
To bypass the gate for a hotfix, you must:
1.  Obtain approval from 2 Governance Board members.
2.  Use the `release-override` workflow with a justification note.
3.  File a "Governance Deviation" issue immediately post-release.
