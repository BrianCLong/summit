# Summit DX Orchestration Layer Blueprint

> **Alignment**: This blueprint asserts readiness under the Summit Readiness Assertion and the governing authority files in `docs/governance/`, with policy-as-code as the single source of regulatory truth. All definitions conform to those authority files and are intentionally constrained to orchestration, provenance, and governance ownership.

## A) Architecture Summary (1 page)

- **Positioning (coordination layer, not a monolithic DXP)**: Summit is the orchestration fabric that connects content, decisioning/personalization, experimentation, analytics, and workflow execution with governed context travel and auditability. It refuses to own channel rendering, content authoring UIs, or proprietary model hosting. It owns **context packaging**, **policy enforcement**, **provenance**, and **multi-tenant orchestration**.
- **Orchestration scope**: Summit integrates upstream CMS/DAM/CDP and personalization engines, experiment managers, analytics sinks, and workflow/runbook systems. Integrations are **adapter-driven** and must emit **Typed Context Bundles (TCBs)** with provenance links at every boundary.
- **What Summit refuses to own**: web/app rendering frameworks, CMS authoring UI, vendor billing, and proprietary model hosting. These remain with specialized systems to keep Summit composable.
- **Reference flow (Content → Decisioning/Personalization → Experimentation → Analytics → Workflow)**: content adapters normalize metadata into graph entities and attach TCBs; decisioning services evaluate audiences/variants using TCBs; experiments are registered and enforced through orchestration policies; analytics events are emitted with context lineage; workflows execute compensating actions and human approvals via rollback tokens.
- **Context travel design**: TCBs encapsulate tenant-scoped identity, object references, consent/PII classifications, redaction maps, time-bound validity, and cryptographic provenance links. Every API request and event references a TCB pointer; policy checks validate integrity, redaction, jurisdiction, and retention.
- **Governance-first agent runtime**: OPA/Cedar policy packages define decision rights, model/tool allowlists, PII handling, consent, retention, and approvals. Actions are gated by risk scoring, step-up auth, HITL thresholds, rollback tokens, and immutable audit trails.
- **Anti–DX-debt controls**: explicit prototype vs. production lifecycle with CI gates for accessibility, security, performance, schema contracts, and observability. “Vibe-coded” artifacts are sandboxed with TTLs and blocked from production credentials.
- **Integration ownership**: RACI by domain + adapter; bounded contexts with vendor isolation; reversible adapters and contract tests enable staged cutovers.
- **Minimum viable proof**: a governed agentic journey that executes the entire flow, emits provenance lineage, and exposes operational dashboards.

## B) Component Diagram (text description)

1. **Ingress Adapters** (CMS/DAM/CDP, personalization, experimentation, analytics, workflow):
   - APIs: `POST /ingest`, `POST /adapters/{id}/events`.
   - Emits: `ContextBundleCreated`, `ContentNormalized`, `DecisionRequested` events.
2. **Provenance Ledger & Graph Context**:
   - APIs: `POST /provenance/events`, `GET /context/{tcbId}`, `GET /lineage/{tcbId}`.
   - Stores immutable events + graph index with tenant-scoped views.
3. **Policy Engine** (OPA/Cedar):
   - APIs: `POST /policy/evaluate`, `POST /policy/register`, `GET /policy/decisions/{id}`.
   - Outputs signed decision receipts bound to TCB hashes.
4. **Agent Runtime / Orchestrator**:
   - APIs: `POST /orchestrations`, `POST /orchestrations/{id}/execute`, `POST /orchestrations/{id}/rollback`.
   - Runs declarative DAGs; enforces policy receipts before execution.
5. **Risk & Safety Gate**:
   - APIs: `POST /risk/score`, `POST /approvals/request`, `POST /approvals/{id}/resolve`.
   - Supports step-up auth, HITL, and rollback tokens.
