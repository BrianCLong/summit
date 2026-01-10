# Transparency Log Service

## Responsibilities

- Append receipts to an immutable, hash-chained ledger.
- Provide verification APIs for audit teams.

## Inputs

- Receipt entries with commitments and replay tokens.
- Attestation references (optional).

## Outputs

- `log_entry_id`
- Verification proofs for audit consumers.
