# Evidence Management

**Status:** Active | **Owner:** Governance Board | **Last Reviewed:** 2025-05-12

This document defines the standard for evidence collection, retention, and verification.

## Evidence Philosophy
"If it isn't recorded, it didn't happen."
Every governance decision and gate execution must produce an immutable artifact.

## Evidence Map

| Evidence Type | Description | Source | Artifact Location | Retention |
| :--- | :--- | :--- | :--- | :--- |
| **GA Gate Report** | Full summary of release readiness. | `ga-gate` job | `artifacts/ga/ga_report.md` | Permanent |
| **Test Results** | Unit, E2E, and Integration test logs. | `unit-tests` job | `test-results/` | 90 Days |
| **Security Scan** | Vulnerability and Secret reports. | `trivy`, `pnpm audit` | `security-report.json` | 1 Year |
| **Policy Validation** | Results of policy syntax checks. | `validate_governance_policies` | `policy_validation.json` | 1 Year |
| **Ops Weekly** | Weekly operational health snapshots. | Ops Drill | `docs/ops/evidence/` | 1 Year |

## Evidence Bundle Structure

For every GA release, we generate a standardized bundle:

```
dist/evidence/<SHA>/
├── meta.json               # Timestamp, Actor, CI Run ID
├── checksums.sha256        # Integrity hashes for all files
├── ga_report.md            # Human readable summary
├── ga_snapshot.json        # Machine readable data
├── security/
│   ├── secrets.json
│   └── dependencies.json
└── test/
    └── summary.json
```

## Verification

To verify the authenticity of an evidence bundle:
1.  Retrieve the bundle from the release artifacts.
2.  Calculate SHA256 of files.
3.  Compare against `checksums.sha256`.
4.  Verify the CI Run ID in `meta.json` corresponds to a successful GitHub Actions run on `main`.

## Operations Evidence

Operational evidence (drills, manual checks) is tracked in the [Evidence Index JSON](../ops/EVIDENCE_INDEX.json).
