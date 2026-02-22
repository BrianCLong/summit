# adenhq/hive subsumption claims

## Scope posture

This bundle captures the claims and guardrail requirements to subsume the adenhq/hive agent framework
as Summit capabilities without copying code. All implementation work remains clean-room and
policy-first and aligned with the Summit Readiness Assertion.

## Claims to validate (evidence-backed)

1. Goal-driven agent development can be represented as a deterministic GoalSpec → PlanSpec workflow
   with explicit constraints, tool allowlists, and budgets.
2. Adaptive self-improvement must be gated by a proposal → evaluate → approve → promote pipeline
   with evidence bundles for every step.
3. Dynamic connection synthesis requires a sandbox with deny-by-default network and filesystem
   access, plus deterministic replay fixtures.
4. Human-in-the-loop nodes and escalation controls remain the default for autonomous workflows;
   autonomous promotion is intentionally constrained.
5. Observability streams must emit structured run events without timestamps in deterministic logs;
   timestamps live only in evidence stamps.
6. Cost and budget governors enforce hard stops with reason codes and evidence records.
7. Tool packaging must honor explicit permission grants per goal and per tool server.

## Deferred pending verification

- Provider abstraction breadth and model degradation policies remain deferred pending validation
  against Summit provider contracts.
- Live observability streaming remains deferred pending alignment with Summit runtime event buses.

## MAESTRO alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt/tool injection, tool abuse, runaway spend, unsafe auto-mutation.
- **Mitigations**: deny-by-default allowlists, budget hard stops, sandboxed dynamic connections,
  approval-gated evolve promotions, evidence-first logging with deterministic replay.
