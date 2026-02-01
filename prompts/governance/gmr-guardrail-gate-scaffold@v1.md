# GMR Guardrail Gate Scaffold Prompt (v1)

## Objective

Implement GA-grade guardrails for CDC→Graph materialization using deterministic, windowed GMR metrics, evidence artifacts, and preflight/CI integration.

## Required Outputs

- Metrics DDL + rollup/baseline views.
- Gate query + deterministic evidence artifacts.
- Evaluation harness with fixed seeds and regression tests.
- Ops + security documentation, including MAESTRO layers.
- CI validation script for guardrail assets.

## Constraints

- Aggregates only; no CDC payloads.
- Tenant isolation enforced via RLS or equivalent.
- Deterministic evidence (no wall-clock timestamps).
- Conventional commits and GA governance updates.
