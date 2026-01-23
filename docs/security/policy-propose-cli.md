# Policy Propose CLI

The `policy-propose` CLI is the operational interface for the Policy Auto-Tuning Engine. It consumes security evidence (JSON) and outputs PR-ready proposal artifacts.

## Usage

```bash
# Generate proposals from an evidence file
npx tsx server/src/scripts/policy-propose.ts --input fixtures/security-evidence.json --out .security/proposals/
```

## Input Format

The input file should be a JSON array of `SecurityEvidence` objects:

```json
[
  {
    "id": "ev-123",
    "type": "deny_spike",
    "timestamp": "2023-10-27T10:00:00Z",
    "source": "audit-log",
    "data": {
       "subject": { "id": "service-a" },
       "action": "write",
       "resource": "db-prod",
       "count": 100,
       "reason": "Insufficient permissions"
    }
  }
]
```

## Output Artifacts

For each generated proposal, a directory is created in the output path (e.g., `.security/proposals/<proposal-id>/`):

1.  **`proposal.json`**: The full machine-readable proposal object (see `docs/security/policy-change-proposals.md`).
2.  **`patch.diff`**: A unified diff representing the proposed changes.
3.  **`VERIFY.md`**: Instructions for verifying the fix.
4.  **`ROLLBACK.md`**: Instructions for reverting the change.

## Integration

This CLI is intended to be run:
*   **Locally** by security engineers investigating alerts.
*   **In CI/CD** (e.g., nightly) to batch process accumulated alerts and generate proposal artifacts for review.
