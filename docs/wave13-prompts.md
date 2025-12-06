# Wave 13 Prompts (97–104) — Execution Blueprints

This document captures the eighth wave of prompts (97–104) and the concrete execution slices required to ship each lane with minimal cross-team contention. Each lane is fully independent but aligned to shared governance, telemetry, and deployment principles.

## Prompt 97 — `geo-policy/` Data Residency & Geo-Fencing Enforcement
- **Objective:** Guarantee that data tagged for a region never leaves its authorized jurisdiction and that workloads are validated against residency constraints.
- **Model & Tagging:**
  - Region taxonomy covering data centers, legal regimes, and sovereign zones with composable labels (e.g., `source_region`, `subject_region`, `processing_region`).
  - Ingest-time tagging for tenants, subjects, assets, and sources; retention rules parameterized per region.
- **Enforcement APIs:**
  - `is_operation_allowed(operation, requester_region, data_region, purpose)` to gate reads/writes/exports/replication.
  - `resolve_residency(data_descriptor)` to return permitted storage/processing regions and lifecycle constraints.
  - Validation hooks for new placements and cross-region replication plans with explicit deny reasons.
- **Integrations:** lifecycle (region-specific retention), deploy-orch/control-plane (region-aware deploy filters), governance (region dimension for policies).
- **Testing:** policy allow/deny matrices on synthetic tags; replication misconfig detection; simulation of rule changes with “at-risk” inventories.
- **Proof:** audit reports showing attempted cross-region actions, decisions, and evidence that data never left Region X.

## Prompt 98 — `model-distill/` Compact Models for Edge & Low Compute
- **Objective:** Deliver distilled/compressed models that mirror heavy stack behaviors for routing, intent, templated explanations, and lightweight risk heuristics.
- **Pipelines:**
  - Consume logs/evals from copilot, graph-xai, ml/eval-nonllm, and academy via feature-store/training-pipeline.
  - Config-driven distillation targets per task (teacher model, loss choices, fidelity thresholds).
- **Outputs & APIs:** distillation configs, registered distilled models, scorecards comparing base vs. distilled fidelity, resource profiles (latency/CPU/memory) for edge deployments.
- **Testing:** side-by-side fidelity tests on curated sets; resource/latency envelopes; regression safeguards ensuring no new unsafe behaviors.
- **Deployment:** register via existing model registry; serve through serving-gateway without new primitives.
- **Documentation:** how to request, train, and deploy a distilled model for a specific use-case.

## Prompt 99 — `dpia-wizard/` Automated DPIA/PIA Drafting Backend
- **Objective:** Auto-fill 80% of DPIA/PIA content using existing knowledge of data flows, risks, controls, and retention.
- **Templates & Data Sources:** structured, versioned DPIA/PIA templates per regime (e.g., GDPR) pulling from data-catalog, reg-knowledge, privacy-engine, lifecycle, governance, compliance.
- **APIs:**
  - Draft generation for a data source/process (purposes, categories, processing ops, controls, retention, flows, risks).
  - Drift-aware updates when upstream configs change; gap flags for human legal input.
- **Testing:** fixture-based draft generation on synthetic systems; drift tests for config changes; version stability tests for older drafts.
- **Output:** structured drafts ready for legal review, with traceability to inputs and known gaps.

## Prompt 100 — `fairness-lab/` Bias, Fairness & Harm Analysis Engine
- **Objective:** Evaluate models/workflows for bias and harmful impact with repeatable metrics and scorecards.
- **Capabilities:**
  - Ingest evaluation datasets with sensitive attributes (synthetic or policy-compliant real data).
  - Audit non-LLM models (risk/ER/anomaly) and LLM behaviors (copilot/report-auto) using fairness prompts.
- **Metrics & Reports:** group-wise performance/calibration, disparate impact, misclassification asymmetries, deterministic runs, and fairness scorecards per model/version/workflow.
- **Integrations:** minimal touch with model registries/llm-eval for promotion gating; configs/thresholds treated as data.
- **Testing:** correctness on balanced/unbalanced synthetic datasets; determinism checks; CI gates for threshold compliance.

## Prompt 101 — `gameday/` Chaos Scenarios & DR Drills
- **Objective:** Orchestrate repeatable game-day exercises spanning infra failures, security incidents, demand spikes, and policy shocks.
- **Scenario Engine:** data-defined scenarios invoking reliability-service, sim-engine, deploy-orch, safety-console, compute-opt.
- **APIs:** launch scenarios in sandbox/staging; progress tracking; structured drill reports exported for post-mortems and program-graph ingestion.
- **Safety Rails:** explicit opt-in for prod, dry-run validation of scenario definitions, deterministic patterns where applicable.
- **Testing:** dry-run schema validation, safety checks blocking accidental prod runs, deterministic outcome checks for synthetic failures.

## Prompt 102 — `interop-standards/` STIX/TAXII & External Intel Formats
- **Objective:** Ensure IntelGraph can import/export standard intel formats without mutating the core domain model.
- **Mappings & Transforms:** canonical model ↔ STIX 2.x objects/relationships (configurable per partner); TAXII transport patterns; optional support for other standards via mapping tables.
- **Flows:**
  - Import STIX/TAXII feeds into canonical entities/relations with provenance.
  - Export graph slices/cases/incidents as valid STIX bundles; round-trip preservation where expected.
- **APIs:** bundle validation/transform, partner-specific mapping registration, integration with integration-hub for transport and assets/ for artifacts.
- **Testing:** conformance via open-source validators, round-trip fidelity, performance on large bundles.

## Prompt 103 — `help-center/` In-Product Help, Tours & Contextual Guidance Backend
- **Objective:** Provide contextual in-product assistance (snippets, diagrams, tours, micro-videos) keyed to routes/components/roles/maturity.
- **Content Model:** stored help artifacts linked to contexts (route ID, component ID, feature flags, role, tenant maturity from tenant-benchmark); tours as ordered step sequences.
- **APIs:** fetch relevant help items for a given context; emit help usage events to product-analytics; optional copilot hooks for deeper dives.
- **Testing:** context resolution on synthetic contexts, version/feature-flag correctness, analytics emission coverage.
- **Governance:** content authored as code/config; frontend consumes help-center without tight coupling.

## Prompt 104 — `carbon-accounting/` Energy & Emissions Metrics
- **Objective:** Expose compute cost in energy/emissions terms per tenant/workload across CPU/GPU/storage/network.
- **Inputs & Factors:** utilization and cost metrics from compute-opt, reliability-service, infra telemetry; region/hardware-specific emission factors (config-only, versioned).
- **Calculations & Aggregations:** energy and carbon footprint per job/service/tenant/environment/model/scenario with reconciled totals vs infra-level metrics.
- **APIs & Reports:** query footprints over time; compare alternative configurations/models; provide planning-ready outputs (no enforcement/offset tracking).
- **Testing:** synthetic utilization with known conversion factors; reconciliation consistency checks; performance on long windows.

## Delivery Principles
- Keep schemas untouched; add tagging/enforcement/config layers where needed.
- Treat configurations, templates, and mappings as data for safe parallelization.
- Require explicit integrations (no invasive rewrites) and strong test matrices before shipping each lane.
