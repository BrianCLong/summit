# Data Handling in Multi-Product Architecture

## Never-Log List
The following data types MUST NEVER be logged in plaintext:
- Authentication headers (Authorization, Bearer tokens)
- API keys (`X-API-Key`)
- Raw claim payloads (the text being verified)
- PII (emails, phone numbers, addresses)
- Passwords or secrets

## Redaction
- All loggers MUST use a central redaction helper from `api/platform_spine/redaction.py`.
- Redaction SHOULD use a placeholder like `[REDACTED]`.

## Retention
- **Week 1**: No persistence of raw claims by default.
- Hashes of claims (SHA-256) MAY be stored for verification tracking.
- Encrypted storage of claims is reserved for future implementation.

## Secure Claims Handling
- Claims MUST be hashed before storage.
- Verification requests MUST be linked to an organization via `organization_id`.
