# Runbook: Governance Watcher

**Status:** Active (MVP-5)
**Owner:** Platform Engineering
**Target SLI:** <1 hour alert on drift detection

## Description

The `branch-protection-drift.yml` workflow continuously validates that GitHub branch protection on `main` matches the `REQUIRED_CHECKS_POLICY.yml` configuration. If drift occurs, the workflow will output an advisory report and attempt to auto-remediate if the `mode` is `apply`.

## Resolution Steps

### Issue: "Insufficient permissions" Error

- The `GITHUB_TOKEN` or App Installation Token does not have `Administration: Read-only` access.
- Check the `actions/create-github-app-token` execution logs to confirm app ID and token request succeeded.

### Issue: Drift Detected on Main

1. **Review Drift Report:** Check the `artifacts/release-train/branch_protection_drift_report.json` in the failing workflow run.
2. **Determine Course of Action:**
    - If a check was intentionally removed or renamed in a recent PR, update `docs/ci/REQUIRED_CHECKS_POLICY.yml` to match the new check name.
    - If a check was accidentally dropped from GitHub settings, manually add it back to the branch protection rules for `main`.
3. **Trigger Validation:** Dispatch a new run of `branch-protection-drift.yml` to confirm resolution.

## Telemetry and Artifacts

- **Log Level:** INFO (verbose available via `--verbose` flag on `check_branch_protection_drift.sh`)
- **Artifact:** `report.json` (determines drift state)
- **Artifact:** `stamp.json` (timestamps and run metadata)
