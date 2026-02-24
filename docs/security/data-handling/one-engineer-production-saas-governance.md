# Data Handling: one-engineer-production-saas-governance

## PII Categories
- name
- email
- billing metadata

## Retention Policy
- 90 days for raw telemetry, 365 days for redacted evidence.

## Never-Log List
- access_tokens
- full payment card numbers
- raw auth headers

## Redaction Rules
- mask email local-part
- truncate token payload to first 6 characters

## Storage Classification
- CONFIDENTIAL
