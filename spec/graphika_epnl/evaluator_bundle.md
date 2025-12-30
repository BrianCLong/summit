# EPNL Evaluator Bundle

The evaluator bundle enables DARPA-appointed evaluators to reproduce EPNL runs offline.

## Contents

- Containerized pipeline stages (ingestion, graph construction, scoring, reporting).
- Versioned interface definitions with compatibility rules.
- Determinism token (seed + dataset snapshot identifier) and compute budget.
- Replay manifest with Merkle commitments to artifacts.
- Synthetic test dataset and minimal schema for smoke tests.
- Stage-level logs and intermediate artifacts for peer review.

## Workflow

1. Import containers and lock interface versions from the bundle.
2. Execute the replay manifest to regenerate outputs.
3. Validate Merkle commitments against provided digests.
4. Run red-team hooks to evaluate robustness and record metrics.
