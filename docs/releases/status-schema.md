# Release Status Schema

This document defines the schema for the `release-status.json` artifact generated during the release process.
This file serves as a machine-readable contract for release readiness.

## File Location
`dist/release/release-status.json`

## Schema

```json
{
  "tag": "v0.3.0-rc.1",
  "channel": "rc",
  "status": "ready | blocked",
  "blockedReasons": [
    {
      "code": "REASON_CODE",
      "message": "Human readable message",
      "details": { "key": "value" }
    }
  ],
  "checks": {
    "preflight": { "ok": true, "path": "dist/release/preflight.json" },
    "freeze":    { "ok": false, "path": "dist/release/freeze.json" },
    "verify":    { "ok": true, "path": "dist/release/verify.json" }
  },
  "artifactsDir": "dist/release",
  "run": {
    "id": 123,
    "url": "https://github.com/<repo>/actions/runs/<id>"
  },
  "generatedAt": "2026-01-04T19:00:00-07:00"
}
```

## Status Logic

- **ready**: All required checks are present and `ok: true`.
- **blocked**: One or more checks failed, are missing, or blocked logic (like freeze window) is active.

## Blocked Reason Codes

| Code | Description |
|Observed|Description|
|---|---|
| `PREFLIGHT_ANCESTRY` | Git history or branch ancestry check failed. |
| `VERSION_MISMATCH` | Package version does not match tag. |
| `FREEZE_WINDOW` | Deployment is blocked due to a freeze window (e.g. weekend). |
| `VERIFY_FAILED` | Verification step failed (tests, lint, etc). |
| `MISSING_ARTIFACTS` | Required artifacts (e.g. `verify.json`) are missing. |
| `SECURITY_GUARD` | Security scan or policy check failed. |
| `UNKNOWN` | An unexpected error occurred during status generation. |
