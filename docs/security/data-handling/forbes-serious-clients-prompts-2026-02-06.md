# Data Handling — Forbes Serious Clients Prompts (2026-02-06)

## Classification
Inputs are potentially sensitive business data and must be handled as confidential.

## Never-Log List
Do not log or persist raw values for:
- Emails
- Phone numbers
- Addresses
- Client names
- Pricing sheets or explicit rates

## Redaction Policy
Artifacts must store only derived scores and redacted snippets.
- Emails → `[REDACTED_EMAIL]`
- Phone numbers → `[REDACTED_PHONE]`
- Addresses → `[REDACTED_ADDRESS]`
- Prices → `[REDACTED_PRICE]`

## Storage & Retention
- Artifacts are stored under `artifacts/serious_client_tone/`.
- Retain only deterministic outputs; inputs remain in fixtures or local workspaces.

## Access Controls
Treat artifacts as internal-only outputs; do not expose outside authorized teams.
