# Codex Task: Cost Telemetry and Budget Enforcement

**Priority:** P1  
**Labels:** `codex`, `cost-control`, `observability`, `ga`

## Desired Outcome

Runtime and CI expose cost metrics, enforce budget thresholds, and surface run-level cost summaries.

## Workstreams

- Add cost metrics endpoint for agent/runtime spend telemetry.
- Log per-agent cost per run.
- Include cost summary in run report artifacts.
- Add CI threshold checks with budget breach alerts.

## Key Deliverables

- Cost metrics endpoint contract and implementation.
- Run report cost summary section with per-agent totals.
- Budget guard workflow with failure and alert behavior.

## Acceptance Criteria

- Cost metrics are queryable via endpoint.
- Run summaries include per-agent and total cost views.
- Budget breaches trigger alerts and CI failure by policy.
