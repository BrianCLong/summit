# Replay Service

## Purpose

Deterministically replays capsule outputs using snapshot + replay token.

## Responsibilities

- Validate replay token versions and schema compatibility.
- Recompute artifacts and verify commitments.
- Emit witness records for replay operations.

## Interfaces

- `POST /v1/replay` to run a replay.
- `GET /v1/replay/{id}` to retrieve replay status.
