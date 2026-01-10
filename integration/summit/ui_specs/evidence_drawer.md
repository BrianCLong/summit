# Evidence Drawer UI

## Purpose

Provide a consistent UI for viewing evidence bundles, redacted payloads, and policy decisions.

## Core Elements

- Evidence bundle ID, producer, created time.
- List of evidence items with redaction badges.
- Policy decision tokens with purpose/effects.
- Determinism token and witness chain link.

## Actions

- Verify bundle (calls `/v1/evidence/verify`).
- Export evidence capsule for audit.
- Copy witness chain session ID.
