# Proprietary Stubs

Guidance for maintaining evaluator operability when proprietary elements are withheld.

## Requirements

- Stubs must implement full interface behavior and deterministic outputs for evaluator tests.
- Rights assertions must flag stubbed regions and permitted disclosure levels.
- Stubs should include synthetic data generators aligned to determinism tokens for replayability.

## Evaluation

- Conformance tests validate stub fidelity and policy-compliant redactions.
- Transparency logs should include markers indicating stub usage.
