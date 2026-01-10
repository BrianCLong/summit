# Replay Service

## Responsibility

- Execute deterministic replays for artifacts using replay tokens.
- Cache replay results keyed by replay token digest.

## Inputs

- Artifact identifier.
- Replay token.
- Optional overrides (budget, execution caps).

## Outputs

- Replay status (success, mismatch, timeout).
- Replay result artifact or mismatch report.

## Observability

- Metrics: `replay.request.count`, `replay.mismatch.count`.
- Traces: include artifact type and replay token digest.
