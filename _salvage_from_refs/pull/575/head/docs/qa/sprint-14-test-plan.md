# Sprint 14 Test Plan

## Connector Fixtures
- Replay recorded TAXII, MISP, and VirusTotal responses from `server/tests/fixtures`.

## Rate Limit Tests
- Simulate per-tenant quotas in ConnectorSDK and verify limiter blocks excess calls.

## Rules Dry-Run
- Ensure rules with `dryRun` flag do not create alerts.

## Alert Dedupe
- Trigger same rule twice and confirm second alert is suppressed by `dedupeKey`.

