# PII Taxonomy

This document defines the categories of Personally Identifiable Information (PII) recognized and handled by the system for masking, redaction, and access control purposes.

## PII Categories:

- **EMAIL**: Email addresses (e.g., `john.doe@example.com`)
- **PHONE**: Phone numbers (e.g., `+1-555-123-4567`, `(555) 123-4567`)
- **NAME**: Full names of individuals (e.g., `John Doe`, `Jane Smith`)
- **ACCOUNT_ID**: Unique identifiers for user accounts (e.g., `user_12345`, `acc_abcde`)
- **ADDRESS**: Physical street addresses (e.g., `123 Main St, Anytown, USA`)
- **IP**: IP addresses (e.g., `192.168.1.1`, `2001:0db8:85a3:0000:0000:8a2e:0370:7334`)
- **GOV_ID**: Government-issued identification numbers (e.g., Social Security Number, Passport Number, Driver's License Number)
- **ACCESS_TOKEN**: Authentication tokens (e.g., JWTs, OAuth tokens)
- **API_KEY**: API keys for external services
- **PAYMENT_HINTS**: Partial payment information (e.g., last 4 digits of credit card, card type)

## Masking Policy:

By default, PII identified by these tags will be masked or redacted in logs, UI displays, and other system outputs unless explicitly authorized for privileged access with appropriate audit trails.
