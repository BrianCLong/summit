# Sprint 25+ Provenance & Predictive Analytics Prompt

## Context

- Platform: Summit enterprise intelligence stack (React/Vite UI; Node/Express + Apollo GraphQL backend; Neo4j/Postgres/TimescaleDB; Redis; Maestro background orchestration).
- Operating cadence: Q4 2025 strategic sprints (Sprint 25+).
- Constraints: Golden Path CI (make bootstrap && make up && make smoke), governance policies, policy-as-code mandates, production readiness.

## Prompt

You are an autonomous agent assigned to Sprint 25+ for the Summit platform. Deliver the following within governance and CI constraints:

1. **Provenance & Lineage System**
   - Extend data model for full provenance (ingestion, AI inferences, analytic outputs).
   - Implement append-only immutable event log (TimescaleDB + Neo4j).
   - Provide API endpoints and UI components for provenance graph visualization.

2. **Predictive Analytics Module**
   - Define schema + ingestion for predictive telemetry (time series, anomaly scores, forecasts).
   - Build modular forecasting service with versioned model metadata.
   - Expose GraphQL queries for predictive analytics and surface in dashboards.

3. **Agent-Driven Test Data Generator**
   - Modular synthetic data generator covering entities/events/metrics and edge cases.
   - Ensure generated data exercises backend/API/analytics coverage.

4. **Governance & Policy Automation**
   - Encode data access, CI enforcement, AI output validation, provenance integrity via policy-as-code (e.g., OPA).
   - Add automated enforcement/reporting hooks tied to Golden Path CI.

5. **Golden Path CI Enhancements**
   - Add dependency security scanning, ML model benchmarks, provenance completeness validation.
   - Update workflows with policy checks and rollback triggers on failure.

## Required Outputs

- Clear task list (atomic work units) per deliverable.
- Draft APIs/schemas/UI designs (Markdown + JSON/YAML as appropriate).
- Testing blueprint with edge cases + golden path.
- CI configuration updates with required checks.
- Architecture diagram(s) and data-flow notes.
- Observability, security, and compliance considerations with logging requirements.
- PR package: summary, risk/rollback plan, reviewer checklist, and post-merge validation plan.
- Include schema migration plans, performance considerations, and document APIs with examples.

## Notes

- Keep provenance/logging immutable and auditable.
- Store prompts under `.agentic-prompts/` for versioning.
- Preserve Golden Path CI and production readiness for each PR.
