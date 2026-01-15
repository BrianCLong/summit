# Release Evidence Schema

This document defines the schema for release evidence files used to gate the release process.
Evidence files must be located in `release-evidence/<TAG>.json` on the default branch (`main`).

## Schema

```json
{
  "tag": "v0.3.0",
  "sha": "abc123...",
  "decision": "GO",
  "reasons": [],
  "run": { "id": 123, "url": "..." },
  "generatedAt": "2026-01-04T19:00:00-07:00",
  "expiresAt": "2026-01-05T19:00:00-07:00"
}
```

## Fields

*   `tag` (string, required): The git tag being released.
*   `sha` (string, required): The full git commit SHA of the tag.
*   `decision` (string, required): Must be "GO" for the release to proceed.
*   `reasons` (array of strings, optional): List of reasons or checks that passed.
*   `run` (object, optional): Information about the Maestro run that generated this evidence.
    *   `id` (string|number): Run ID.
    *   `url` (string): Link to the run logs/output.
*   `generatedAt` (string, required): ISO 8601 timestamp of generation.
*   `expiresAt` (string, optional): ISO 8601 timestamp when this evidence expires (typically 24h).

## Validation Rules

1.  **Existence**: File must exist at `release-evidence/<tag>.json`.
2.  **Decision**: `decision` must be strictly "GO".
3.  **Tag Match**: `tag` in JSON must match the tag being pushed.
4.  **SHA Match**: `sha` in JSON must match the commit SHA of the tag.
5.  **Freshness**: `expiresAt` must be in the future (if present), OR `generatedAt` must be within the last 24 hours.
