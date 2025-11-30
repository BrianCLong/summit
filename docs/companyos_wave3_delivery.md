# CompanyOS Wave 3 Delivery Plan (Prompts 17–24)

This document expands the wave 3 prompts into a merge-ready delivery plan with requirements, design, implementation breakdown, and validation strategy across the eight initiatives: Copilot Fabric, Tenant & White-Label Control Plane, Evidence Automation, Developer Docs Hub, Privacy/PII Kit, Incident Lifecycle, Quality & Test Fabric, and Integration Platform.

## 1) Requirements Expansion

### Explicit requirements
- Provide an LLM-powered CompanyOS Copilot that integrates IntelGraph, Maestro, Observability, and Audit Spine with strict guardrails and auditable tool invocations.
- Deliver a multi-tenant, white-label control plane with hierarchical configuration (global → tenant → environment), branding, feature flags, and policy overlays with isolation and residency enforcement.
- Automate evidence collection and release notes generation per deployment, producing exportable compliance packs with attestations.
- Stand up a Developer Docs & Learning Hub with clear IA, onboarding/golden-path guides, search, and examples enabling a new engineer to ship using docs alone.
- Ship a Privacy & PII Minimization kit with tagging, annotations, redaction/tokenization, and access logging/analytics.
- Provide an incident lifecycle product with console, timeline, Maestro integration, and postmortem automation.
- Build a Quality & Test Fabric with taxonomy, coverage/risk dashboards, orchestration, and developer-facing tooling/CLI.
- Build an Integration & Partner Platform with public/private API strategy, developer portal, webhook delivery, reference integrations, and runbooks.

### Implied requirements (maximal/23rd-order expansion)
- **Security & governance**: ABAC/OPA enforcement at retrieval, action, and data access; dual-control on high-impact Maestro actions; secrets isolation per tenant; audit logs signed and immutably stored; redaction defaults.
- **Privacy**: Default PII minimization and purpose limitation; retention policies enforced at storage and query layers; deterministic refusal/responses when policy denies; structured PII annotations flow through schemas and code generation.
- **Reliability & SLOs**: Each service exposes health endpoints, SLOs for availability/latency, backpressure, retries with jitter, DLQs for webhooks, idempotent tool invocations.
- **Observability**: Tracing around LLM calls, retrieval fetchers, Maestro actions; metrics for latency/success/denial reasons; structured logs with correlation IDs; dashboards per initiative and aggregate control-plane views.
- **DX**: Typed SDKs for tools/actions; CLI helpers for tenants, evidence packs, incident simulations, and test selection; golden-path templates and example services; stub/mocks for offline/local dev; devcontainer ready.
- **Compliance**: Evidence packs include SBOM, signatures, provenance attestations (in-toto), SLSA framing, and policy checks; runbooks for auditors; immutable storage with hash verification.
- **Performance**: Bounded retrieval context with budgets; caching for repeated IntelGraph queries; pagination and timeboxing for logs; webhook concurrency controls and adaptive rate limits; graceful degradation with partial data + caveats.
- **Backwards compatibility**: Zero-downtime rollouts with feature flags; migrations additive-first; versioned APIs; tenant-safe defaults; fallbacks when Copilot tools unavailable.
- **Product/UX**: Consistent UI affordances (chat, slash commands, incident console); inline citations; preview vs execute affordances; status/visibility for webhooks, incidents, evidence packs.
- **Auditability**: Every tool/action emits structured audit events with caller, intent, inputs (hashed/redacted), policy decision, and outcome; dashboards for access to PII and high-risk actions.
- **Testing**: Deterministic unit/integration tests; chaos/contract tests for webhooks and Maestro actions; synthetic incidents; fixtures for IntelGraph/Observability; coverage ≥80% for touched code.
- **CI/CD**: Lint/type/test gates; security scans; SBOM generation; evidence aggregation as pipeline step; preview environments per branch for UI/portal.
- **Documentation**: Architecture docs per initiative; runbooks; quickstarts; API/SDK references; search indexing and Copilot citations; onboarding playbooks.
- **State-of-the-art enhancement**: Introduce retrieval-policy co-pilot guardrails with declarative policy graph and LLM-output verification (structured output + policy checker) to reduce hallucinations/action drift.

### Non-goals
- Delivering production ML training or fine-tuning pipelines (assume existing LLM provider).
- Building a public app marketplace or billing; focus on partner integrations and tenant control plane.
- Replacing existing observability stack; we integrate with current metrics/logs/traces.
- Handling consumer end-user privacy flows (e.g., DSAR portals); scope is internal platform privacy and auditing.

## 2) Design

### Selected design and rationale
- **Hub-and-spoke architecture**: Control plane services (tenant, policy, evidence, integration) expose typed APIs/SDKs; Copilot, incident console, and portals consume them via shared authN/Z and observability. This keeps domains decoupled while enabling shared primitives (OPA, audit, IntelGraph).
- **Declarative policy overlays**: Tenant/environment overlays expressed as versioned bundles merged with precedence and validated against allowlists. Ensures safe extensibility and isolation.
- **Evidence & automation pipeline**: CI job produces normalized evidence manifests (JSON), stored in immutable vault with signatures; release-notes generator consumes manifests + git/ticket metadata for deterministic outputs.
- **Reliability-first webhooks/actions**: Idempotency keys, signed payloads, retries with backoff, DLQ; Maestro actions behind confirmation + policy guard; LLM actions constrained by JSON Schema tool definitions and output validators.
- **Docs/Search integration**: Docs indexed (static + ADRs/runbooks) with metadata tags; Copilot uses search index for citations; in-product help surfaces context-aware snippets.

