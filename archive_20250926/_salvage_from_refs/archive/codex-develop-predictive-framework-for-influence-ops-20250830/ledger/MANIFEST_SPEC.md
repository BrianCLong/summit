# Evidence Manifest Schema v0.1

## Overview
The manifest captures immutable evidence records exported from the ledger. Each entry binds content to a hash and tracks the transform chain.

## Fields
| Field        | Type     | Description                                 |
|--------------|----------|---------------------------------------------|
| `evidence_id`| string   | Unique identifier for the evidence item.    |
| `hash`       | string   | SHA-256 digest of the content, hex-encoded. |
| `timestamp`  | RFC3339  | Time evidence was registered.               |
| `transforms` | array    | Ordered list of transformations applied.    |

### Transform
| Field       | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `op`        | string | Operation name (ingest, tag, export...). |
| `actor`     | string | User or system performing the operation. |
| `prev_hash` | string | Hash of previous transform in chain.     |

## Example
```json
{
  "evidence_id": "abc123",
  "hash": "b2f5ff47436671b6e533d8dc3614845d",
  "timestamp": "2025-01-01T00:00:00Z",
  "transforms": [
    {
      "op": "ingest",
      "actor": "connector:slack",
      "prev_hash": null
    }
  ]
}
```
