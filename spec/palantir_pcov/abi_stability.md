# ABI Stability

## Goals

- Preserve client compatibility across schema evolution.
- Ensure policy changes are versioned and replayable.

## Compatibility Rules

- Additive fields are allowed when default-safe.
- Breaking changes require a new ABI version.
- Deprecations must include migration guidance.

## Artifact Versioning

- ABI artifacts include `schema_version` and `policy_version`.
- Replay tokens reference ABI versions for deterministic replays.
