# Runbook: Schema Migrations

## Overview

This runbook covers the process for safely applying and rolling back database schema migrations.

## Applying a Migration

1.  **Open a PR**: The new SQL migration script is added to the `migrations/` directory.
2.  **CI Gate**: The `migration-gate` step in the CI pipeline automatically runs.
    - It applies the migration to a staging environment.
    - It runs smoke tests and a dry-run of any data backfills.
3.  **Manual Approval**: If the gate passes, a database administrator must manually approve the PR with a `reason-for-access` comment.
4.  **Merge & Deploy**: Upon merge, the production deployment pipeline will apply the migration.

## Rolling Back a Migration

1.  **Identify Failure**: Canary analysis or SLO alerts will trigger a rollback of the application code.
2.  **Execute Revert Script**: Each migration `V_up.sql` must have a corresponding `V_down.sql`.
3.  **Run `just db-revert`**: An operator executes the `down` script to revert the schema change.
4.  **Verify Data Integrity**: Run post-rollback data integrity checks.
