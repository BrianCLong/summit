# CIS Benchmark Validation Runbook

**Purpose:** Provide a repeatable, auditable CIS benchmark validation procedure for Summit.

## Preconditions

- Access to the target Kubernetes cluster context.
- `kubectl`, `trivy`, and `cosign` installed in the execution environment.
- Read access to `scripts/security-hardening-suite.sh`.

## Primary Run

Use the security hardening suite to perform baseline CIS validation and related checks:

```bash
./scripts/security-hardening-suite.sh
```

This suite performs the following CIS-aligned checks:

- Pod Security Standards enforcement.
- Network policy coverage inspection.
- Privileged container detection.
- Image signature validation via `cosign`.
- RBAC permission validation.
- Vulnerability scan via `trivy`.

## Evidence Capture

- Save the generated `security-hardening-report-<timestamp>.md` to the security evidence store.
- Attach the report link in the Security Batch issue template under **CIS benchmark run evidence**.

## Validation Cadence

- **Requirement:** Latest CIS benchmark run must be ≤ 7 days old.
- **Failure Handling:** Record deviations as governed exceptions and open a follow-on issue labeled
  `lane:security`.
