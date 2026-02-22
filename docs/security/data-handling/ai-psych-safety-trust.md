# AI Psych Safety Trust Pack Data Handling

## Data Classes

| Level | Description | Retention | Notes |
| --- | --- | --- | --- |
| Level 0 | Aggregated counts and scores | Allowed in CI and production | Safe to retain. |
| Level 1 | De-identified snippets | CI only | Remove after CI retention window. |
| Level 2 | Raw prompts or employee communications | Never log by default | Requires explicit opt-in and governance approval. |

## Never-Log List
- Full prompts containing customer data.
- Employee performance commentary.
- HR-sensitive retro notes.
- Raw chat transcripts containing personal identifiers.

## Retention Policy
- CI artifacts: retain 14–30 days (policy default).
- Production telemetry: Level 0 only unless explicit opt-in is approved.
- Level 1 artifacts must be deleted at CI retention expiration.

## Redaction Requirements
- Remove Level 2 fields before writing artifacts.
- Only allow Level 1 content in CI evidence bundles.
- Validate schemas to reject raw prompts and employee communications.

## Access Controls
- Limit artifact access to authorized engineering and governance roles.
- Log access to Level 1 artifacts in CI audit trails.

## Compliance Notes
- Regulatory logic must be expressed as policy-as-code.
- Any exception must be recorded as a Governed Exception with a rollback path.
