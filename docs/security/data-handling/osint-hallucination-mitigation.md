# OSINT Hallucination Mitigation Data Handling

## Scope

Applies to OSINT collection, retrieval, summarization, and verification artifacts.

## Never-Log List

Never log or persist the following without explicit approval and redaction:

- Auth tokens, session cookies, API keys
- Private keys or signing materials
- Emails or phone numbers unless explicitly required and redacted

## Retention

- Raw pages and blobs: short-lived retention, delete after extraction and
  verification windows close.
- Extracted facts: longer-lived retention to preserve auditability.

## Determinism Rules

- Deterministic artifacts must not embed wall-clock timestamps.
- `collected_at` is permitted in provenance fields but stored outside
  deterministic bundles when possible.

## Verification Requirements

- Missing provenance must downgrade facts to `unknown`.
- Unsupported narrative claims trigger `needs_human_review`.