### Data structures and interfaces
- **Tool schema (Copilot/Maestro)**: `{ name, description, inputSchema, guardPolicyId, emitsAudit: true, mode: "preview"|"execute" }`.
- **Audit event**: `{ id, actor, toolName, inputsHash, policyDecision, outcome, ts, tenantId, env, traceId }` stored in Audit Spine.
- **Tenant overlay**: `defaults.yaml` + `tenant/{id}/config.yaml` + `tenant/{id}/{env}/config.yaml`; merged with priority env > tenant > global; validation via JSON Schema.
- **Evidence manifest**: `evidence.json` per release `{ releaseId, service, artifacts: [{type, uri, hash, required, status}], attestations, sbomRef }`.
- **Webhook delivery**: `{ eventId, eventType, tenantId, payload, signature, attempt, nextAttemptAt, status }` with DLQ entries.

### Control flow and integration points
- Copilot request → policy check (OPA) → retrieval (IntelGraph/Observability) with budget/redaction → LLM with tool schema → optional Maestro action preview → user confirmation → execute → audit emit.
- Tenant config change → validation → persist versioned overlay → propagate to services via config service + cache invalidation.
- Deployment pipeline → evidence aggregator collects artifacts → writes manifest + attestations → release notes generator → compliance pack → store + expose via portal/API.
- Incident declaration → create incident entity → timeline auto-ingest (Observability, deployments, chat) → mitigation via Maestro → postmortem template populated → publish to IntelGraph.
- Webhook event → enqueue → sign payload → deliver with retries/backoff → monitor dashboard; idempotent handler invoked by partners.

## 3) Implementation Plan

### Step-by-step
1. **Foundation**: Set up shared schemas (tool, audit event, evidence manifest, tenant overlay) and validation libraries; add OPA bundles for default guardrails.
2. **Copilot fabric**: Implement retrieval adapters, tool registry with guard policies, and LLM output validator; wire Maestro preview/execute flow with audit.
3. **Tenant control plane**: Build overlay service/API, branding asset storage, feature-flag evaluation, and residency enforcement hooks.
4. **Evidence pipeline**: Add CI job/scripts to collect artifacts, generate manifests, and sign packs; build release notes generator (LLM-assisted) with policy checks ensuring evidence completeness.
5. **Docs hub**: Author IA, core guides, example indexes, and search indexing job; integrate Copilot citations.
6. **Privacy kit**: Add schema annotations, lint rules, redaction/tokenization libs, and PII access dashboards.
7. **Incident product**: Build incident console flows, timeline ingestion, Maestro action hooks, and postmortem generator.
8. **Quality fabric**: Implement taxonomy, coverage/risk dashboards, orchestration metadata, and developer CLI for targeted test runs.
9. **Integration platform**: Deliver developer portal, API key management, webhook delivery service, and reference integrations.
10. **Testing/observability**: Add unit/integration/e2e tests, synthetic scenarios, metrics/traces/logs, dashboards; ensure feature flags and rollout plan.

### File-by-file change summary (intended)
- `docs/companyos_wave3_delivery.md` — this delivery blueprint (requirements, design, test/rollout).
- Future implementation (referenced for planning): service modules for copilot tools, tenant overlays, evidence pipeline scripts, privacy lint rules, incident/postmortem templates, quality CLI, webhook service, and developer portal.

## 4) Code

> This section enumerates the concrete artifacts created in this change set.

### Modified/New file: `docs/companyos_wave3_delivery.md`
```markdown
(see this file for the complete requirements expansion, design, implementation plan, testing and rollout guidance for prompts 17–24)
```

## 5) Tests

### Test plan
- Unit: schema validation for tool definitions, tenant overlays, evidence manifests; redaction/tokenization functions; webhook signing/verification; Maestro action guardrails.
- Integration: Copilot retrieval + OPA checks; evidence aggregation against mocked CI artifacts; webhook end-to-end with retries/DLQ; incident timeline ingestion; developer portal key lifecycle.
- E2E: Synthetic incident handling end-to-end; deployment producing evidence pack and release notes; partner integration invoking safe Maestro action.
- Non-functional: chaos tests on webhook delivery; load tests for search/index; policy-denial simulations for Copilot.

### How to run (once implemented)
- `npm test` (root) — aggregated unit/integration.
- `npm run test:e2e` — e2e suites (Copilot/incident/integration portal).
- `npm run lint && npm run format` — style gates.
- `npm run test:coverage` (server) — coverage targets for changed modules.

## 6) Documentation

- This document (`docs/companyos_wave3_delivery.md`) is the authoritative blueprint for wave 3 delivery, to be indexed by the Docs Hub and linked from the Learning Hub IA.
- Related high-level responses remain in `COMPANYOS_PROMPTS_WAVE3_RESPONSES.md`; this plan provides the actionable implementation path.
- On merge, add this doc to the docs search index and Copilot citation corpus.

## 7) PR Package

- **Proposed PR title**: `docs: expand companyos wave3 delivery plan`
- **Description**: Introduces an end-to-end delivery blueprint for CompanyOS wave 3 (prompts 17–24), detailing requirements expansion, design, implementation sequencing, testing, and rollout guidance across copilot, tenant control plane, evidence automation, docs hub, privacy kit, incident product, quality fabric, and integration platform.
- **Reviewer checklist**:
  - Confirm requirements coverage for all eight initiatives.
  - Validate design completeness (policy guardrails, observability, security, rollback assumptions).
  - Ensure test plan addresses happy paths, denial paths, and non-functional concerns.
  - Verify documentation is discoverable and aligned with existing wave 3 summary.
- **Rollout notes**: Documentation-only change; no runtime impact. Subsequent implementation work should follow the sequencing and guardrails defined here with feature flags and zero-downtime migrations.

