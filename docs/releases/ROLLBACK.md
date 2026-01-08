# Release Rollback Runbook

This document provides a runbook for rolling back a release in the event of a critical issue.

## A. Deployment Rollback Procedure

### 1. Identify Currently Deployed Version

- **Action:** Check the version identifier in the deployment environment.
- **Command:** `kubectl describe deployment <deployment-name> | grep Image`
- **Expected Outcome:** The image tag of the currently deployed version is identified.

### 2. Redeploy Previous RC/GA

- **Action:** Identify the previous stable release tag from the Git repository.
- **Command:** `git tag --list "v*.*.*" | sort -V | tail -n 2 | head -n 1`
- **Action:** Redeploy the previous version using the identified tag.
- **Command:** `helm rollback <release-name> <revision-number>`

### 3. Validate Rollback Success

- **Action:** Perform smoke tests to validate the functionality of the rolled-back version.
- **Command:** `make smoke`
- **Expected Outcome:** All smoke tests pass, and the system is stable.

## B. Data Safety Posture

### 1. Migration Reversibility

- **Status:** All database migrations are designed to be reversible.
- **Procedure:** To reverse a migration, run the corresponding `down` migration script.
- **Command:** `npm run migrate:down`

### 2. Non-Reversible Migrations

- **Waiver:** No non-reversible migrations are included in this release. If a non-reversible migration is required, an explicit waiver must be obtained from the engineering leadership and documented here.

### 3. Backup and Restore

- **Backup Policy:** Automated daily backups of the production database are stored in a secure, access-controlled location.
- **Restore Procedure:** Refer to the "Database Backup and Restore" runbook for detailed instructions on restoring from a backup.

## C. Minimum "Rollback Drill" Artifact

- **Template:** A template for planning and documenting rollback drills is available at `docs/releases/rollback-drills/ROLLBACK_DRILL_TEMPLATE.md`.
- **Expectation:** After each release cut, a drill should be scheduled and recorded.

## D. Last-Known-Good Reference

- **Policy:** The "last known good" (LKG) tag is the most recent tag with the `rc-` or `ga-` prefix that has passed all quality gates.
- **Identification:** The LKG tag can be identified by searching the Git history for the most recent successful release workflow.
