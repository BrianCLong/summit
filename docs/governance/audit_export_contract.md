> Owner: @summit/governance
> Last-Reviewed: 2026-02-25
> Evidence-IDs: EVD-PLACEHOLDER
> Status: active


## Never-Log Fields
The following fields must NEVER be exported or logged in raw form:
- Passwords
- MFA Codes
- Raw Session Tokens
- Unhashed PII (unless explicitly required and encrypted)

## Export Requirements
- All exports must include a `stamp.json` for determinism.
- All exports must be validated against the official schemas.
