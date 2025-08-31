### Runbook: RTBF Two-Phase Confirmation

**Objective:** To ensure the complete and audited removal of a data subject's information across all primary data stores.

**Trigger:** An RTBF request reaches the `completed` state in the queue.

**Phase 1: Verify Tombstoning**

This phase confirms that the automated RTBF worker has correctly marked all data for deletion.

1.  **Get Subject ID:** Identify the `subject_id` from the RTBF request.
2.  **Verify Postgres:**
    - Query primary application tables (e.g., `users`, `user_profiles`) for the `subject_id`.
    - **Expected:** The record should have a `status` of `tombstoned` or `pending_deletion`, and sensitive fields should be nulled out.
3.  **Verify Neo4j:**
    - Query the graph for nodes associated with the `subject_id`.
    - **Expected:** The primary node should have a `tombstoned: true` property and a `tombstonedAt` timestamp.
4.  **Verify S3 Artifacts:**
    - Check relevant S3 buckets for objects tagged with the `subject_id`.
    - **Expected:** Objects should be moved to a dedicated `deleted/` prefix and have a `tombstone: true` metadata tag.

**Phase 2: Confirm Deletion & Close**

This phase runs after the automated, asynchronous deletion jobs have completed (e.g., after a 7-day grace period).

1.  **Confirm Deletion:**
    - Re-run the verification queries from Phase 1.
    - **Expected:** All records and objects associated with the `subject_id` must now be permanently deleted (return 0 rows/objects).
2.  **Verify Audit Trail:**
    - Query the `audit_log` for the `rtbf_request_completed` event.
    - Confirm the `details` field contains the list of systems from which data was removed.
3.  **Verify Anchor:**
    - Confirm that the daily Merkle anchor was successfully created *after* the `rtbf_request_completed` audit event was logged.
4.  **Close Request:**
    - Mark the internal RTBF request and any associated support tickets as closed and fully completed.
