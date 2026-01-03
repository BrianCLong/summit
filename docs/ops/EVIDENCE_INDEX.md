# Ops Evidence Index

This index tracks Ops Evidence Pack artifacts per release/tag to ensure audit-trail continuity.

## Schema

Each entry in the index (`EVIDENCE_INDEX.json`) adheres to the following schema:

```json
{
  "release_tag": "string (e.g., v1.0.0)",
  "commit_sha": "string (full SHA)",
  "generated_at_utc": "string (ISO8601, e.g., 2023-10-27T10:00:00Z)",
  "evidence_pack_artifact": {
    "type": "workflow_artifact" | "release_asset" | "external_storage",
    "identifier": "string (run URL or release asset name; NO SECRETS)"
  },
  "verification_status": "pass" | "fail" | "partial",
  "notes": "string (optional, short)",
  "verifier_versions": {
    "node": "string (optional)",
    "pnpm": "string (optional)",
    "promtool": "string (optional)"
  }
}
```

## Retention Guidance

*   Keep entries for all major and minor releases.
*   Patch releases can be rotated after 1 year if verified status is "pass".
*   Failed verifications must be kept indefinitely for audit purposes.

## Evidence Index

| Date (UTC) | Release/Tag | Commit | Status | Artifact Reference | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
