# Experiment Capsules (VCEC Core)

Defines evaluator-runnable capsules that encapsulate workflows with deterministic replay, effect typing, and optional proprietary stubs.

## Capsule Structure

- **Interface contract**: operations exposed, required inputs, effect typing (READ/WRITE/EXPORT), endpoint allowlist.
- **Determinism manifest**: module versions, dataset snapshot identifier, random seed, policy profile, and egress budgets.
- **Witness chain**: hash-chain over inputs, intermediates, outputs, and policy decisions.
- **Conformance tests**: evaluator-facing tests validating capsule behavior and interface adherence.

## Execution Rules

- Enforce egress byte budgets and endpoint allowlists; halt on threshold breach and record in witness chain.
- Support counterfactual reruns under stricter disclosure policies with information-loss metrics.
- Cache capsule runs by hash; invalidate on module version change.

## Delivery Expectations

- Containerized with conformance tests and replay tokens.
- Supports proprietary stubs preserving interface behavior for evaluator runs.
- Emits transparency log digest per execution.
- Packaged via MC tool `package_experiment_capsule` (`integration/mc/tools/package_experiment_capsule.md`).
- Exposed via VCEC API outline (`integration/intelgraph/api/vcec_openapi.md`).