6. **Cost/Latency Guard**:
   - APIs: `GET /budgets/{tenant}`, `POST /budgets/{tenant}`, `GET /usage/{tenant}`.
   - Enforces quotas, token accounting, caching policy, and circuit breakers.
7. **Observability & Analytics Sink**:
   - APIs: `POST /telemetry/events`, `GET /telemetry/summary`.
   - Metrics: spend, P95 latency, HITL queue depth, policy deny rate.
8. **Workflow Runner**:
   - APIs: `POST /workflows/{id}/start`, `POST /workflows/{id}/compensate`.
   - Executes runbooks and reversible actions.
9. **Audit & Reporting**:
   - APIs: `GET /audit/trails`, `GET /audit/approvals`, `GET /audit/redactions`.

**Data flow**: Ingress adapters attach TCBs → Ledger persists + indexes → Orchestrator pulls context → Policy Engine gates actions → Risk/Safety + Cost Guard enforce → Workflow executes + emits telemetry → Ledger/Audit updates → Analytics closes the loop with verified lineage.

## C) Capability Contracts (API surface, provenance touchpoints, test plan, rollback)

| Capability               | API Surface                                                                    | Data/Provenance Touchpoints                                                                   | Test Plan                                                                              | Rollback Story                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Context Travel (TCB)     | `POST /context/bundles`, `GET /context/{tcbId}`, `GET /lineage/{tcbId}`        | TCB stores tenant, subject/object refs, consent/PII, redaction map, timebox, hash + signature | Unit: TCB schema validation; Integration: cross-tenant isolation; E2E: lineage query   | Rotate TCB schema version; invalidate via revocation list; regenerate bundles from ledger events       |
| Governance-First Runtime | `POST /policy/evaluate`, `POST /policy/register`, `GET /policy/decisions/{id}` | Policy decision receipts bound to TCB hash and action ID                                      | Unit: policy allow/deny; Integration: HITL approval paths; Regression: deny-by-default | Disable specific policies via version rollback; revoke receipts; replay actions with prior policy pack |
| Orchestration Execution  | `POST /orchestrations`, `POST /orchestrations/{id}/execute`                    | Execution emits `OrchestrationStarted`, `StepCompleted`, `RollbackIssued` events              | Integration: DAG execution order; E2E: full journey with provenance                    | Rollback tokens invoke compensating actions; pause orchestration and resume from last safe checkpoint  |
| Cost/Latency Guard       | `POST /budgets/{tenant}`, `GET /usage/{tenant}`                                | Usage events linked to TCB, tenant, model/tool identifiers                                    | Unit: quota math; Integration: rate limit; Perf: latency budget enforcement            | Reduce budget to block new actions; drain queue; purge cache entries                                   |
| Observability & Audit    | `POST /telemetry/events`, `GET /audit/trails`                                  | Telemetry and audit are append-only, tied to TCB lineage                                      | E2E: trace propagation; Audit: append-only integrity checks                            | Redirect telemetry sink; rehydrate dashboards from ledger                                              |
| Anti–DX-Debt Controls    | CI gates + `POST /compliance/attest`                                           | Attestation records linked to orchestration version and TCB schema                            | CI: a11y/security/perf; Contract tests for adapters                                    | Block production deploy; rollback to last attested version                                             |
| Integration Ownership    | `POST /adapters/register`, `GET /adapters/{id}`                                | Adapter registry entries signed and linked to governance approvals                            | Integration: adapter contract tests; Ownership: RACI validation                        | Disable adapter via registry flag; revert to fallback adapter                                          |

## D) Epics + Stories (2-week sprint, max 5 epics)

