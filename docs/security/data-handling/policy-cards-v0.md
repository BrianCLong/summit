# Data Handling: Policy Cards v0

## Data Classes
Policy Cards interact with the following data classes:
- **Policy Definitions**: Public/Internal. Defined in code/repo.
- **Evidence Artifacts**: Internal/Audit. Stored in `artifacts/policy/`.
- **Runtime Decisions**: Internal. Logged with Evidence ID.
- **Tool Inputs/Outputs**: Potentially Confidential/PII. Governed by `never_log` rules.

## Retention Defaults
- **Evidence Artifacts**: 90 days default.
- **Audit Logs**: 1 year (via standard logging pipeline).

## Audit Export
Policy enforcement generates standard JSON artifacts:
- `report.json`
- `metrics.json`
- `stamp.json`

These can be exported to JSONL for long-term storage or SIEM ingestion.

## Never-Log Fields
Policy Cards support a `never_log` field in the spec. The runtime scrubber MUST redact these fields from:
1.  Application logs.
2.  Evidence artifacts (inputs/outputs).
3.  Error messages.

**Default Forbidden Fields (Always Redacted):**
- `password`
- `token`
- `secret`
- `authorization`
- `api_key`

## Scrubbing Rules
- Exact match on key names.
- Regex match on values (e.g., matching standard key formats).

## Incident Response Hooks
- **Policy Violation**: Triggers `POLICY_VIOLATION` alert.
- **Bypass Attempt**: Triggers `SECURITY_INCIDENT` alert (High Severity).
