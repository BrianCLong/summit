# CADDS Data Handling & Retention

Reference: [Summit Readiness Assertion](../../SUMMIT_READINESS_ASSERTION.md).

## Classification

- **Public**: Source content is limited to public DIU and TWZ pages.

## Never-Log List

- Full raw HTML pages.
- Form fields or embedded request metadata.
- Any emails, phone numbers, or personal identifiers discovered in source pages.

## Retention Policy

- Store fixtures and derived, deterministic JSON artifacts only.
- Store source URL and content hash in `stamp.json`.
- Feature-flagged network fetching remains **OFF** by default (deferred pending CI policy validation).

## Governance Alignment

- Evidence IDs must remain stable and attributable to source snippets.
- Any exception is recorded as a **Governed Exception** with explicit traceability.
