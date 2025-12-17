# Approvals & Rationale Center v1 — Jira/Linear Backlog

**Sprint theme:** Approvals & Rationale Center v1 (make Switchboard the review/approval hub for high-risk ops)

**Sprint goal:** Ship a production-grade Approvals & Rationale Center in Switchboard, wired to OPA/ABAC policies and the provenance ledger, with a demo-able end-to-end flow from request → review → approval → evidence.

**Timebox:** 2 weeks

## Backlog Conventions
- IDs follow the pattern `ARC-<epic letter><sequence>` (e.g., ARC-A1).
- Story points use Fibonacci sizing (1, 2, 3, 5, 8, 13).
- Owner is the accountable role (not the sole contributor): FE = Frontend, BE = Backend, INFRA = Platform/SRE, SEC = Security/Policy, DOCS = Docs/Enablement.
- All stories inherit the Definition of Done from the sprint brief: tests written/passing, accessibility basics, OPA policy and provenance hooks wired where relevant, and demo readiness for the targeted flow.

## Epic A — Approvals & Rationale Center UI/UX
| ID | Title | Owner | Points | Acceptance/Notes | Dependencies |
| --- | --- | --- | --- | --- | --- |
| ARC-A1 | Approvals nav entry + route shell | FE | 2 | New “Approvals” section appears in nav; route guard enforces tenant scoping and ABAC. Basic skeleton renders without data errors. | None |
| ARC-A2 | Approvals list view with filters/search | FE | 5 | Table columns: ID, requester, operation type, target entity, risk level, status, created at, SLA deadline. Filters for status/risk/operation/tenant and search by ID/target name. p95 load ≤1s for 1k approvals (mocked). Keyboard nav + ARIA for table. Unit tests cover data hook and filter logic. | ARC-A1, ARC-B1 (API shape) |
| ARC-A3 | Approval detail view with context + timeline preview | FE | 5 | Detail page/pane shows sanitized request payload, policy decision + reason, required attributes, rationale history, graph snapshot for at least TenantDataStore, and mini timeline (last N events). Component tests mock backend. Provenance event IDs clickable. | ARC-A1, ARC-B1, ARC-B3 |
| ARC-A4 | Approve/reject with mandatory rationale | FE | 5 | Rich text/structured rationale field. High-risk operations require non-empty rationale; client validation blocks submission. SLA or policy warnings surface inline. E2E happy path recorded (mock backend OK). | ARC-A3, ARC-B2 |
| ARC-A5 | Timeline deep-link integration | FE | 3 | Clicking provenance/timeline IDs from detail view opens Timeline pane with matching event pre-selected. Works for approved requests with evidence bundle. | ARC-A3, ARC-B3 |
| ARC-A6 | Accessibility + visuals pass | FE | 3 | Screen-reader labels for list/detail actions, focus management on modals/forms, color contrast meets WCAG AA. Snapshot test for list and detail. | ARC-A2–A5 |
| ARC-A7 | Approvals health card (per tenant) | FE | 5 | Dashboard card shows approvals last 24h, SLA breach count, average approval time; loads ≤1s for tenants with 10k approvals/30 days. Numbers match metrics backend (mocked contract test). Snapshot test captured for demo dataset. | ARC-B1, ARC-C1 |

## Epic B — Backend Approval Engine + OPA/ABAC Integration
| ID | Title | Owner | Points | Acceptance/Notes | Dependencies |
| --- | --- | --- | --- | --- | --- |
| ARC-B1 | Approval request ingestion API | BE | 8 | gRPC/HTTP endpoint accepts tenant_id, requester_identity, operation_type, target_entities, risk_score, metadata, idempotency key. Idempotent create returns same approval for duplicate keys. Schema validation + policy precheck. Evidence/receipt with signed hash on create. OpenAPI updated; contract tests for 3+ operation types. | None |
| ARC-B2 | OPA policy package for approvals | SEC | 8 | `approvals/decision.rego` defines: who can request/approve per tenant/env/risk band; rationale requirements per operation type. Simulation endpoint returns allow/deny + explanation. Policy unit tests ≥80% coverage; CI job for lint/test with coverage artifact. | ARC-B1 |
| ARC-B3 | Provenance/evidence bundle plumbing | BE | 8 | Evidence schema includes request, decision, rationale, approver identity, timestamps; receipt adds approval_ref hash chain. Storage adapter (S3/GCS) with retry + DLQ job. Chaos test simulates storage outage with alert. Evidence retrievable by ID. | ARC-B1 |
| ARC-B4 | Approve/reject command API | BE | 5 | Endpoint to approve/reject with rationale; enforces high-risk rationale server-side; writes provenance event + updates status. Returns updated resource + receipt reference. | ARC-B1, ARC-B2, ARC-B3 |
| ARC-B5 | Policy simulation endpoint for UI | BE | 3 | Exposes “what-if” simulation (input overrides) returning decision + explanation tree; latency budget ≤500ms p95 under synthetic load. | ARC-B2 |
| ARC-B6 | Seed data + fixtures for demo tenants | BE | 3 | Seed script populates approvals, rationale history, and timeline events for demo tenants; deterministic IDs for repeatable demos/tests. | ARC-B1–B4 |

