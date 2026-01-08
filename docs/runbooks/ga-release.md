# GA Release Runbook

**Last Updated:** 2024-05-22
**Owner:** Release Engineering
**SLA:** 24h for GA response

## Overview

The GA Release workflow is a strictly controlled, two-phase process designed to ensure safety, compliance, and stability.

1.  **Phase 1: Verify & Prepare**
    *   Runs automated verifications (Policy, Evidence, Gates).
    *   Builds artifacts and SBOMs.
    *   Signs artifacts.
    *   Generates SLSA provenance.
    *   **Outcome:** Artifacts are ready for inspection but NOT published.

2.  **Phase 2: Publish & Promote**
    *   **Requires:** Phase 1 success.
    *   **Gate:** Manual Approval in GitHub Environment `release-approval`.
    *   **Gate:** Emergency Stop / Kill Switch Check.
    *   **Outcome:** GitHub Release created, artifacts published.

## Triggering a Release

1.  Go to the **Actions** tab in GitHub.
2.  Select **GA Release** workflow.
3.  Click **Run workflow**.
4.  Fill inputs:
    *   `version`: The version to release (e.g., `2.0.0`).
    *   `publish`: Check this to enable Phase 2. If unchecked, it will only run Phase 1 (Verify & Prepare).
    *   `dry_run`: Leave unchecked for a real release.

## Approval Process

1.  Once Phase 1 completes successfully, the workflow will pause.
2.  Authorized approvers (defined in `release-approval` environment settings) will receive a notification.
3.  Approvers must:
    *   Review Phase 1 logs (gates passed, policy verified).
    *   Review generated artifacts (attached to Phase 1 job).
    *   Verify no ongoing incidents.
4.  Click **Review deployments** -> **Approve and Deploy**.

## Emergency Stop / Kill Switch

**Purpose:** Instantly block any release publication, even if approved.

### Activation

**Option A: Environment Variable (Global)**
Set the repository variable `RELEASE_KILL_SWITCH` to `1` or `true`.

**Option B: Freeze File (Code based)**
Commit a file named `release-freeze` to the `ci/` directory.
```bash
touch ci/release-freeze
git add ci/release-freeze
git commit -m "STOP: Emergency Release Freeze"
git push
```

### Effect
*   Phase 1 will fail immediately.
*   Phase 2 (if already running) will fail immediately.
*   Approval button will be useless as the job checks the switch upon starting.

### Recovery
1.  Resolve the incident.
2.  Remove the `ci/release-freeze` file or set `RELEASE_KILL_SWITCH` to `0`.
3.  Re-run the workflow.

## Gates & Verification

The following gates are strictly enforced in Phase 1:

1.  **Policy Verification:** `release-policy.yml` must be valid and drift-free.
2.  **Evidence Verification:** Evidence artifacts must be generated and valid.
3.  **Promotion Guard:** Checks if the tag/commit is safe for promotion (e.g., green CI history).
4.  **Dependency Approval:** All dependencies must be approved/audited.
5.  **Kill Switch:** Must be inactive.

## Rollback

If a bad release is published:

1.  **Activate Kill Switch** to prevent further automation.
2.  **Mark Release as Broken:** Edit the GitHub Release to mark as "DO NOT USE" or delete it if critical.
3.  **Revert:** Revert the code changes.
4.  **Hotfix:** Follow the `Hotfix Release` runbook to issue a patched version (e.g., `2.0.1`).

## Troubleshooting

*   **"Emergency Stop active"**: Check `RELEASE_KILL_SWITCH` var or `ci/release-freeze` file.
*   **"Policy Verification failed"**: Check `release-policy.yml` syntax.
*   **"Dependency Approval failed"**: Run `scripts/release/dependency_audit.sh` locally to see what's wrong.
