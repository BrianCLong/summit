# E2E: Ingest to Report

## Scenario
Demonstrate ingest → resolve → runbook execution → report export with manifests and citations.

## Pre-reqs
- Connectors enabled with synthetic demo data (≥10 sources) and health checks green.
- OPA policy bundle loaded; cost guard budgets configured.
- Offline kit available for fallback.

## Steps
1. Ingest demo indicators; confirm connector outputs include transform hashes and provenance IDs.
2. Run NL→Cypher preview for hypothesis query; ensure syntactic validity ≥95% sample and sandbox approval.
3. Navigate tri-pane UI; capture screenshot of "Explain this view" overlay with top 3 rationale paths and citations.
4. Execute runbook R1, R2, R3, and R9 branches as applicable; log KPIs and failure modes encountered.
5. Export selective disclosure bundle with manifest wallet; verify using verifier CLI and attach to ticket.

## Checkpoints
- Screenshots: tri-pane overlay, policy deny reason, appeal flow, export confirmation.
- Metrics: p95 latency, GraphRAG overhead (<200ms median), cost guard blocks.
- Audit: hash-chain continuity validated post-run.
