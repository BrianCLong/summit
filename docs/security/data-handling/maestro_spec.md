
# Data Handling: Maestro Spec Interview

This document defines the data classification and retention rules for Maestro Spec Interview artifacts.

## Data Classification

- **Interview Transcripts**: Confidential
- **Spec Bundle**: Internal
- **Requirement IDs**: Public (within repo)

## Never-Log List

The following data must never be logged or stored in cleartext:

- API keys
- Access tokens
- Secrets
- User private notes (unless explicitly part of the spec)

## PII Handling

Ensure all PII is redacted from specs before commit. Use `PIIRedactor` if necessary.
