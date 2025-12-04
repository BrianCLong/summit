# Wave 15 Missions (113–120)

This pack captures the backend-first delivery plans for wave fifteen. Each mission is scoped to be parallel, merge-safe, and additive to the existing platform while avoiding upstream schema changes.

## 113. Numeric & Visual XAI Alignment Engine (`xai-visual/`)
- **Goal:** Keep charts/tables and LLM explanations numerically aligned using canonical payloads.
- **Scope & Design:**
  - Define a canonical `ExplanationPayload` (numbers, series, labels, units, filters, time ranges, tolerances, and provenance).
  - Build bundlers that ingest analytics-api, graph-analytics, product-analytics, and perf-lab outputs and emit chart+explanation JSON DTOs for UIs.
  - Validators compare LLM/copilot/report-auto/timeline-narrator text to payloads: numeric tolerance checks, unit checks, trend-state checks (increase/decrease/flat), and missing-context detection.
  - Failure path returns structured warnings/errors (e.g., `type`, `fields`, `expected`, `observed`) without blocking base data delivery.
- **APIs:**
  - `POST /xai-visual/bundles`: build chart+explanation context for a query/result set.
  - `POST /xai-visual/validate`: run post-hoc consistency checks on supplied explanation text.
- **Testing:** synthetic trend/number fixtures, boundary tolerances around ±0.1%, and failure-mode tests asserting structured inconsistencies.

## 114. Customer Simulation Lab (`customer-lab/`)
- **Goal:** Safe digital twins of tenants for experimentation without touching production.
- **Scope & Design:**
  - Twin model mirrors configs/policies/shape of data; records provenance of source tenant and snapshot time; swaps data with dev-sandbox-data.
  - Lifecycle APIs manage twins and orchestrate “experiment bundles” (governance configs, triage rules, automation playbooks, UI/copilot behaviors).
  - Integrations: policy-sim for policy runs, blast-radius for impact, dpia-wizard for privacy summaries.
  - Hard isolation: no outbound writes to source tenants; access scoped to sandbox datasets.
- **APIs:**
  - `POST /customer-lab/twins` (create from source), `PATCH/DELETE /customer-lab/twins/{id}`.
  - `POST /customer-lab/twins/{id}/experiments/{name}` to run bundles; `GET /customer-lab/twins/{id}/results` for metrics/failures/suggestions.
- **Testing:** isolation guards, config-parity snapshots vs source, deterministic experiment replays on identical inputs.

## 115. Reputation & Narrative Risk Engine (`reputation/`)
- **Goal:** Score entities and narratives for reputation risk with explainable trends.
- **Scope & Design:**
  - Read-only scoring over incident history, case outcomes, alerts, legal-hold activity, and allowed external intel via interop-standards; ontology tags group narratives.
  - Computes scores + trend indicators with rationale strings (e.g., “Score ↑ due to three linked incidents in last 30 days”).
  - Emits subscriptions for significant changes to notify/ and safety-console; integrates with triage and academy for context overlays only.
- **APIs:**
  - `GET /reputation/entities/{id}` and `/narratives/{slug}` for current score + history; `GET /reputation/changes/subscribe` for streaming/notifier hooks.
- **Testing:** synthetic graph fixtures for sanity/drift, fairness checks via fairness-lab, and threshold alerting on new events.

## 116. Deep Archive Explorer (`cold-archive/`)
- **Goal:** Queryable but controlled access to cold storage for compliance/forensics.
- **Scope & Design:**
  - Indexes lifecycle/offboarding/legal-hold archives in metadata-heavy, content-light form; restricts query predicates (case/entity ID, time range, tenant, policy tag).
  - Jobs are asynchronous with manifests, cost/latency estimates, and recall artifacts; integrates with compliance, legal-hold, rtx-export, forensics.
  - Governance overlays: tenant isolation, legal-hold/redaction enforcement on read.
