# Runtime to CI Feedback Loop

Runtime signals reinforce governance by tightening CI, updating risk scores, and seeding backlog items when live conditions diverge from intent.

## Signal Types

- **Violation density**: Repeated denies/kill for a policy increase its risk weight.
- **New patterns**: Previously unseen reason codes create backlog tasks for triage.
- **Telemetry gaps**: Missing evidence triggers stricter CI checks for provenance coverage.
- **Response escalation**: Throttling saturation suggests performance tests or capacity work in CI.

## Flow

1. Runtime emits telemetry per `runtime/telemetry/schema.json` with correlation IDs.
2. `scripts/runtime/export-signals.ts` aggregates violations and pushes summaries to CI artifacts or risk stores.
3. CI pipeline ingests the export to adjust risk scores and enforce temporary stricter gates (e.g., require provenance tests).
4. Backlog generator consumes the same export to open tickets for recurring issues.

## Integration Points

- **CI**: Import exported JSON/NDJSON to set risk flags; conditionally enable stricter workflows.
- **Risk Engine**: Increase weights for policies with high deny rates or telemetry gaps.
- **Backlog**: Auto-create tasks for new violation patterns and throttling hotspots.
- **Audit**: Link evidence bundles to compliance packs for attestation.

## Operational Guardrails

- Exports are versioned and signed to prevent tampering.
- Failed exports raise alerts and block relaxation of CI checks.
- Exports avoid PII by using redacted context fields only.
