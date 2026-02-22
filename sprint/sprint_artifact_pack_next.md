## Sprint Artifact Pack

### 1) Sprint Metadata

- **Sprint Name:** Sprint 20 (Stabilization & Federation)
- **Dates:** Feb 23, 2026 to Mar 6, 2026
- **Sprint Length:** 2 weeks
- **Team:** Agent Lattice (Jules, Codex, Maestro, Aegis)
- **Cadence:** Daily standup (15m), Refinement (60–90m), Review (60m), Retro (60m)

---

### 2) Sprint Goal

**Goal:** Deliver **provable tenant isolation and a unified connector SDK** by completing **hard context propagation and the RSS/Atom connector** end-to-end, with instrumentation and validation, so **zero cross-tenant data leaks occur** and **new ingest sources can be added 3x faster**.

**Success Metrics:**

- Lead time for new connector ≤ 3 days
- Defect escape rate ≤ 0.1 (per feature)
- Adoption: 100% of internal services using unified context
- Performance: p95 ingestion latency ≤ 500ms

---

### 3) Sprint Forecast (Capacity + Commitment Boundary)

**Capacity Planning**

- **Team members:** 4 Agents
- **Working days:** 10
- **Focus factor (meetings/interruptions):** 0.8
- **Planned capacity:** 30 story points
- **Reserved for BAU/interrupts:** 15%

**Commitment Boundary**

- **Committed scope:** items tagged **COMMIT** (US-1, US-2, US-3)
- **Stretch scope:** items tagged **STRETCH** (US-4)

---

### 4) Sprint Backlog (Epics → Stories → Tasks)

#### Epic A: Core Capability Delivery (Federation)

**US-2 (COMMIT):** As a **developer**, I want **a standard SDK for building connectors** so that **I can easily add and manage new data sources**.

- **Acceptance Criteria**
  1. Base `Connector` class defined with lifecycle hooks (init, start, stop, health).
  2. `ConnectorRegistry` service implemented for dynamic discovery.
  3. `CSVConnector` refactored to inherit from SDK.
- **Tasks**
  - Core: Implement `@intelgraph/connector-sdk` package.
  - Registry: Build discovery and heartbeat service.
  - Refactor: Port CSVConnector to SDK.
- **Estimation:** 8 points
- **Dependencies:** None
- **Owner:** Jules

**US-3 (COMMIT):** As an **analyst**, I want **to ingest RSS/Atom feeds** so that **I can track open-source intelligence in real-time**.

- **Acceptance Criteria**
  1. RSS poller fetches entries every N minutes.
  2. Entries mapped to `Indicator` and `Event` nodes in IntelGraph.
  3. Provenance records created for every feed item.
- **Tasks**
  - BE: RSS Poller service implementation.
  - Data: RSS-to-Graph mapping configuration.
  - QA: E2E test with sample feed.
- **Estimation:** 5 points
- **Dependencies:** US-2
- **Owner:** Codex

#### Epic B: Quality + Observability (Hard Isolation)

**US-1 (COMMIT):** As a **tenant admin**, I want **strict data isolation** so that **my information is never exposed to other tenants**.

- **Acceptance Criteria**
  1. Given a request, when `tenant_id` is missing, then return 400 Bad Request.
  2. Database queries automatically include `WHERE tenant_id = current_tenant`.
  3. Isolation tests prove Tenant A cannot see Tenant B data.
- **Tasks**
  - FE/BE: Context propagation middleware.
  - BE: RLS (Row Level Security) or query builder enforcement.
  - QA: Write cross-tenant "attack" test cases.
- **Estimation:** 8 points
- **Dependencies:** None
- **Owner:** Jules

#### Epic C: Tech Debt / Risk Reduction

**US-4 (STRETCH):** Add automated monitoring + alerts for **Connector health**.

- **AC**
  - Dashboard shows connector throughput and error rates.
  - Alert triggers if connector fails 3 consecutive polls.
- **Tasks**
  - Add metrics to SDK.
  - Create Grafana dashboard template.
- **Estimation:** 3 points
- **Owner:** Maestro

---

### 5) Definition of Ready (DoR)

A story is “Ready” when:

- Clear user value + scoped outcome
- Acceptance criteria written (testable)
- Dependencies identified and feasible this sprint
- Designs/UX ready (or explicitly not required)
- Data/analytics needs defined
- Size is within team norms (e.g., ≤ 8 points)

---

### 6) Definition of Done (DoD)

A story is “Done” only when:

- Code merged to main with review
- Automated tests passing (unit/integration as applicable)
- Feature meets acceptance criteria
- Observability added (logs/metrics/traces) where relevant
- Security/privacy checks done (if applicable)
- Documentation updated (user/internal)
- Deployed to staging and validated
- No open P0/P1 bugs

---

### 7) Sprint Plan (Ceremonies + Agenda)

**Sprint Planning (90m)**

- Confirm Goal + Metrics.
- Review Backlog → Mark COMMIT vs STRETCH.

**Daily Standup (15m)**

- Progress toward Goal.
- Blockers.

**Sprint Review (60m)**

- Demo: Tenant isolation proof + RSS ingestion live.

**Retrospective (60m)**

- 1–2 improvement actions max.

---

### 8) Risk Register (Sprint-Scoped)

| Risk               | Likelihood | Impact | Trigger             | Mitigation         | Owner |
| ------------------ | ---------: | -----: | ------------------- | ------------------ | ----- |
| SDK Complexity     |        Low |   High | Task exceeds 2 days | Spike + break down | Jules |
| RSS Feed Flakiness |        Med |    Low | Poll failures >10%  | Robust retry + DLQ | Codex |

---

### 9) Metrics to Track During Sprint

- **Delivery:** Burndown, Cycle Time.
- **Quality:** Escaped defects, Flaky test count.
- **Reliability:** Ingestion error rate.

---

### 10) Sprint Release & Validation Plan

- **Environments:** dev → staging → prod
- **Feature flag:** `enable-rss-connector`
- **Validation checklist**
  - Smoke tests for RSS ingest.
  - Verify `tenant_id` in all Neo4j/Postgres logs.
- **Rollback plan:** revert merge, feature flag off.
