# Cluster Witness Format (CIRW)

## Witness Schema

| Field                   | Type   | Description                                   |
| ----------------------- | ------ | --------------------------------------------- |
| `witness_id`            | string | Unique witness identifier.                    |
| `cluster_id`            | string | Referenced identity cluster.                  |
| `support_set`           | array  | Minimal evidence references (feature hashes). |
| `identifier_commitment` | string | Merkle root over salted identifier hashes.    |
| `confidence_interval`   | object | Bounds for membership probability.            |
| `policy_ref`            | string | Policy decision ID and rule digest.           |
| `proof_budget`          | object | Feature/time/byte constraints used.           |

## Production Rules

- Support set must be minimal under the proof budget.
- Identifier commitments must be salted and tenant-scoped.
- Any witness update emits a new ledger entry and transparency log record.
