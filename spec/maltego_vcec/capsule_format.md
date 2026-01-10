# Capsule Format

Defines the on-disk and in-container format for VCEC capsules.

## Components

- Interface contract describing operations, effect typing, inputs/outputs.
- Determinism manifest (seed, dataset snapshot ID, module versions, policy profile, egress budgets).
- Witness chain file capturing hash-chained execution artifacts.
- Conformance tests validating capsule behavior for evaluators.

## Constraints

- Endpoint allowlist enforced at runtime; egress capped with recorded receipts.
- Proprietary stubs may replace sensitive modules but must preserve interface fidelity.
