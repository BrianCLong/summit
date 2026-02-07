# Leadership Drift Data Handling

## Purpose

This policy defines the data classification, retention, and redaction rules for
Leadership Drift DecisionRecords and metrics.

## Classification

- **DecisionRecord**: Internal governance data.
- **Metrics**: Internal operational telemetry.
- **Artifacts**: Internal evidence bundle outputs.

## Never-Log List (Hard Block)

- Access tokens or secrets
- Raw prompt contents
- Customer identifiers or personal data
- Full payloads from external systems

## Context Summary Rules

- `context.summary` must be a short, sanitized description (<= 500 chars).
- Summaries may reference IDs/URLs, not full payloads.
- `context.assumptions[]` and `context.risks[]` must each be <= 200 chars.

## Redaction Requirements

- Redact tokens and secrets at capture time.
- Replace any detected identifiers with a stable placeholder.
- Store DecisionRecords as structured JSON only.

## Retention

- Artifacts: retained per evidence policy; no wall-clock timestamps in files.
- Logs: follow the shortest applicable retention policy for internal governance data.

## Enforcement

- CI policy tests validate redaction and size limits.
- Runtime gate blocks DecisionRecords with never-log violations when in **DENY** mode.
