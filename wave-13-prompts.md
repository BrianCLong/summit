# Wave Thirteen — Mission Scopes 97–104

This wave codifies eight independent lanes focused on hardening governance, safety, reliability, and efficiency. Each lane summarizes ownership, scope, APIs/outputs, and validation gates so teams can execute in parallel without stepping on core service schemas.

## 97. geo-policy/ — Data Residency & Geo-Fencing Enforcement
- **Ownership:** Residency policy service ensuring operations respect jurisdiction boundaries.
- **Scope:**
  - Model regions/jurisdictions (data centers, legal/sovereign zones).
  - Tag assets, workloads, and tenants with residency constraints at ingest.
  - Enforcement APIs: allow/deny region-to-region ops; determine required storage region; validate replication/placement.
  - Integrations: lifecycle retention per region, deploy-orch for region-aware placement, governance as policy dimension.
  - Simulations: impact analysis when residency rules change.
- **Gates & Tests:** Policy allow/deny fixtures, cross-region replication misconfig detection, simulation coverage of “at risk” inventories.

## 98. model-distill/ — Lightweight Copilot & Edge Models
- **Ownership:** Distillation/compression factory for edge-suitable models.
- **Scope:**
  - Consume logs/evals from copilot, graph-xai, ml/eval-nonllm, academy.
  - Produce distilled models for routing, intent classification, explanation templates, and lightweight risk heuristics.
  - Integrations: feature-store + training-pipeline for data, serving-gateway for deployment; register via model registry.
  - Outputs: distillation configs per task, scorecards comparing teacher vs student.
- **Gates & Tests:** Fidelity benchmarks (≥ target behavior match), resource profiles (CPU/memory/latency), regression/safety parity vs baseline.

## 99. dpia-wizard/ — Automated DPIA/PIA Drafting Backend
- **Ownership:** Structured DPIA/PIA drafts based on existing system knowledge.
- **Scope:**
  - Templates per regime (e.g., GDPR) as structured forms.
  - Auto-fill: purposes, data categories, processing ops, controls, retention, flows, risks; flag human-required gaps.
  - Integrations: data-catalog, reg-knowledge, privacy-engine, lifecycle, governance, compliance.
  - APIs: generate/update drafts for a data source/process; track versions and inputs.
- **Gates & Tests:** Fixture correctness on synthetic systems, drift reactions to config changes, version stability and traceability.

## 100. fairness-lab/ — Bias, Fairness & Harm Analysis
- **Ownership:** Evaluation harness for bias/fairness across models and workflows.
- **Scope:**
  - Ingest datasets with sensitive attributes (policy-compliant real/synthetic).
  - Audit non-LLM models and LLM behaviors (copilot/report-auto safety/fairness prompts).
  - Metrics: group performance, calibration, disparate impact, misclassification asymmetry.
  - Outputs: fairness scorecards per model/version; minimal integration with registries/llm-eval for promotion gating.
- **Gates & Tests:** Metric correctness on balanced/unbalanced toys, determinism for same model+data, CI thresholds flagging regressions.

## 101. gameday/ — Chaos & DR Drill Orchestrator
- **Ownership:** Scenario engine for disaster/security exercises in non-prod by default.
- **Scope:**
  - Scenario catalog: infra failures, synthetic security incidents, demand spikes, policy shocks.
  - Orchestrate drills via reliability-service, sim-engine, deploy-orch, safety-console, compute-opt.
  - Capture outcomes: recovery times, error rates, human responses, safety triggers; emit post-mortem inputs.
  - APIs: launch scenario (sandbox/staging), track progress, export structured drill reports; guardrails to prevent accidental prod runs.
- **Gates & Tests:** Dry-run validation of definitions, safety tests for prod protections, determinism for synthetic patterns.

## 102. interop-standards/ — STIX/TAXII & Intel Format Interop
- **Ownership:** Translation layer between canonical model and external threat intel standards.
- **Scope:**
  - Mappings for STIX 2.x objects/relationships, TAXII transport, partner-specific variants (configurable).
  - Import/export flows with provenance; integrate with integration-hub and assets/ for referenced artifacts.
  - APIs: validate/transform bundles; register mapping configs per partner/variant.
- **Gates & Tests:** Conformance via open-source validators, round-trip preservation checks, performance on large bundles.

## 103. help-center/ — Contextual Help & Guided Flows Backend
- **Ownership:** In-product help/tours backend with context-aware retrieval.
- **Scope:**
  - Store help artifacts (snippets, diagrams, micro-videos via assets/, doc links) and structured tours tied to UI routes/components.
  - Context keys: route IDs, component IDs, feature flags, user role, tenant maturity (from tenant-benchmark).
  - APIs: fetch relevant help for a context; emit usage analytics to product-analytics; optional copilot deep-dive suggestions.
  - Content/versioning: data-driven, feature-flag aware; no authoring UI.
- **Gates & Tests:** Context resolution fixtures, version/flag correctness, analytics emission coverage.

## 104. carbon-accounting/ — Energy & Emissions Footprinting
- **Ownership:** Convert utilization/cost telemetry into energy and carbon metrics per tenant/workload.
- **Scope:**
  - Consume metrics from compute-opt, reliability-service, infra telemetry; apply region/hardware emission factors (config-driven).
  - Aggregate by service, tenant, environment, model, scenario; expose time-series queries and configuration comparisons.
  - Outputs: APIs and reports; no policy enforcement or offsets bookkeeping.
- **Gates & Tests:** Calculation accuracy on synthetic inputs, reconciliation of totals vs infra aggregates, performance over long windows.
