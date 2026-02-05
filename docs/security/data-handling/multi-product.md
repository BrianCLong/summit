# Data Handling: Multi-Product Platform

## Never-Log Policy
The following data types must NEVER be logged:
- Auth headers (Authorization, X-API-Key)
- Raw claim payloads (text, emails, keys)
- Passwords or secrets

## Redaction
Use the `api.platform_spine.redaction` utility to sanitize logs and error messages.
