# Dependency Change Gate

This project implements a governance gate to ensure that major dependency changes in release-bound Pull Requests are explicitly reviewed and approved.

## Policy

The policy is defined in `release-policy.yml` under the `dependency_change_gate` section.

### Thresholds

Approval is required if changes exceed any of the following thresholds in a single PR:

*   **Major Version Bumps:** >= 1 (e.g., `v1.0.0` -> `v2.0.0`)
*   **Added Dependencies:** >= 3
*   **Removed Dependencies:** >= 3
*   **Total Events:** >= 5

### Scope

*   **Enforcement:** Only applies to PRs with the `release-intent` label.
*   **Visibility:** All PRs generate a report artifact, but only release-intent PRs can fail the check.

### Allowlist

Certain safe packages (e.g., `@types/*`, `eslint*`) are excluded from counting towards thresholds.

## How to Approve

If the `Release Gate` workflow fails due to dependency changes:

1.  **Review the Report:** Download the `deps-change-report` artifact from the GitHub Actions run summary. Open `report.md` to see the detailed list of changes.
2.  **Verify Safety:** Ensure the changes are intentional and safe for release.
3.  **Apply Label:** Add the label `deps-approved` to the Pull Request.
4.  **Re-run:** Re-run the failed job or push a commit to trigger a new build. The gate will now pass.

## Local Reproduction

You can run the analyzer locally to preview the report:

```bash
# Analyze changes between main and your current HEAD
node scripts/ci/analyze_dependency_changes.mjs origin/main HEAD

# Check the output
cat artifacts/deps-change/report.md
```

To test enforcement logic:

```bash
# Test with simulated release intent
RELEASE_INTENT=true HAS_APPROVAL=false node scripts/ci/enforce_dependency_approval.mjs
```
