# Proof-First Core GA Sprint Plan

## Sprint Overview
- **Name:** Proof-First Core GA
- **Duration:** 2 weeks
- **Goal:** Deliver a verifiable vertical slice that covers provenance and claim ledger (beta), NL-to-Cypher copilot, entity resolution service stub, SLO and cost guard instrumentation, and the tri-pane UI integration to establish repeatable acceptance packs for the GA roadmap.
- **Non-goals:** Federated multi-graph search, advanced simulations, end-to-end Graph-XAI fairness and robustness work beyond scaffolding.

## Success Criteria
- External verifier accepts an export manifest produced by the provenance ledger using golden fixtures.
- Natural language to Cypher pipeline achieves ≥95% syntactic validity on the regression corpus and supports sandbox execution with undo.
- Entity resolution service exposes `/er/candidates`, `/er/merge`, `/er/explain` with reversible merges, labeled policies, and explainability payloads that pass golden fixtures.
- Observability stack surfaces p95 graph query latency < 1.5s on seeded workloads and Cost Guard terminates pathological queries with alerting.
- Tri-pane UI (graph, map, timeline) ships provenance-aware tooltips, synchronized brushing, "Explain this view" overlays, and demonstrates improved time-to-path discovery versus baseline benchmarks.

## Backlog (MoSCoW)
### Must Have
1. **Provenance & Claim Ledger (beta)**
   - Register evidence, parse claims, and export hash manifest representing a Merkle tree of transforms.
   - Provide external verifier CLI that validates manifests on fixtures and surfaces license-based export blocks with human readable reasons.
2. **NL→Cypher Copilot**
   - Prompt-to-Cypher generation with preview, cost and row estimates, sandbox execution, and undo/redo history.
   - Ensure ≥95% syntactic validity on the canonical test corpus and support citation display for RAG-backed responses.
3. **Entity Resolution Service v0**
   - Implement blocking strategy with pairwise scoring, `/er/candidates`, `/er/merge`, `/er/explain` endpoints, reversible merges, and policy labels.
   - Maintain golden fixtures and audit logging that records user and rationale for overrides.
4. **Ops Guardrails**
   - Instrument OTEL traces and Prometheus metrics for graph query latency, queue depth, and Cost Guard actions.
   - Deliver dashboards for p95 query latency, Cost Guard actions, and query error rate alongside a slow-query killer and budget toggles.
5. **Tri-pane UI Integration**
   - Synchronize graph/map/timeline views, include provenance tooltips, confidence-driven opacity, saved view seeds, and "Explain this view" overlays that surface evidence maps and policy bindings.

### Should Have
- **Policy Guardrails (OPA/ABAC)**
  - Enforce license and authority bindings for queries and exports, expose simulation (dry-run) endpoints, and ensure blocked actions surface appeal paths.
- **Connector Golden Paths**
  - Ship RSS/EDGAR (OSINT), STIX/TAXII (CTI), and CSV ingest connectors with manifests, mapping tests, rate limit policies, and sample datasets.

### Could Have
- **Predictive Suite Stub**
  - Provide a timeline forecasting API with synthetic confidence bands and placeholder XAI overlays connected to nodes and edges.

### Will Not Have (This Sprint)
- Federated multi-graph search.
- Advanced deception lab scenarios.
- Full production Graph-XAI fairness and robustness dashboards.

## Definition of Ready
- Acceptance tests and fixtures enumerated for each backlog item.
- Policy bindings and authority models documented with rollback plans.
- Align each deliverable to reusable acceptance patterns (ER explainability, policy-by-default, provenance integrity).

## Definition of Done
- CI green with unit, contract, and acceptance packs.
- UI screenshot diffs captured for explainability flows.
- External verifier artifacts attached to the sprint deliverable bundle.
- SLO dashboards published with at least one recorded incident drill.
- Audit logs populated for merges, policy decisions, and export events.

## Quality, Observability, and Security
- OpenTelemetry traces and Prometheus metrics wired into every service.
- Cost Guard exposes budget decisions, kill actions, and alert streams.
- ABAC/OPA policies enforced with step-up WebAuthn for export actions and license/authority compiler paths.
- UX checks ensure reduced time-to-first insight and zero uncited assertions in UI or copilot outputs.

## Risks and Mitigations
- **Query planner regressions** risk breaching SLOs → run k6 load tests and fall back to slow-query killer.
- **Entity resolution false merges** → include human-in-the-loop adjudication, reversible merges, and confidence decay strategies.
- **Provenance manifest drift** → enforce external verifier in CI and raise tamper alarms on mismatches.

## DevEx and Operations Notes
- Maintain trunk-based flow with feature branches landing through PRs that attach acceptance evidence.
- CI must run lint, unit, contract, acceptance, and attach `prov-verify` logs plus UI screenshots.
- Chaos scenario: terminate a query copilot pod under load and confirm SLO dashboards plus alerts remain within tolerance.

## Connector Golden Path Deliverables
- `connectors/rss_news/manifest.yaml` with mapping tests and rate limiting.
- `connectors/stix_taxii/manifest.yaml` converting indicators to canonical entities/edges.
- `connectors/csv_ingest/manifest.yaml` with schema mapping, PII flags, and sample dataset coverage.

