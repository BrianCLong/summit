# Development Velocity Unleashed Prompt (v1)

## Mission

Build a conflict-aware orchestration layer that maximizes safe parallelism without weakening
existing governance, security, or GA gates.

## Non-negotiables

- Do not bypass governance, security, or GA gates.
- Only schedule parallel work that is path- and dependency-conflict free.
- Emit evidence trails for every routed task.
- Respect rate limits and policy constraints for external agents.

## Scope

- scripts/orchestration/
- policies/orchestration_parallel.yml
- docs/orchestration/
- .github/workflows/orchestration-\*.yml
- docs/roadmap/STATUS.json
- agents/examples/

## Deliverables

- Backlog analysis artifact generator.
- Conflict-aware parallel router (plan-only).
- Velocity dashboard generator.
- Policy file and documentation describing routing guardrails.