- **APIs:**
  - `POST /cold-archive/queries` to submit; `GET /cold-archive/jobs/{id}` for status; `GET /cold-archive/jobs/{id}/results` for manifests/artifacts.
- **Testing:** correctness on synthetic archives, cost/latency ceilings with graceful failures for oversized queries, governance enforcement tests.

## 117. Contract/SLA Enforcement & Breach Detector (`sla-guard/`)
- **Goal:** Encode SLAs/SLOs as executable monitors with breach detection per tenant/feature.
- **Scope & Design:**
  - SLO schema for latency/availability/data freshness/response timelines; configs are versioned data in config-center.
  - Aggregates metrics from reliability-service, perf-lab, product-analytics, compliance; computes rolling-window compliance and emits breach/near-breach events to notify/, safety-console, tenant-benchmark.
  - Supports exports for legal/CSM evidence; no billing or punitive automation.
- **APIs:**
  - `POST /sla-guard/slas` to register; `GET /sla-guard/posture?tenant=…` for current/historical compliance; `GET /sla-guard/reports/{id}`.
- **Testing:** synthetic time-series for pass/fail, monthly/quarterly windowing, edge cases (partial outages, missing metrics, new tenants).

## 118. Internal AI Coding Assistant (`dev-copilot/`)
- **Goal:** Repo-specific coding assistant that enforces architecture and safety constraints.
- **Scope & Design:**
  - Indexes codebase, docs, schema-viz, arch-bot rules, program-graph; retrieval layer feeds constrained LLM backend.
  - Tasks accepted with context (diff/files/failing tests) and return structured suggestions (snippets, rationale, target files, test/doc prompts) respecting allowed imports and naming conventions.
  - Integrations exposed via backend APIs for CLI/IDE plugins (plugins themselves out-of-scope); no direct commits to main.
- **APIs:**
  - `POST /dev-copilot/tasks` with task metadata; `GET /dev-copilot/suggestions/{id}` for structured responses.
- **Testing:** golden task fixtures, arch-bot rule compliance checks, safety tests for secrets/network calls/dependency bloat.

## 119. Adversarial Data Generator (`adv-data-lab/`)
- **Goal:** Generate adversarial/edge-case datasets to harden non-LLM models.
- **Scope & Design:**
  - Uses serving-gateway + training datasets to craft perturbations near decision boundaries and label fragile patterns; outputs versioned adversarial corpora in data-catalog.
  - Integrates with training-pipeline and eval-nonllm for robustness metrics and adversarial training loops (where allowed).
- **APIs:**
  - `POST /adv-data-lab/requests` for model/task; `GET /adv-data-lab/sets/{id}` for adversarial datasets; `GET /adv-data-lab/reports/{id}` for robustness summaries and retraining recommendations.
- **Testing:** baseline vs adversarial difficulty checks, robustness gains after adversarial training, privacy/governance safeguards on generated data.

## 120. Cross-Domain Mission Template Composer (`mission-templates/`)
- **Goal:** Business-facing mission blueprints that stitch capabilities into end-to-end scenarios.
- **Scope & Design:**
  - Mission template schema defines capability graphs (ingest, ER, graph-analytics, triage, copilot, report, compliance), inputs/outputs, and required QA/safety/compliance gates; templates are versioned configs atop program-graph.
  - Composer instantiates missions per tenant/use-case and exposes status aggregation (step completion, gate pass/fail). Feeds automation/playbooks, academy, storyboard for playbook/training/storyboard generation.
- **APIs:**
  - `POST /mission-templates/templates` to register; `POST /mission-templates/instantiate` for tenant/use-case; `GET /mission-templates/{id}/status` for step/gate rollups.
- **Testing:** integrity of instantiated mission references, coverage of required capabilities, status aggregation against program-graph/CI signals.

## Implementation Notes
- All services are overlays/read-only against source systems; no upstream schema mutations.
- Configs and thresholds are data-versioned for safe iteration and rollback.
- Failure modes prioritize structured warnings and observability over silent degradation.