## Codex Squad Prompt
```
system: >
  You are the IntelGraph Core Engineering swarm. Build a verifiable vertical slice for the
  "Proof-First Core GA" sprint. Ship production-grade TypeScript/Go services, GraphQL gateway,
  React+TS+Tailwind UI, Helm charts, and golden acceptance packs. Optimize for clarity,
  auditability, and testability.

context:
  capability_refs:
    - Provenance & Claim Ledger (Prov-Ledger beta) with export manifest + external verifier.
    - NL→Cypher Copilot with sandbox execution, cost preview, undo/redo.
    - Entity Resolution (ER) v0: /er/candidates, /er/merge, /er/explain with explainability.
    - Ops: OTEL+Prom SLO dashboards, Cost Guard (budgeter + slow-query killer).
    - UI: tri-pane (graph/map/timeline) + "Explain this view" overlays and provenance tooltips.
  acceptance_patterns:
    - ER explainability, Policy-by-Default, Provenance Integrity, UI usability benchmarks.
  non_goals:
    - No federated multi-graph; no full Graph-XAI fairness dashboards this sprint.

architecture:
  languages: [typescript, go]
  services:
    prov-ledger:
      language: go
      endpoints:
        - POST /evidence/register
        - POST /claim/parse
        - GET  /export/manifest?caseId=...
      outputs: hash-manifest.json (Merkle tree of transforms, model+config checksums)
      cli_tools: [prov-verify] # replays on fixtures and verifies manifest
    er-service:
      language: go
      endpoints:
        - POST /er/candidates
        - POST /er/merge
        - GET  /er/explain?id=...
      algo: blocking (LSH/MinHash) + pairwise scoring; reversible merges; policy labels
      fixtures: er/golden/*.json
    query-copilot:
      language: typescript
      functions:
        - nl_to_cypher(prompt, schema) -> {cypher, cost_estimate}
        - sandbox_execute(cypher, tenant, policyCtx) -> result_preview
        - undo_redo_manager()
      tests: 95%-syntax-valid on corpus; diff vs. manual Cypher snapshots
    api-gateway:
      language: typescript
      stack: GraphQL (persisted queries, field-level authz, cost limits)
    cost-guard:
      language: go
      functions:
        - plan_budget(tenant, queryPlan) -> allowed|throttle|kill
        - kill_slow_query(queryId)
      metrics: budgets_exceeded, kills_total
  ui:
    app: apps/web
    features:
      - triPane: sync graph/map/timeline, saved views
      - explainView: evidence map + policy bindings; provenance tooltips; confidence opacity
    routes:
      - /case/:id/explore
    tests:
      - cypress: time_to_path_discovery_benchmark.spec.ts
      - screenshot_diffs: explain_view.spec.ts
  ops:
    tracing: opentelemetry auto-instrumentation
    metrics: prometheus /metrics exporters on each service
    dashboards:
      - SLO_p95_graph_latency
      - CostGuard_actions
      - Query_error_rate
    chaos:
      - scenario: kill query-copilot pod under load -> SLO holds; alerts fire

connectors_golden_path:
  targets:
    - rss_news: rate-limited pull, mapping manifest, golden IO tests
    - stix_taxii: pull indicators -> canonical entities/edges
    - csv_ingest: ingest-wizard mapping with PII flags (no biometric IDs)
  deliverables:
    - connectors/<name>/manifest.yaml
    - tests/golden/<name>_io.test.ts

security_and_policy:
  auth: OIDC + WebAuthn step-up for export actions
  policy:
    - compile license/authority to query bytecode; simulate changes (dry run endpoint)
  export_blockers:
    - on block, return {reason, license_clause, owner, appeal_path}

acceptance_criteria:
  prov_ledger:
    - "prov-verify fixtures/case-demo" exits 0; tamper -> nonzero with diff report
  nl_to_cypher:
    - "npm test -- nl2cypher.spec.ts" reports >= 95% syntactic validity
    - sandbox_execute supports undo/redo; cost_estimate displayed prior to run
  er_service:
    - golden merges reproduce; /er/explain returns features and rationale JSON
    - merges reversible; audit log has user+reason
  ops_slo_cost:
    - k6 load test shows p95<1.5s at N=3 hops 50k nodes (seeded)
    - cost guard kills synthetic hog; alert + dashboard event visible
  ui_tripane_explain:
    - user journey benchmark reduces time_to_path vs. baseline by target threshold
    - "Explain this view" lists evidence nodes + policy bindings; no uncited assertions

dev_experience:
  ci:
    - run unit, contract, and acceptance packs on PR
    - attach prov-verify logs and UI screenshot diffs to artifacts
  branching:
    - trunk-based; feature branches -> PR with acceptance evidence attached
  style:
    - strict TS/Go linters; GraphQL persisted queries; zero any-cast

fixtures_and_data:
  seed_graph: scripts/seed/demo-campaign.graph.json
  er_golden: er/golden/*.json
  nl2cypher_corpus: tests/corpus/*.yaml (prompt -> expected Cypher patterns)

deliverables:
  - services/* code + tests
  - Helm charts for prov-ledger, er-service, api-gateway, cost-guard
  - apps/web tri-pane + explain-view + tests
  - dashboards json + k6 load test scripts
  - prov-verify CLI + README with external verification steps

definition_of_done:
  - All acceptance_criteria met
  - Dashboards published; alert tested
  - External verification log attached
  - Security review notes + policy dry-run diffs attached
```
