# Acceptance Packs — Wishbook Extension

Structure
- fixtures/: golden inputs/outputs for APIs (prov-ledger, graph-xai, copilot)
- flows/: end‑to‑end scripts (ingest→resolve→runbook→report)
- conformance/: STIX/TAXII + MISP mapping tests

Scenarios
1) Export bundle manifest verify (prov-ledger)
2) XAI explanation visibility (rationale + counterfactual)
3) NL→Cypher preview with estimates; sandbox execute
4) GraphRAG citations resolve; missing citation blocks publish
5) Authority/license blocks with human‑readable reason and appeal path

Execution
- Unit: `npm test` in server/client
- Contract: run oas tests against `contracts/wishbook/*.openapi.yaml`
- E2E: Playwright flows (to be added) + k6 baseline load