| Epic                                      | User Stories & Tasks                                                                                                                                                                        | Acceptance Criteria                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1: Minimum Viable Orchestration Workflow | US1: Define Content→Decision→Experiment→Analytics→Workflow DAG with TCB propagation. Tasks: orchestration schema, `POST /orchestrations`, TCB carry-forward, provenance emissions.          | Orchestration persisted; executing sample flow produces lineage in ledger; TCB visible at each hop; rollback token generated per action.                   |
| E2: Governance Bundle (Policy + Safety)   | US2: Register policies for model/tool allowlists, PII handling, consent, retention, approvals. Tasks: policy package, `POST /policy/evaluate`, risk scoring, HITL queue, step-up auth hook. | Policy decisions logged with provenance; blocked actions return policy violations; approvals capture approver identity; rejection triggers rollback token. |
| E3: Cost & Latency Guard                  | US3: Set budgets and view token usage. Tasks: budget/usage model, rate limiting, cache for context fetch, circuit breaker metrics.                                                          | Over-budget requests denied with audit trail; P95 latency alert present; cache hits logged; per-tenant usage exportable.                                   |
| E4: Observability Dashboard               | US4: Monitor orchestration health, spend, approvals. Tasks: telemetry schema, `POST /telemetry/events`, dashboard definitions (SLOs, spend, HITL backlog).                                  | Dashboard shows end-to-end trace with TCB IDs; spend/approval metrics per tenant; alert rules defined.                                                     |
| E5: Agentic Journey Demo                  | US5: Run a demo proving end-to-end coordination. Tasks: sample CMS adapter, personalization call, experiment registration, analytics ingestion, workflow action; doc/runbook.               | Demo completes with governance checks, provenance lineage, observability artifacts; no production credentials; reversible via rollback tokens.             |

## E) Key Risks & Mitigations (5–10 items)

1. **Context leakage across tenants** → Enforce TCB tenant IDs, redaction maps, and policy checks at every API; integration tests for cross-tenant isolation.
2. **Governance bypass via direct adapter calls** → Require signed TCBs and policy receipts; reject unsigned ingress; monitor for bypass signatures.
3. **Unbounded agent spend/latency** → Budget caps with hard enforcement; circuit breakers; cache strategy with eviction; alerts on P95 and budget burn rate.
4. **DX debt from prototypes** → Sandbox namespaces with TTL; blocked from production secrets; graduation checklist enforced by CI.
5. **Vendor lock-in** → Reversible adapters with contract tests; bounded contexts and feature flags for cutovers; favor open standards (OPA, OpenTelemetry).
6. **Audit gaps** → Immutable ledger with append-only storage; integrity checks; mandatory provenance link per action.
7. **Approval fatigue** → Risk-based thresholds with auto-approval for low-risk paths and batching; escalation playbooks.
8. **Experiment contamination** → Policy-enforced audience separation; guardrails on concurrent experiments; analytics validation of sample sizes.
9. **Schema drift** → Contract tests for adapters and orchestration schemas; reject incompatible versions; deploy gated by attestation.

## F) Definition of Done (Productionizing Agents/Orchestrations)

- TCB schema applied and validated on all ingress/egress; provenance entries linked and tenant-scoped.
- Policies (allowlists, PII, consent, retention) registered with tests; decision receipts stored.
- Safety gates active: risk scoring thresholds, HITL path, step-up auth, rollback tokens verified.
- Cost/latency controls configured: budgets, rate limits, caching, circuit breaker alerts.
- Observability: traces/metrics/logs and audit trails verified; dashboards/alerts populated with sample runs.
- Security/compliance checks: accessibility/security/performance baselines; schema contracts and integration tests green.
- Graduation checklist complete: sandbox artifacts removed or migrated; documentation and runbooks updated; rollback verified via dry-run.

## G) Forward-Leaning Enhancement (state-of-the-art)

**Contextual Decision Replay (CDR)**: A deterministic replay engine that rehydrates orchestration decisions from ledger events and TCBs to validate policy drift and produce evidence artifacts. CDR enables fast regression testing of governance changes, supports retroactive compliance verification, and provides a governed rollback path for high-risk flows. This is intentionally constrained to governance verification and does not bypass policy gates.
