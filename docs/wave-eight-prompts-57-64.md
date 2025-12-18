# Wave Eight Prompts (57–64)

These eight prompts continue the independent workstream pattern: each is a standalone charter that can run fully in parallel and merge cleanly with prior waves. They emphasize governance boundaries, deterministic testing, and clear non-goals so teams stay decoupled.

## 57. Experimentation Hub — `experiments/`

**Mission:** Provide a safe notebook and sandbox hub where data scientists can explore governed datasets without risking production systems or privacy posture.

**Scope:**
- Provision ephemeral notebook environments (Jupyter or equivalent) per user or project with sandboxed credentials and resource limits.
- Expose read-only data taps for canonical entities, graph projections, feature store snapshots, and demo/simulation data only through governed APIs or exports—no direct production DB access.
- Enforce tenant scoping, minimization, and redacted defaults via governance/PDP and the privacy engine.
- Maintain a projects registry (name, owner, purpose, datasets used, retention window).

**Non-goals:**
- No automated promotion of experiment code into production paths.
- No bespoke UI beyond basic project listings and notebook URLs.

**Engineering & Testing:**
- Provisioning tests ensure deterministic lifecycle: create → use → idle timeout → teardown with no leaks.
- Access control tests verify experiments cannot see data or tenants outside allowed scope.
- Resource-guard tests enforce CPU/memory/storage quotas and cleanly kill runaway notebooks.

**Parallelization & Merge Safety:**
- Use only public APIs/exports from other services; do not modify their code.
- Run environments in isolated namespaces so core SLOs remain unaffected.

**Workflow:**
1. Define the experiment environment model (user, project, datasets, lifetime).
2. Implement notebook provisioning and teardown.
3. Wire governed data taps with PDP/privacy checks.
4. Document “How to run an experiment safely” for DS/analyst teams.

## 58. Schema Evolution Council — `schema-council/`

**Mission:** Govern schema changes with structured proposals, automated diffs, and impact analysis to prevent breaking changes.

**Scope:**
- Track schema proposals for domain entities, API contracts (OpenAPI/GraphQL/proto), and event/CDC payloads.
- Store current vs proposed versions and auto-generate diffs (add/remove/rename, type shifts, required→optional, etc.).
- Integrate with the data catalog, config-center, and API gateway to enumerate affected datasets, services, and clients and flag breaking vs non-breaking changes.
- Provide APIs to submit proposals (metadata: owner, rationale, target date), approve/reject with comments, and export change logs for docs/compliance.

**Non-goals:**
- No legal/policy PDP enforcement—this is technical schema governance only.
- No large UI; JSON APIs and minimal admin views suffice.

**Engineering & Testing:**
- Diff correctness tests on synthetic schemas with known changes.
- Impact detection tests confirm catalog/gateway fixtures enumerate affected surfaces.
- Workflow tests cover proposal states (draft → review → approved/rejected) with audit logging.

**Parallelization & Merge Safety:**
- Do not change schemas directly; manage proposals and metadata only.
- Integrations are read/notify only—no schema rewrites.

**Workflow:**
1. Define governed schema types and the proposal lifecycle.
2. Implement schema diffing and impact analysis.
3. Build proposal APIs with an audit trail.
4. Document “How to propose a schema change and what you must check.”

## 59. Forensic Replay Engine — `forensics/`

**Mission:** Correlate traces, logs, and decisions across services to reconstruct incident timelines and support replay investigations.

**Scope:**
- Ingest structured logs/traces via OTEL/log pipelines keyed by correlation IDs, tenant, case IDs, user IDs, and request IDs.
- Normalize and index to reconstruct request/incident timelines and filter by case, user, time range, or correlation ID.
- Provide a replay engine that rebuilds API call sequences and decisions in simulation mode, running against current or archived configs/policies to compare outcomes.
- Expose APIs to query/export correlated traces for an investigation ID and run “what if policy X” replays over historical traces.

**Non-goals:**
- No raw log viewer UI; only structured query/export endpoints.
- No modification of original logs—operate on ingested copies.

**Engineering & Testing:**
- Correlation tests stitch multi-service synthetic traces into coherent timelines.
- Replay tests rerun traces in simulation to reproduce original outcomes under the same config.
- Performance tests ensure bounded latency for queries and replays at scale.

**Parallelization & Merge Safety:**
- Services already emit OTEL/logs; add parsing/correlation only—no new business logic.
- Ingestion is append-only with no upstream mutations.

**Workflow:**
1. Define canonical correlation identifiers and log shapes.
2. Implement ingestion, correlation, and indexing.
3. Build the replay harness with config snapshots.
4. Document “How to investigate an incident using forensics/.”

## 60. Deployment Orchestrator — `deploy-orch/`

**Mission:** Deliver safe, controlled, and reversible deployments via blue/green, canary, and multi-region rollout strategies.

**Scope:**
- Coordinate blue/green deployments with traffic flips and health validation.
- Implement canary policies (percentage- or tenant-based) with automatic or manual promotion/rollback based on SLOs and error budgets.
- Support multi-region awareness with per-region rollout status and failover hooks aligned to existing DR designs.
- Integrate with reliability-service, perf-lab, and safety-console for metric-based gates and expose declarative deployment configs per service/strategy/health gate.

**Non-goals:**
- No low-level infra reimplementation (Kubernetes/Terraform); orchestrate atop existing platforms.
- No business-logic decisions; gate solely on metrics and explicit rules.

**Engineering & Testing:**
- Simulation tests dry-run rollouts in sandbox environments.
- Failure-mode tests cover partial rollouts, health failures, and rollback triggers.
- Policy tests ensure misconfigurations fail safe (no traffic reroute) with clear errors.

