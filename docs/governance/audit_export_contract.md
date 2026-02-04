# Audit Export Contract

## Overview
This document defines the contract for exporting audit and evidence data to external systems.

## Data Classification
- **Level 1 (Public)**: Documentation, schemas, public threat intel.
- **Level 2 (Internal)**: Detection rules, metrics, non-PII telemetry.
- **Level 3 (Restricted)**: PII, session tokens, raw logs (must be redacted).

## Never-Log Fields
The following fields must NEVER be exported or logged in raw form:
- Passwords
- MFA Codes
- Raw Session Tokens
- Unhashed PII (unless explicitly required and encrypted)

## Export Requirements
- All exports must include a `stamp.json` for determinism.
- All exports must be validated against the official schemas.
