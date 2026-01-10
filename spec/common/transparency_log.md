# Transparency Log

Transparency logs provide append-only records for artifact commitments, attestation envelopes,
revision history, and verification status.

## Log Records

- **record_id:** monotonically increasing sequence or ULID.
- **artifact_type:** role_certificate, attribution_artifact, test_report, inversion_artifact,
  shard_manifest.
- **commitment_root:** Merkle root of referenced identifiers.
- **attestation_ref:** pointer to attestation envelope.
- **replay_token:** canonical replay token digest.

## Append-Only Guarantees

- Log entries are chained via `prev_hash` to prevent deletion or reordering.
- Periodic snapshots are anchored to an external timestamp service.

## Query Patterns

- Fetch by artifact type + replay token.
- Verify commitment roots for a given audit window.

## Operational Controls

- Alert on missing or duplicate record IDs.
- Enforce retention policy for regulatory review windows.
