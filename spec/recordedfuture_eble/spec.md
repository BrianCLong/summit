# RecordedFuture-Zone EBLE Specification

Defines the Escrowed Benchmark Label Exchange for verifiable label sharing without revealing sensitive evidence.

## Objectives

- Allow evaluators to score using label manifests without accessing raw evidence.
- Preserve label integrity through hash commitments and Merkle proofs.
- Support measurable progress reporting across DARPA assessment cycles.

## Process

1. Ingest labels with provenance; normalize to canonical schema.
2. Generate label bundle with verification hashes and confidence intervals.
3. Build label manifest committing to bundle hash, label policy, replay token, and optional counterfactuals.
4. Store manifest hash in transparency log; cache by bundle hash for reuse.
5. Enable evaluator scoring using manifest and selective disclosure.

## Evaluator Integration

- API surface documented in `integration/intelgraph/api/eble_openapi.md`.
