# License Receipts (SATT)

## Receipt Schema

| Field              | Type   | Description                               |
| ------------------ | ------ | ----------------------------------------- |
| `receipt_id`       | string | License receipt identifier.               |
| `template_id`      | string | Transform template reference.             |
| `measurement_hash` | string | Template measurement hash.                |
| `tenant_id`        | string | Tenant identifier.                        |
| `usage`            | object | Consumption metrics (count, time, bytes). |
| `policy_ref`       | string | Policy decision ID and rule digest.       |
| `created_at`       | string | RFC 3339 timestamp.                       |

## Storage

- Receipts stored in append-only ledger with hash chaining.
- Receipt exports include hash proofs for verification.