## Epic C — Observability & SLOs for Approvals
| ID | Title | Owner | Points | Acceptance/Notes | Dependencies |
| --- | --- | --- | --- | --- | --- |
| ARC-C1 | Metrics + tracing instrumentation | INFRA | 5 | Emit approvals_created/approved/rejected_total, approvals_sla_breached_total, decision_latency_ms. Traces from request → OPA → evidence write. Example trace stored. Alert rules: p95 decision latency and SLA breaches thresholds. | ARC-B1–B4 |
| ARC-C2 | Grafana dashboard | INFRA | 3 | Dashboard panels for per-tenant/global metrics; latency histogram, SLA breach chart, volume counters. Linked from runbook. | ARC-C1 |
| ARC-C3 | Synthetic probe + SLO validation | INFRA | 5 | Probe exercises create/decision endpoints; reports to dashboard. Reliability target: p99 error rate ≤0.5% under synthetic test. Runbook entry for interpreting alerts. | ARC-C1, ARC-C2 |
| ARC-C4 | Approvals health card backend aggregation | BE | 3 | Aggregation endpoint powering FE card with 24h counts, SLA breaches, avg approval time; matches metrics backend consistency check. | ARC-B1, ARC-C1 |

## Epic D — Packaging, Docs, and Runbook
| ID | Title | Owner | Points | Acceptance/Notes | Dependencies |
| --- | --- | --- | --- | --- | --- |
| ARC-D1 | Helm/Terraform updates | INFRA | 5 | Charts/modules include approvals service, env vars/secrets, OPA config, metrics/logs storage. `helm install` fresh env brings up approvals flow; Terraform plan/apply succeeds without manual edits. SBOM + cosign signing documented. | ARC-B1–B4, ARC-C1 |
| ARC-D2 | Runbook: approvals latency/evidence/policy failures | DOCS | 3 | Runbooks for “Approvals latency high”, “Evidence writes failing”, “Policy misconfiguration blocks approvals”; linked from Switchboard error surfaces. Includes DR/chaos scenario resolution. | ARC-C1, ARC-B3, ARC-B2 |
| ARC-D3 | Admin guide for risk configuration | DOCS | 3 | Admin guide for configuring high-risk operations and approver roles per tenant. Includes feature flag/deployment snippet and references to policy bundle. | ARC-B2, ARC-D1 |
| ARC-D4 | Demo script + release notes | DOCS | 2 | Step-by-step demo script covering request → approval → evidence timeline; release note highlights sprint outputs and feature flag usage. | ARC-A2–A5, ARC-B4, ARC-B3 |

## Backlog Ordering (top 10 for sprint start)
1) ARC-B1, 2) ARC-B2, 3) ARC-B4, 4) ARC-B3, 5) ARC-A1, 6) ARC-A2, 7) ARC-A3, 8) ARC-A4, 9) ARC-C1, 10) ARC-D1.

## Risks & Mitigations
- **Latency budget risk** (policy simulation + evidence write): prototype with cached policy bundle and async evidence flush (ARC-B3) to keep request path fast.
- **Cross-tenant data leakage**: enforce tenant-scoped queries and ABAC checks in both UI data hooks and APIs (ARC-A2/A3 + ARC-B1/B4); add automated contract tests for tenant isolation.
- **Storage outage during evidence writes**: DLQ + retries from ARC-B3; add alert tied to ARC-C1 metrics.
- **Demo fragility**: seeded tenants and deterministic IDs (ARC-B6) plus demo script (ARC-D4) reduce variance.

## Forward-Looking Enhancements
- Add approval templates with parameterized policy snippets per operation type to reduce OPA evaluation overhead and simplify simulations.
- Introduce adaptive risk scoring fed by provenance and timeline history (lightweight feature store) to auto-raise rationale requirements for suspicious patterns.
- Explore offline signing of evidence bundles via hardware-backed keys for stronger non-repudiation.
