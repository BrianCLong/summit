# Agent Benchmark Spine Standards

## Schema
The benchmark spine relies on deterministically verifiable inputs and outputs.
`SpineTask` describes the expected inputs.
`SpineResult` describes the scored, verifiable trace output.

## Deterministic Rules
* No wall-clock timestamps in deterministic files.
* Stable key ordering.
* Explicit schema versions MUST be provided and honored.

## Evidence ID Pattern
Evidence IDs are deterministically constructed to ensure trace stability:
`EVID:<suite>:<case>:<step>:<n>`

## Non-goals
* No external benchmark leaderboard.
* No live-model execution within the spine runner.
* No certification badges.
