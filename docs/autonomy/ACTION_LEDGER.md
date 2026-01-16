# Autonomy Action Ledger

The Action Ledger is the single source of truth for all autonomous actions. It provides an append-only, auditable log of what the system did, why, and what the outcome was.

## Structure

The ledger is stored as JSON files in `artifacts/autonomy/ledger/`. Daily or release-based aggregation is recommended.

## Fields

*   `action_id`: Unique UUID for the action.
*   `trigger_id`: ID of the signal/anomaly that triggered this.
*   `inputs_hash`: Hash of the input data (anomaly report, policy).
*   `policy_hash`: Hash of the policy active at the time.
*   `actor`: The agent identity (e.g., `autonomy-bot`).
*   `action_type`: `create_issue`, `open_pr`, etc.
*   `outcome`: `success`, `failure`, `skipped`.
*   `artifacts`: Links to created artifacts (issue URL, PR URL).
*   `timestamp`: ISO8601 timestamp.

## Integrity

The ledger should be content-addressed or signed to prevent tampering (future scope). For now, it relies on Git history and CI artifact storage.
