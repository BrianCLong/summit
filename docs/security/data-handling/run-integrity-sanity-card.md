# Data Handling: Run Integrity Sanity Card

## Logging Policy
*   **ALLOWED**: Run IDs, Evidence IDs, SHA-256 Digests, Counts, Status codes.
*   **PROHIBITED**: Raw evidence payloads, PII, User tokens, Secrets.

## Artifact Handling
*   `report.json`: Contains structural metadata only. Safe for storage.
*   `evidence_delta.json`: Contains IDs and Digests. No content. Safe for storage.
*   `stamp.json`: Contains system metadata (hostname, workflow ID).

## Retention
Artifacts are retained according to the standard CI artifact retention policy (e.g., 90 days).
