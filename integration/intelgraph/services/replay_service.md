# Replay Service

## Responsibilities

- Recompute artifacts from snapshot IDs and replay tokens.
- Validate determinism tokens and commitments.

## Inputs

- `artifact_id`
- `replay_token`
- `snapshot_id`

## Outputs

- Recomputed artifact
- Determinism validation status

## Validation

Replay failures are logged and escalated to governance.
