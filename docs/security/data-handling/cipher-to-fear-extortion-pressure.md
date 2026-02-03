# Data Handling for Extortion Pressure Module

## Sensitivity Levels
- **Highly Sensitive (Tier 1)**: Raw ransom note text, leaked dataset names, credentials, victim PII.
- **Sensitive (Tier 2)**: Pressure scores, tactic classifications, leak site metadata.

## Retention Policy (Summit Original)
- Default retention for raw inputs: 30 days.
- Redacted artifacts (reports, scores) follow standard repository retention.

## Never-Log Fields
The following fields MUST NOT be written to logs or non-encrypted persistent storage:
- `raw_note_text`
- `leaked_credentials`
- `full_pii` (SSN, Phone numbers, personal addresses)
- `session_tokens`

## Redaction Requirements
- Ransom notes must be scanned for PII and redacted before being processed for scoring if stored.
- Leak site URLs should be stored as hashes where appropriate.
