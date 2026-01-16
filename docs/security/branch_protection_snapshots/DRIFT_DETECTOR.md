# Branch Protection Drift Detector

The drift detector periodically verifies that the actual branch protection settings in GitHub match the defined policy in `docs/ci/REQUIRED_CHECKS_POLICY.yml`.

## Purpose

This tool provides an automated, auditable signal for drift in critical security settings without automatically modifying those settings.

## How it Works

1. **Extraction:** It reads the `always_required` checks from the policy file.
2. **Comparison:** It fetches the live settings from the GitHub API.
3. **Escalation:** If a mismatch is found (exit code 2), it creates or updates a deduplicated GitHub Issue with the label `branch-protection-drift`.

## Testing / Simulation

You can safely test the end-to-end escalation path (artifact creation and issue management) without changing any real GitHub settings or policy files using **Simulation Mode**.

### How to run a simulation

1. Go to the **Actions** tab in the repository.
2. Select the **Branch Protection Drift Detection** workflow.
3. Click the **Run workflow** dropdown.
4. Select the **mode**:
   - `simulate_drift`: Triggers a full escalation path with a synthetic report.
   - `simulate_permissions`: Simulates an API access error.
   - `simulate_error`: Simulates a generic script failure.
5. Click **Run workflow**.

### Expected Outcomes (simulate_drift)

- **Workflow Status:** The run will fail (exit code 2).
- **Artifacts:** A `branch-protection-drift-report` will be uploaded containing synthetic data.
- **Escalation:** A GitHub Issue will be created or updated:
  - **Label:** `branch-protection-drift-test`
  - **Title:** `[TEST] Branch protection drift detected on main`
  - **Note:** The issue body will clearly state it is a synthetic test.

> [!IMPORTANT]
> After verifying the escalation path, please manually close the test issue.

## References

- [DRIFT_RESPONSE_RUNBOOK.md](./DRIFT_RESPONSE_RUNBOOK.md) - How to respond to real drift events.
- [BRANCH_PROTECTION_DRIFT.md](../../ci/BRANCH_PROTECTION_DRIFT.md) - Deep dive into detector logic.
