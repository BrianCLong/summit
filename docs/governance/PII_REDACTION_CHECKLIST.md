# PII Redaction Checklist (MVP-4-GA)

Use this checklist before shipping features that handle potentially sensitive data. Redaction must be enforced at the boundaries where data is emitted or persisted outside primary storage.

## Where to Redact

- **Application logs**
  - Strip or mask Restricted/Confidential fields before logging structured payloads.
  - Prefer request identifiers, tenant IDs, and coarse-grained state over user input or free-form text.
- **Provenance and audit payloads**
  - Remove or mask user identifiers, network metadata (IP/session), and message bodies unless explicitly allowlisted.
  - Store hashes or tokens instead of raw values when provenance integrity is required.
- **Error responses and exception payloads**
  - Avoid echoing user-supplied fields in errors; replace with opaque IDs and reference codes.
  - Ensure stack traces and debug dumps exclude query params, headers, and bodies containing PII.

## Implementation Steps

- Load the redaction allowlist/denylist config and reuse it in log/provenance utilities.
- Default to masking (`[REDACTED]`) any key found on the denylist unless it appears on the allowlist.
- Add a unit test for each new codepath that consumes the redaction config to prevent regressions.
- Document any temporary exceptions and add an expiry date for review.

## Validation

- Run automated tests (`pnpm test` in `server/`) to confirm the redaction config is loaded and enforced.
- Spot-check log/provenance samples in non-production environments to verify fields are masked per the denylist.
