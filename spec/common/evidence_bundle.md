# Evidence Capsule / Bundle

**Purpose:** Provide a portable, privacy-aware, verifiable evidence artifact that is safe to share
across services while preserving policy decisions, provenance, and auditability.

## Scope

- Encapsulates evidence references, redacted payloads, and policy decisions.
- Supports deterministic replay of downstream computations.
- Designed to be validated without accessing raw sources.

## Data Model (canonical JSON)

```json
{
  "bundle_id": "evb_01H...",
  "created_at": "2025-12-31T00:00:00Z",
  "producer": {
    "service": "intelgraph-evidence",
    "version": "1.3.0",
    "env": "prod"
  },
  "policy_tokens": ["pdt_..."],
  "provenance": [
    {
      "source_id": "osint:feed:example",
      "ingested_at": "2025-12-30T23:59:10Z",
      "chain_ref": "witness:session/abc123"
    }
  ],
  "items": [
    {
      "item_id": "ev_...",
      "pointer": {
        "uri": "ig://evidence/ev_...",
        "sha256": "..."
      },
      "redacted_bytes": "...base64...",
      "redaction_policy": "policy://redaction/v2",
      "sensitivity": "restricted",
      "labels": ["privacy:pii", "source:osint"]
    }
  ],
  "commitments": {
    "items_merkle_root": "...",
    "schema_version": "2025-12-01"
  },
  "determinism_token": "det_...",
  "signature": "sig_..."
}
```

## Required Fields

- `bundle_id`, `created_at`, `producer`, `items`, `policy_tokens`, `commitments`, `signature`.
- `determinism_token` is required when bundle drives replayable analytics.

## Validation Rules

1. Verify `signature` with the producing service public key.
2. Validate `policy_tokens` using `policy://` issuer keys.
3. Confirm each `pointer.sha256` matches resolved content (if access is permitted).
4. Validate `items_merkle_root` equals Merkle root of ordered `item_id` list.
5. Enforce redaction policy before any downstream use.

## Security & Compliance Notes

- **Policy-as-code**: access and transformations must be authorized via policy engine rules.
- **No unverified evidence**: evidence bundles must be verified before LLM usage.
- **Auditability**: store bundle hash and signature in the witness ledger.

## Example Use

- Attach evidence bundle to an attribution artifact or lifecycle update.
- Use `determinism_token` to recompute a metric without re-fetching raw evidence.
