# Determinism Tokens

## Purpose

Determinism tokens ensure that probabilistic inference and optimization can be
replayed with identical inputs. Tokens bind artifacts to a reproducible snapshot.

## Token Fields

- `snapshot_id`: immutable data snapshot identifier.
- `seed`: RNG seed used for stochastic steps.
- `model_version`: version hash of diffusion or scoring model.
- `schema_version`: data schema version in effect.
- `policy_version`: policy-as-code version.
- `time_window`: input window or observation horizon.

## Replay Contract

A replay must:

1. Load the same `snapshot_id` and `schema_version`.
2. Initialize RNG using `seed`.
3. Use the identical model build (`model_version`).
4. Re-evaluate policy decisions with `policy_version`.
5. Produce the same commitments and receipts.

## Governance Requirements

- Token validation errors are treated as build-blocking defects.
- Tokens are stored alongside transparency log entries.
