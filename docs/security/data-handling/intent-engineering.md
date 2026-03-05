# Intent Engineering Data Classification

**Policy Owner:** Security
**Scope:** Summit Intent Specifications, CI Artifacts, Agent Evaluations

## Rules

1. **Never Log Raw Prompts**: Full prompt contents MUST NEVER be written to long-term storage or standard output logs. Hash inputs only.
2. **Never Log Secret Tokens**: All token streams or secrets must be sanitized prior to reaching the intent validation pipeline.
3. **Intent IDs Only**: Store only hashed `intent_id` values in telemetry.
4. **Data Expiration**: Retain reports (e.g., `intent_report.json`, `metrics.json`) for ≤ 30 days (configurable).

## Subsystems

| Artifact | Classification | Purge Policy |
| --- | --- | --- |
| `intent_report.json` | Internal/Telemetry | 30 Days |
| `metrics.json` | Internal/Telemetry | 30 Days |
| `stamp.json` | Internal/Telemetry | 30 Days |
