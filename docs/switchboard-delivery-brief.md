# Switchboard Delivery Brief

## Project codename

Switchboard (Operator unit)

## Owner / Approver(s)

- **Owner:** Platform Engineering Lead (Alex Rivera)
- **Approvers:** Product Lead (Morgan Lee), Security Lead (Priya Desai)

## 1. Mission & Success

- **Outcome (1 sentence):** Deliver a deployable-first Switchboard command center that unifies agents, live intelligence views, and secure collaboration with policy-backed governance.
- **Success metrics (3 max, with targets & dates):**
  1. GraphQL p95 latency < 500ms at p99.9 uptime for the Golden Path by **2026-02-01**.
  2. End-to-end investigation-to-insight flow completed by new analysts in < 15 minutes (median) during UAT by **2026-01-15**.
  3. Zero Sev1 security findings from SAST/DAST/SBOM scans across two consecutive releases by **2026-02-15**.

## 2. Scope

- **Must-haves (v1):** Golden Path automation (investigation → entities → relationships → copilot → results), GraphQL API with provenance, local-first Tauri/Next shell, OPA/ABAC policy enforcement, and observability dashboards.
- **Nice-to-haves:** Offline CRDT sync, live meeting stage with MLS/Double Ratchet chat, and automated cost guardrails for LLM tooling.
- **Non-goals:** Multi-tenant SaaS control plane, third-party marketplace integrations, and custom hardware attestation flows beyond WebAuthn/TPM support.

## 3. Tenant & Topology

- **Tenants:** Single-tenant dedicated deployments per customer environment (Dev/Stage/Prod) with optional disconnected lab.
- **Topology:** Self-hosted air-gappable stack with local-first client; no shared SaaS control plane.
- **Region & residency constraints:** Default US regions; customer choice for data residency with pinned storage buckets and database zones.

## 4. Data & Ingest

- **Sources (S3/CSV, HTTP, file-drop, etc.):** Initial ingest from S3/HTTPS file drops for investigations, GitHub/Jira webhooks, and observability feeds (Prometheus/Grafana JSON).
- **Sample files/schemas provided:** Yes — seeded investigation JSON in `data/golden-path/demo-investigation.json` and schema docs in `docs/ONBOARDING.md`.
- **Volumes & freshness targets:** Starter datasets < 5GB with hourly freshness for events/status bus; nightly bulk loads for historical graphs.
- **Dedup keys / entity IDs:** Entity IDs keyed by normalized `source_system:id` pairs with hash-chained provenance IDs for merges.

## 5. Graph Model Seeds

- **Entities & edges (bullets):**
  - Entities: Investigations, People, Assets, Services, Incidents, Findings, Notes, Actions.
  - Edges: `INVESTIGATION_RELATES_TO` (entities), `ASSIGNED_TO` (people→actions/incidents), `OBSERVED_ON` (assets/services), `DERIVED_FROM` (findings/notes→sources).
- **Merge/dedup rules:** Merge by `(source_system,id)`; prefer most recent timestamp; preserve source-specific attributes with provenance tags.
- **Provenance expectations:** Every mutation emits signed CloudEvents with source, actor, timestamp, and hash chain; lineage visible in audit views.

## 6. API Contracts (GraphQL)

- **Key queries/mutations/subscriptions (with example inputs/outputs):**
  - `investigation(id): Investigation` — returns graph nodes/edges with provenance array.
  - `createFinding(input)` — mutation accepting investigation context, evidence, tags; returns new finding ID + provenance handle.
  - `statusBus` subscription — streams health/events for tiles and copilot context updates.
- **Pagination/backpressure needs:** Cursor-based pagination on list queries (`first/after`) with capped page sizes; subscription consumers must ack with backoff when lag exceeds 5 seconds.

## 7. SLOs & Budgets (confirm/override defaults)

- **API/GraphQL SLOs:** p95 < 500ms, error rate < 0.5%, 99.9% uptime for golden path endpoints.
- **Ingest SLOs:** 99% of webhook/file-drop events ingested within 5 minutes; bulk loads completed nightly within 2 hours.
- **Error budgets:** 0.1% monthly budget for API errors; ingest failures auto-retried up to 3 times before paging.
- **Cost caps (Dev/Staging/Prod):** Dev <$200/mo, Staging <$600/mo, Prod <$3k/mo with LLM spend tracked by cost guard.

## 8. Security & Privacy

- **OIDC provider:** Authentik/Keycloak with WebAuthn/FIDO2; SSO tokens bound to device keys.
- **ABAC policy anchors (tenant/case/role/…):** Tenant + case scope + role + data sensitivity tags enforced via OPA bundles.
- **Sensitivity classes & field-level encryption:** P0 (secret), P1 (restricted), P2 (internal); P0/P1 fields encrypted at rest with per-tenant keys and masked in UI unless policy grants.
- **Warrant/authority binding:** Audit trails bind each action to warrant/authority references stored alongside provenance IDs.

## 9. Policy & Licensing

- **Purpose tags:** Investigation, Collaboration, Audit.
- **Retention tiers per dataset:** Investigations/Findings (7 years), Logs/Status bus (30 days rolling), Media/recordings (90 days unless legal hold).
- **Dataset licenses/TOS constraints:** OSS dependencies under Apache/MIT; external data sources must comply with provider TOS and redact PII per tenant policy.

## 10. Observability & Ops

- **Metrics & alerts:** GraphQL latency/error rates, ingest lag, cost guard spend thresholds, PAN/SFU availability, and policy decision cache hit rates.
- **Dashboards:** Grafana “Summit Golden Path” dashboard plus tenant-specific panels for ingest, agent router, and policy engine health.
- **Change windows & release cadence:** Biweekly releases with 24-hour change windows; emergency patches allowed with retrospective.
- **On-call rota:** Primary/secondary rotations weekly within Platform Eng; Security joins for P0 incidents.

## 11. Compliance & Evidence

- **Required controls (SOC2/ISO/etc.):** SOC 2 Type II-aligned controls (access, change, availability), supply-chain attestations, and secure SDLC checks.
- **Evidence bundle expectations:** CI artifacts (SBOM, Trivy, CodeQL), audit logs, OPA decision logs, and release sign-offs stored per environment.

## 12. People & Timeline

- **RACI (Owner, Reviewer, Approver, QA):**
  - Owner: Alex Rivera (Platform Engineering)
  - Reviewer: Morgan Lee (Product), Priya Desai (Security)
  - Approver: Priya Desai (Security)
  - QA: Jamie Chen (Quality Engineering)
- **Milestones & dates:**
  - v0.1 Golden Path complete: 2024-12-15
  - UAT with pilot analysts: 2025-01-15
  - Production readiness review: 2025-02-01
