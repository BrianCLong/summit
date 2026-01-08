# ADR-015: Offline Case Pack Format

**Status**: Proposed
**Date**: 2024-07-22

## Context

The Summit platform requires a standardized, secure, and deterministic format for packaging intelligence case data for offline use. This "Case Pack" will enable field operators to securely transport and analyze case data without a live connection to the central server. The format must be verifiable, size-budgeted, and support selective synchronization of case objects.

## Decision

We will implement a directory-based Case Pack format with the following structure:

```
dist/casepacks/<caseId>_<rev>/
  manifest.json
  objects/
    <type>/<id>.json
  attachments/
    <sha256>.<ext>
  indexes/
    graph.json
  signatures/
    manifest.sig
    public-key.pem
  hashes/
    checksums.sha256
```

### `manifest.json` Schema

The `manifest.json` file is the source of truth for the pack's contents and metadata. It will adhere to the following JSON schema:

```json
{
  "pack_id": "uuid",
  "case_id": "uuid",
  "tenant_id": "uuid",
  "revision": 1,
  "created_at": "ISO8601_TIMESTAMP",
  "scope": {
    "selectors": [
      { "type": "entity", "ids": ["id1", "id2"] },
      { "type": "sighting", "time_range": ["start_date", "end_date"] }
    ]
  },
  "inventory": {
    "objects": [
      { "path": "objects/entity/id1.json", "sha256": "hash", "bytes": 1234 },
      { "path": "objects/sighting/id2.json", "sha256": "hash", "bytes": 5678 }
    ],
    "attachments": []
  },
  "budgets": {
    "total_bytes": 10485760,
    "max_objects": 1000
  },
  "actuals": {
    "total_bytes": 6912,
    "object_counts": {
      "entity": 1,
      "sighting": 1
    }
  },
  "provenance": {
    "git_sha": "commit_hash",
    "build_id": "ci_build_number"
  },
  "signature": {
    "algorithm": "SHA256withRSA",
    "key_id": "key_identifier",
    "canonicalization": "JCS"
  }
}
```

### Determinism and Canonicalization

To ensure that the manifest hash is stable and verifiable across platforms, the following rules will be enforced:

1.  **JSON Canonicalization**: The manifest will be canonicalized using the JSON Canonicalization Scheme (JCS, RFC 8785) before hashing and signing.
2.  **Stable Sorting**: All arrays within the manifest, including `inventory.objects`, must be sorted lexicographically by the `path` property.
3.  **Volatile Fields**: The `created_at` timestamp will be excluded from the canonicalized JSON before hashing.

## Consequences

- **Pros**:
  - Provides a clear, enforceable specification for offline data.
  - Enables secure and verifiable data exchange.
  - Aligns with the project's governance principles by documenting the design upfront.
- **Cons**:
  - Introduces a new format that must be maintained and versioned.
  - Requires careful implementation to ensure determinism.
