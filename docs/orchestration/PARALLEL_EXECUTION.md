# Parallel Execution Orchestration

## Purpose

The orchestration layer analyzes backlog signals, routes conflict-free work, and surfaces
parallel execution opportunities while honoring Summit governance, GA gates, and stabilization
controls.

## Connection to GA Gate Stabilization

- Routing plans are generated in plan-only mode and do not bypass GA gates.
- Tasks that intersect governance, security, or GA-critical modules are escalated to manual review
  or serialized before parallel execution.
- Outputs from `scripts/orchestration/parallel_task_router.mjs` are designed to feed into existing
  gate enforcement workflows without altering policy evaluation paths.

## Stabilization Retrospective & Roadmap Handoff

- Backlog analysis consumes `.agentic-tasks.yaml` and optional issue metadata to classify work
  into governance, feature, debt, docs, and test buckets.
- The classification output is an input to stabilization retrospectives, highlighting hotspots
  that should be addressed before adding concurrency.
- Roadmap handoff updates remain centralized in `docs/roadmap/STATUS.json` to preserve a single
  source of truth.

## External Review Pack Integration

- Governance or compliance-tagged tasks are marked as manual review and removed from parallel
  routing recommendations.
- The routing plan is intentionally constrained to produce evidence artifacts without directly
  modifying issues or branches unless policy enables those actions.

## Evidence Trail

- Backlog analysis: `artifacts/orchestration/backlog_analysis.json`
- Routing plan: `artifacts/orchestration/routing_plan.md`
- Velocity dashboard: `artifacts/orchestration/VELOCITY_DASHBOARD.md`
- File ownership map: `artifacts/orchestration/file_ownership_map.json`

## Policy Guardrails

The policy file `policies/orchestration_parallel.yml` controls whether routing is enabled, enforces
plan-only behavior, and defines excluded modules plus candidate labeling behavior.
