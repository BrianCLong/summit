# Deployment Runbook

## Overview

This runbook describes the deployment and release process for the platform. It covers the creation of release artifacts, validation gates, and the promotion lifecycle from Release Candidate (RC) to General Availability (GA).

## Release Channels

The platform release process is governed by the `release-policy.yml` file, which defines the following channels:

*   **RC (Release Candidate):**
    *   **Tag:** `vX.Y.Z-rc.N`
    *   **Allowed From:** `default-branch` (main)
    *   **Purpose:** Stabilization and verification before GA.
    *   **Evidence:** Optional.

*   **GA (General Availability):**
    *   **Tag:** `vX.Y.Z`
    *   **Allowed From:** `default-branch` (main) OR `series-branch` (release/X.Y).
    *   **Purpose:** Production-ready release.
    *   **Evidence:** Not strictly required by policy for creation, but release workflow generates and verifies it.

*   **Patch:**
    *   **Tag:** `vX.Y.Z` (on series branch)
    *   **Allowed From:** `series-branch`.
    *   **Purpose:** Hotfixes for existing series.

## Workflow

### 1. Triggering a Release

Releases are triggered by pushing a tag.

**Dry Run:**
The `GA Release` workflow defaults to `dry_run: true`. This means pushing a tag will:
1.  Run all validation gates.
2.  Build artifacts.
3.  Generate evidence.
4.  **SKIP** the final publish step to GitHub Releases.

To perform a **real** release, you must manually trigger the `GA Release` workflow via `workflow_dispatch` and set `dry_run: false`, OR rely on automation that sets this input (if configured).

### 2. Validation Gates

The release workflow enforces several checks:
*   **Policy Validation:** Ensures `release-policy.yml` is valid.
*   **Preflight Check:**
    *   Verifies the tag format matches the policy.
    *   Verifies the commit is reachable from the allowed branch (`main` or `release/*`) for the target channel.
    *   Verifies `package.json` versions match the tag.
*   **Freeze Window:** Checks if a deployment freeze is active (unless overridden).
*   **Tests & Security:** Runs unit tests, integration tests, and security scans.

### 3. Artifacts

The release process generates the following artifacts (stored in GitHub Actions and/or published to the Release):

*   `dist/release/release-report.md`: High-level summary of the release.
*   `dist/release/release-notes.md`: Generated changelog.
*   `dist/release/preflight.json`: Results of the preflight check.
*   `release-assets/evidence.tar.gz`: Contains SLSA provenance, SBOMs, and checksums.

## Runbook: Creating a Release

1.  **Prepare the Code:**
    *   Ensure `package.json` version is updated.
    *   Commit changes.

2.  **Push Tag (Dry Run):**
    *   `git tag v1.2.3`
    *   `git push origin v1.2.3`
    *   *Action:* Watch the "GA Release" workflow. It should pass and mark "Dry Run Summary".

3.  **Review Dry Run:**
    *   Check the "Dry Run Summary" in the Actions UI.
    *   Download `release-report.md` artifact if needed.

4.  **Publish (Real Release):**
    *   Go to Actions -> GA Release.
    *   Run workflow -> Select branch (tag) -> Set `dry_run: false`.
    *   *Action:* The workflow will publish the release to GitHub.

## Troubleshooting

### Ancestry Check Failed
*   **Error:** "Tag vX.Y.Z is not reachable from default branch..."
*   **Cause:** The tag was created on a commit that is not merged into `main` (for GA/RC) or the appropriate `release/X.Y` branch.
*   **Fix:** Merge the PR first, then tag the merge commit (or a commit reachable from it).

### Docker Rate Limiting
*   **Error:** "toomanyrequests: You have reached your pull rate limit."
*   **Cause:** Docker Hub limits unauthenticated pulls.
*   **Mitigation:** The workflow includes retry logic. If it persists, ensure the runner is using an authenticated context or a mirror.

### Freeze Window
*   **Error:** "Freeze window is active"
*   **Fix:** Wait for the window to close, or use `override_freeze: true` with a valid `override_reason`.
