# Transparency Log

Transparency logs provide append-only, auditable records for artifacts and compliance decisions.

## Log Record Schema

| Field             | Type   | Description                                 |
| ----------------- | ------ | ------------------------------------------- |
| `log_id`          | string | Log entry identifier.                       |
| `artifact_id`     | string | Related commitment artifact.                |
| `event_type`      | string | `create`, `update`, `revoke`, `quarantine`. |
| `hash_chain_prev` | string | Previous log hash for chaining.             |
| `policy_ref`      | string | Policy decision ID and rule digest.         |
| `timestamp`       | string | RFC 3339 timestamp.                         |

## Retention and Access

- Append-only storage with periodic anchoring.
- Access controlled by tenant policy and federation tokens.
- Exported log segments include hash proofs for verification.

## Compliance Hooks

Any disclosure, quarantine, or kill-switch action must emit a transparency log entry referencing
its witness ledger entry and commitment envelope.
