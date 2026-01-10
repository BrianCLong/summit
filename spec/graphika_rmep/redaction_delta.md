# Redaction Delta

## Purpose

Captures the differences between two scope variants to enable audit and authorized reconstruction.

## Required Fields

- `delta_id`
- `from_scope`
- `to_scope`
- `redacted_fields`
- `hash`

## Security

- Delta must be protected and only accessible with authorization.
- Hash included in the pack manifest.
