# Data Consistency Digests: Data Handling Rules

## Never Log
- Raw row or node data.
- Connection strings or credentials.
- PII or sensitive identifiers in plain text.

## Evidence Artifact Rules
- `evidence_delta.json` contains digests and minimal delta metadata only.
- If IDs are ever included, they must be hashed or explicitly classified as non-sensitive.

## Retention
- Evidence artifacts follow standard evidence retention and attestation policies.
- Runtime metadata, if captured, must live in `stamp.json` and remain separate from deterministic
  evidence outputs.
