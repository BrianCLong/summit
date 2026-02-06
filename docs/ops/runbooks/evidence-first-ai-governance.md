# Runbook: Evidence-First AI Governance

## Purpose

Operate the evidence ledger and audit bundle export in a deterministic, auditable way.

## Enablement

- Set `GOVERNANCE_EVENTS=1` to emit governance events.
- Logging-only mode is default; enforcement remains feature-flagged.

## Evidence Storage

- Runtime events written to the governance ledger.
- Audit bundles exported to a target directory (JSON/NDJSON).

## Generate an Audit Pack

1. Choose run ID.
2. Run `pnpm run governance:audit-bundle -- --run-id <id> --out <dir>`.
3. Verify outputs: `bundle.json`, `events.ndjson`, `policy_snapshot.json`, `redaction_report.json`.

## Rotation / Retention

- Retain evidence bundles per governance retention policy.
- Rotate storage based on incident and compliance windows.

## Incident Response

- If integrity check fails, quarantine bundle and re-export from ledger.
- If redaction regression is detected, halt export and update redaction rules.

## Drift Signals

- Drop in event coverage for agent runs.
- Missing policy snapshots in bundles.
- Redaction report growth beyond baseline.
