# Round Four — Eight Parallel Tracks (25–32)

> Scope the next eight workstreams so autonomous teams can ship in parallel without collision. Each track owns its module in isolation, with crisp APIs back to the platform. All contracts are additive and respect existing storage/ingestion boundaries.

## 25. Entity Resolution Engine & Identity Graph (`er-engine/`)
- **Pipeline:** Pluggable stages for blocking (exact IDs, phonetic keys, geo buckets), candidate generation (per entity type), feature scoring (hybrid deterministic + probabilistic), and merge decisions with confidence bands.
- **Deterministic precedence:** Exact identifiers (government ID, email, device fingerprint) always win over model scores when configured.
- **Identity graph:** Store entity IDs, clusters, link explanations (matched/mismatched fields, weights, thresholds), and merge history to enable reversible splits.
- **APIs:**
  - `POST /er/candidates`: given a record, return candidate entities + per-feature scores + explanation.
  - `POST /er/decisions`: apply accept/queue/reject decisions with source IDs, operator/model attribution, and audit log.
  - `POST /er/split`: undo merges using recorded history.
- **Testing:** Gold labeled pairs/triples for precision/recall; tests that deterministic rules override probabilistic scores; merge/split idempotency and audit completeness; perf targets for large candidate sets.

## 26. Graph Analytics Library & Pattern Detection (`graph-analytics/`)
- **Algorithms:** Centrality (degree, betweenness, PageRank), community detection (Louvain/label-propagation), shortest paths (Dijkstra, BFS), and k-step neighborhoods.
- **Patterns:** Cycle/ring detection, star/hub detection, bipartite-like A→B→C motifs with shared attributes (accounts/devices/IPs).
- **Pattern library:** Declarative YAML/JSON definitions with versioning; evaluator returns matched subgraphs with scores and evidence edges.
- **APIs:** `GET /graph/patterns/top` (top N matches for a subgraph), `GET /graph/patterns/node/:id` (patterns containing a node), `POST /graph/patterns/evaluate` (evaluate supplied pattern against a subgraph).
- **Testing:** Unit fixtures for each algorithm; regression snapshots for pattern matches; perf gates on large graphs with p95 latency budgets.

## 27. Event Stream Processor & Complex Event Detection (`event-engine/`)
- **Rule engine:** Supports sequences, sliding/tumbling windows, aggregations, and temporal logic (A followed by B within T). Rules are versioned, enable/disable capable, and data-driven (YAML/JSON).
- **Alerts:** Emit bundles of triggering events, severity, category, suggested next actions, and provenance of the rule version.
- **APIs:**
  - `POST /events/rules/test`: dry-run a rule against a supplied trace.
  - `GET /events/alerts`: query alerts by case/entity/time window.
  - `POST /events/ingest`: entry point for upstream topics (ingestion/anomalies/case updates/governance decisions).
- **Testing:** Synthetic traces that must/must-not fire; determinism checks (same stream → same alerts); load tests under high-volume streams.

## 28. Analyst Automation: Playbooks, Macros & Scripting (`automation/`)
- **Playbook format:** YAML/JSON DAG of steps invoking approved operations (graph query, lineage fetch, XAI explanation, attach to case, etc.), with inputs, variables, and conditionals.
- **Execution engine:** Idempotent runs with retries, safe sandboxed macros, and audit logging of every step/result. No arbitrary user code.
- **APIs:** list/inspect/execute playbooks and query run status/history.
- **Safety:** Operation catalog is versioned/additive; governance/tenancy enforced per step with explicit failure codes for blocked actions.
- **Testing:** Control-flow coverage (branches/loops where allowed), retry/idempotency, safety enforcement, and batch execution load tests.

## 29. Privacy Engine: Minimization, Differential Privacy & Safe Sampling (`privacy-engine/`)
- **Policies:** Per data category/purpose rules to drop/generalize/hash fields before use/export. Policy schemas are versioned and additive.
- **DP & sampling:** Modules for safe aggregates (counts/rates) with optional DP noise (epsilon budgets, composition tracking) and down-sampled datasets for model training/EDA.
- **APIs:** `POST /privacy/minimize` (apply minimization to payload/query), `POST /privacy/aggregate` (run aggregate under DP params), `POST /privacy/sample` (return privacy-safe slice for analysis).
- **Testing:** Verify configured minimization strips/generalizes fields; DP noise sanity checks under fixed seeds; regression tests that safe views never leak raw identifiers.

## 30. Data Lifecycle, Retention & Right-to-Erasure (`lifecycle/`)
- **Retention policies:** By data category/tenant/legal basis with time or event-driven expiry; policies are data-driven and versioned.
- **Deletion orchestration:** Traverse references across stores via APIs/index tables; apply logical delete/anonymization/hard delete per policy; durable audit trail of what/when/why.
- **Archival:** Route cold data to cheaper tiers with correct access controls.
- **APIs:** trigger retention sweeps (`POST /lifecycle/retention/run`) and execute erasure requests (`POST /lifecycle/erase`) for subject IDs/keys.
- **Testing:** Synthetic expiry vs. non-expiry coverage; erasure completeness while preserving allowed aggregates/audit; idempotent reruns; perf on large sweeps.

## 31. External Integration Hub: Tickets, SIEM & Case Systems (`integration-hub/`)
- **Contract:** Canonical outbound events (alerts, cases, tasks, compliance events) and inbound updates (tickets/status/external IDs).
- **Connectors:** Implement representative adapters (JIRA/ServiceNow-like ticketing, SIEM sink, generic webhook) with mapping configs between canonical and vendor schemas.
- **Resilience:** Retry with backoff, DLQ handling, rate limiting, and idempotency to avoid duplicate tickets/events.
- **APIs:** internal send/receive endpoints plus health/metrics; mappings are additive and versioned.
- **Testing:** Contract tests per connector; simulated downtime/rate-limit resilience tests; idempotency checks on retries.

## 32. Reference Architecture, Installer & Single-Node Edition (`reference-arch/`)
- **Deployment profile:** Minimal single-node (or minimal-cluster) setup for all core services (graph, ingest, prov-ledger, governance, copilot, UI) using config profiles—not code hacks.
- **Installer:** Scripted/containerized flow with pre-flight checks, dependency validation, demo data load, and smoke tests.
- **Docs:** Diagrams of components/ports/trust boundaries, resource requirements, and step-by-step install/runbook. Single-node manifests stay clearly separated from production ones.
- **Testing:** Automated installer test from zero; config validation failures are clear; smoke tests ensure services start with demo data.

## Cross-Track Integration & Safety Rails
- Treat ingestion/graph/storage as external dependencies; interactions are via additive, versioned contracts.
- Maintain explicit auditability across ER, automation, privacy, lifecycle, and integration flows; all merges/splits/deletes/alerts/playbook steps log who/what/when/why/how.
- Performance gates live alongside unit/regression suites; publish latency/throughput targets per module.
- Pattern, rule, playbook, privacy, and retention definitions are data-driven so teams can ship independently without redeploying code.
