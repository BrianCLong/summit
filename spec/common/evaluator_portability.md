# Evaluator Portability and Reproducibility

This document defines how evaluator kits are packaged so third-party evaluators can reproduce results without access to internal systems.

## Containerized evaluator kit

- Ship the complete pipeline as containers with frozen dependency manifests.
- Include deterministic seeds and dataset snapshot identifiers as determinism tokens.

## Interface freezing

- Expose each stage through versioned interfaces documented with OpenAPI or protobuf.
- Lock interface versions within an evaluator bundle to prevent drift during evaluation cycles.

## Replay manifests

- Generate replay manifests describing inputs, seeds, policy toggles, and expected outputs.
- Store cryptographic commitments (Merkle roots) to bind manifests to artifacts.

## Red-team hooks

- Provide hooks for adversarial perturbations and capture robustness metrics in evaluator reports.

## Evidence for peer review

- Include stage-level logs, intermediate artifacts, and minimal synthetic datasets for smoke tests.
- Attach transparency-log entries proving bundle integrity and publication time.
