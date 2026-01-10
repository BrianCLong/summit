# OAMM Interface Policy

## Versioning and compatibility

- Interfaces are versioned with semantic rules and deprecation schedules.
- Compatibility matrices are provided for evaluator and partner systems.

## Boundaries

- Proprietary modules expose only interface stubs with evaluator simulation harnesses.
- Open insertion points include plug-in ABIs for analytics, transforms, and policy checks.

## Enforcement

- Runtime requests must traverse versioned adapters; witness chains log interface versions.
- Latency budgets are recorded per interface for operational scenarios.
