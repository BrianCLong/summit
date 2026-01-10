# Kill Switch & Audit (QSDR)

## Trigger Conditions

- Canary target triggers.
- Query-shape violations.
- Rate-limit violations.

## Actions

1. Revoke module execution token.
2. Halt module execution and quarantine module.
3. Emit kill audit record with supporting evidence.
4. Log transparency event and compliance decision.

## Audit Record

- Commitment to evidence hashes.
- Policy decision ID and rule digest.
- Replay token for module version set and time window.
