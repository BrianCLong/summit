# Maltego-Zone VCEC Specification

Defines verifiable, composable experiment capsules for evaluator-runnable workflows.

## Objectives

- Package workflows into capsules with deterministic replay and proof-carrying execution.
- Support proprietary stubs while preserving evaluator operability.
- Provide witness chains and replay tokens for audit-ready artifacts.

## Capsule Flow

1. Receive workflow graph; compile into executable capsule with interface contract and determinism manifest.
2. Execute under egress and endpoint constraints; record witness chain.
3. Emit outputs with replay token, witness chain, and transparency digest.
4. Provide counterfactual runs under stricter disclosure for information-loss metrics.

## Evaluator Integration

- API surface documented in `integration/intelgraph/api/vcec_openapi.md`.
- Capsule packaging tool in `integration/mc/tools/package_experiment_capsule.md`.
