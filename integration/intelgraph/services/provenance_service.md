# Provenance Service

## Responsibilities

- Store evidence identifiers and metadata for wedge artifacts.
- Issue immutable `snapshot_id` references for replay tokens.
- Provide evidence bundle retrieval for audit workflows.

## Inputs

- Evidence metadata: source, timestamp, hash, access scope.
- Artifact linkage requests: `artifact_id`, `evidence_ids[]`.

## Outputs

- `snapshot_id` for replay tokens.
- Evidence bundle reference for transparency log receipts.

## Policy Integration

- Enforce access scope policies for evidence retrieval.
- Log policy decisions for evidence access.
