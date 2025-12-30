# Verify-First Guardrail

All tool invocations must perform policy gateway validation and attestation checks before execution.

## Enforcement
- Validate replay tokens and scope attributes.
- Confirm attestation requirements and refuse execution if quotes are required but unavailable.
- Record validation outcome in receipt ledger preface entry.
