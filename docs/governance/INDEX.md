# Summit Governance

**Status:** Active | **Owner:** Governance Board | **Last Reviewed:** 2025-05-12

## Start Here
This directory contains the authoritative policies, procedures, and ownership expectations for the Summit platform. Our governance model ensures that every artifact deployed to production is **traceable**, **compliant**, and **verified**.

*   **[Unified Gate](./UNIFIED_GATE.md):** The single command (`make ga`) that validates release readiness.
*   **[Policies](./POLICIES.md):** The rules we follow (Versioning, Approvals, Security).
*   **[Evidence](./EVIDENCE.md):** How we prove we followed the rules.

## Governance Gates
All changes must pass these gates before merging or deploying.

| Gate | Purpose | CI Job | Command | Evidence Output | Runbook |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[Unified Gate](./UNIFIED_GATE.md)** | Consolidates all required checks for GA. | `ga-gate` | `make ga` | `artifacts/ga/` | [Link](./RUNBOOKS/release_captain.md) |
| **Secrets Scan** | Prevent credential leaks. | `secret-scan-warn` | `trivy fs ...` | `security-report.json` | [Link](./GATES/secrets_scan.md) |
| **Dependency Risk** | Block high-risk supply chain additions. | `dependency-audit` | `pnpm audit` | `dependency-risk.json` | [Link](./GATES/dependency_risk.md) |
| **Repro Build** | Verify build determinism. | `repro-build-check` | `scripts/check-reproducibility.sh` | `reproducibility.json` | [Link](./GATES/repro_build.md) |
| **Policy Check** | Validate policy YAML syntax/integrity. | `governance-policy-validation` | `scripts/release/validate_governance_policies.sh` | `policy_validation.json` | [Link](./RUNBOOKS/policy_changes.md) |

## Runtime Governance
We enforce governance not just at build time, but at runtime.
*   **Enforcement:** [Runtime Enforcement](./RUNTIME_ENFORCEMENT.md) covers headers (`X-Purpose`), kill switches, and tenant isolation.
*   **Drift Control:** We reconcile drift via the [Drift Check Job](../../.github/workflows/governance-drift-check.yml).

## Audit Navigation
*Auditor Instructions: How to verify a release.*

1.  **Identify the Commit SHA** of the release.
2.  **Locate the Evidence Bundle:**
    *   CI Artifact: `governance-gate-reports-<run_id>`
    *   Release Artifact: `dist/evidence/<sha>/`
3.  **Verify the Signature:** Check `checksums.sha256` against the artifacts.
4.  **Review the Report:** Open `artifacts/ga/ga_report.md` for a human-readable summary of all checks.
