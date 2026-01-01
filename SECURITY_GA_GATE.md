# GA Risk Gate (Security & Quality)

This repository implements a standardized "GA Risk Gate" that runs on every Pull Request to ensure security and quality standards are met before merging.

## Overview

The Gate is implemented as a GitHub Actions workflow `.github/workflows/ga-risk-gate.yml` and is required for all PRs targeting the main branch.

### Checks Performed

1.  **Freeze Window:** Checks `docs/policies/trust-policy.yaml` for `ga_gate.freeze_mode`. If `blocking`, the PR is blocked.
2.  **Secrets Scanning:** Scans the codebase for hardcoded secrets using Trivy.
3.  **Dependency Review:** Blocks high-severity vulnerabilities in dependencies and forbidden licenses (AGPL, GPL).
4.  **SBOM & Vulnerabilities:** Generates a CycloneDX SBOM using Syft and scans it with Grype (fails on Medium+ severity).
5.  **Provenance:** Verifies that build artifacts can be signed and attested using Cosign.
6.  **OPA Policy:** Evaluates the `policy/ga-gate.rego` policy against the PR state, enforcing AuthZ, Export, and DLP invariants.

## How to Configure

### Toggling the Freeze Window

To enable the freeze window (e.g., during code freeze or incident):

1.  Edit `docs/policies/trust-policy.yaml`.
2.  Set `ga_gate.freeze_mode` to `"blocking"`.
3.  Commit and push. All new PR checks will fail until reverted to `"advisory"`.

### Overriding Policy

If a legitimate change is blocked by OPA or other checks:

1.  **False Positive Secret:** Add the secret to `.trivyignore`.
2.  **Vulnerability Exception:** Add the vulnerability ID to the `.grype.yaml` allowlist (if configured) or fix the dependency.
3.  **Policy Exception:** Update `policy/ga-gate.rego` to allow specific exceptions (requires Security approval).

## Emergency Break-Glass

In the event of a critical incident where the gate is malfunctioning or blocking a hotfix:

1.  **Admin Override:** Repository Admins can force-merge PRs without all checks passing (use with extreme caution).
2.  **Disable Gate:** Remove the `ga-risk-gate` job from the calling workflow (`ci.yml`) temporarily.

## Verification

To verify the gate locally:
```bash
./scripts/check-ga-policy.sh
grype .
trivy fs .
```
