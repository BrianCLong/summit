# Rollback Playbook

## Overview

This playbook defines the procedure for reverting a failed deployment to the last known good state.

## Triggers

Initiate rollback if:

- Error rate > 1% for 5 minutes.
- P95 Latency > 2s.
- Critical functionality (Login, Data Ingestion) is broken.

## Rollback Procedure

1.  **Revert Application**:
    - `helm rollback summit`
    - Verify previous version pods are running.

2.  **Revert Database (If Necessary)**:
    - **WARNING**: Only revert DB if the migration caused data corruption or incompatibility.
    - Identify the last migration batch.
    - `npm run migrate:down`
    - _Alternative_: Restore from pre-deploy backup if data is corrupted.

3.  **Verify Rollback**:
    - Run smoke tests on the reverted version.
    - Check metrics return to baseline.

4.  **Incident Report**:
    - Create a Post-Incident Review (PIR).
    - Preserve logs from the failed deployment for analysis.