**Parallelization & Merge Safety:**
- Integrate with infra/metrics without touching service code.
- Version deployment configs separately per environment (dev/staging/prod).

**Workflow:**
1. Define standard rollout strategies and health gates.
2. Implement the orchestrator and config format.
3. Wire into CI/CD and SLO metrics.
4. Document “How to roll out a service using deploy-orch/.”

## 61. Compute Resource Optimizer — `compute-opt/`

**Mission:** Centralize GPU/high-memory/batch scheduling to prevent starvation and ensure fair, SLA-aware execution for heavy jobs.

**Scope:**
- Manage compute pools (GPU nodes, high-memory nodes, batch queues) with a standardized job submission API for LLM batch runs, model training/evals, and heavy graph analytics/simulations.
- Schedule jobs by priority, quotas, and SLAs with preemption where allowed and emit cost/utilization metrics per tenant/team/job type.
- Integrate with llm-eval, perf-lab, training-pipeline, and sim-engine as job clients.

**Non-goals:**
- No business semantics on which jobs to run; schedule requested work only.
- No changes to real-time online serving paths.

**Engineering & Testing:**
- Scheduling tests validate fairness, priority ordering, and quota enforcement on synthetic workloads.
- Failure tests handle job crashes, node loss, and retries without double-counting or hanging work.
- Accounting tests confirm usage metrics match job durations and resource usage.

**Parallelization & Merge Safety:**
- Clients submit via APIs; do not alter their internals.
- Resource pools come from config-center—no hard-coded infra.

**Workflow:**
1. Define resource classes and job types.
2. Implement scheduler, queues, and APIs.
3. Integrate reference heavy clients (eval/training) for validation.
4. Document “How to submit and monitor a heavy compute job.”

## 62. Legal Hold & E-Discovery — `legal-hold/`

**Mission:** Enforce legal holds and support discovery queries without compromising governance, retention, or privacy.

**Scope:**
- Manage legal holds with scope (tenants, cases, entities, time ranges, data categories), start/end, owner, and reason.
- Integrate with lifecycle/retention and lifecycle/deletion engines to override retention for held data until release.
- Maintain a discovery index for held items (cases, messages, evidence metadata, audit logs) enabling policy-aware search/export.
- Provide APIs to create/update/release holds with audit and to run scoped discovery queries exporting metadata plus redacted content.

**Non-goals:**
- No full legal-review UI; backend infrastructure only.
- No governance/privacy bypass—discovery views still go through redaction/privacy engines.

**Engineering & Testing:**
- Hold enforcement tests ensure held items survive retention/deletion while non-held items do not.
- Discovery tests validate queries respect hold scope, tenancy, and policies.
- Audit tests ensure every hold change and discovery export is logged.

**Parallelization & Merge Safety:**
- Interact with lifecycle, audit, privacy, and redaction only through public APIs.
- Represent holds as policy overlays without invasive schema changes.

**Workflow:**
1. Define the hold model and discovery use cases.
2. Implement hold enforcement with lifecycle integration.
3. Build the discovery index plus query/export APIs.
4. Document “How to place a hold and run discovery.”

## 63. Labeling & Annotation Backend — `labeling/`

**Mission:** Power training-data labeling workflows with task management, redundancy, and audit-ready exports for downstream ML.

**Scope:**
- Define labeling tasks (task type, input objects, labeling schema, guidelines references).
- Manage assignment/workflow: task queues per labeler/team, redundancy, and conflict resolution.
- Store labels and rationales: structured labels, spans, comments, confidence, evidence links.
- Provide APIs to create tasks from upstream datasets, fetch items to label, submit labels, and run review/resolution flows; integrate with HITL only where necessary.

**Non-goals:**
- No full labeling UI; frontends can build on top.
- No direct training; output labeled datasets for training-pipeline.

**Engineering & Testing:**
- Task lifecycle tests cover creation → assignment → labeling → resolution with audit.
- Redundancy tests detect conflicts and validate resolution strategies.
- Data export tests produce training-ready dumps with point-in-time references.

**Parallelization & Merge Safety:**
- Reference input objects by IDs without coupling to upstream storage.
- Version label schemas additively.

**Workflow:**
1. Define key labeling use cases (ER pairs, anomalies, risk, text).
2. Design task and label schemas.
3. Implement labeling workflows and APIs with tests.
4. Document “How to create a labeling project and export data.”

## 64. Product Analytics & Org Metrics — `product-analytics/`

**Mission:** Capture product telemetry and compute outcome metrics (adoption, feature usage, funnels, copilot impact) in a privacy-minimized way.

**Scope:**
- Collect governance-compliant event-level telemetry for feature usage, flows (e.g., tri-pane filters, copilot answers, case exports), user actions, and session metadata.
- Compute/store key metrics: adoption by tenant/role, time-to-insight, copilot contribution (answers used vs ignored, feedback scores).
- Integrate with data-quality, safety-console, and feedback services to correlate behavior with safety/quality signals.
- Provide APIs to query metrics/aggregations (per feature/tenant/period) and export snapshots to external BI/reports.

**Non-goals:**
- No full BI dashboard; deliver clean, structured metrics/aggregates only.
- Do not use telemetry directly for access control/governance decisions.

**Engineering & Testing:**
- Telemetry minimization tests ensure no PII/sensitive payloads slip into analytics.
- Metric correctness tests on synthetic usage logs.
- Performance tests validate query and rollup latency.

**Parallelization & Merge Safety:**
- Product events are additive hooks; avoid breaking existing flows.
- Version metrics schemas and handle deprecations explicitly.

**Workflow:**
1. Define core product metrics and usage events.
2. Implement telemetry ingestion and aggregation.
3. Wire a subset of critical features as proof-of-value.
4. Document “How to instrument your feature for product analytics.”
