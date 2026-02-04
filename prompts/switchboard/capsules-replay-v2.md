# Switchboard Capsules + Replay (V2)

## Mission

Deliver the Switchboard V2 capability for task capsules and replayable runs. Implement a capsule
manifest, policy-gated execution, hash-chained ledger, evidence bundling, and deterministic replay
support in the CLI with tests and documentation.

## Scope

- CLI implementation in `cli/` (capsule runner, ledger, policy gate, replay, evidence).
- Documentation updates in `docs/` describing the capsule model and safety defaults.
- Demo capsule manifest under `.summit/`.
- Task spec stored under `agents/examples/`.
- Roadmap status update in `docs/roadmap/STATUS.json`.

## Constraints

- Default-safe posture: network OFF and secrets OFF unless policy allows.
- Every exec and file write must be logged to the capsule ledger.
- Minimal dependencies; reuse existing tooling.
- Tests required: hash-chain integrity unit test + replay integration test.

## Deliverables

1. Capsule manifest schema + runner with isolated workspace snapshot.
2. Policy gate for exec/write/network/secret checks with waiver tokens.
3. Append-only JSONL ledger with hash chaining.
4. Evidence bundle generator.
5. Replay command and report.

## Verification

- Jest unit + integration tests covering ledger and replay.
- Documented CLI usage examples.
