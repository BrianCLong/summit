# Counter-Disinformation GA Sprint Plan

**Role:** GA Release Commander
**Date:** October 2025
**Status:** DRAFT (Execution-Ready)

## 0) Assumptions & Unknowns

**Assumptions:**
1.  **Ingestion is Stable:** The existing `OSINTService` and `StreamingIngestionService` can handle GA-level volume (10k+ events/sec) without major re-architecture.
2.  **Graph Foundation:** `IntelGraphService` and Neo4j schema are sufficient for the "Evidence-Grade Claim Packets"; no schema migrations required for core entities.
3.  **Auth Basics:** `AuthService` (JWT) is production-ready; we just need to add RBAC layers (`MVP1RBACService`) and enforce them.
4.  **UI Components:** `MaestroRunConsole` and `GraphIntelligencePane` are reusable for the "Closed-Loop" workflow with minor modifications.
5.  **Infrastructure:** Kubernetes/Docker deployment via `deploy/` is stable enough for a staged GA rollout.
6.  **No New ML Models:** We will use existing `ContentAnalyzer` and `SentimentService` heuristics; no training new models this sprint.
7.  **Analyst Availability:** The 1 analyst on the team is available full-time for "Human-in-the-loop" testing and playbook validation.
8.  **Partner Integrations:** We are not shipping new external integrations (e.g., Takedown APIs) for GA, just manual export/email.
9.  **Data Retention:** We can rely on `WormStorageService` for audit logs without needing a new dedicated compliance vendor.
10. **Localization:** GA is English-only.

**Top 8 Unknowns & De-Risking Plan:**
1.  **Ingest Latency at Scale:** *Risk:* Kafka/ingest pipeline backs up. *Mitigation:* Run `k6` load test (Day 1) to define exact throughput limits for SLOs.
2.  **Graph Query Performance:** *Risk:* "Claim Packet" generation takes >10s. *Mitigation:* Profile `GraphRAGService` queries (Day 2) and add specific indexes.
3.  **RBAC Granularity:** *Risk:* Permissions are too coarse for enterprise buyers. *Mitigation:* Map roles to `MVP1RBACService` capabilities explicitly (Day 1).
4.  **False Positive Rate:** *Risk:* Alert fatigue. *Mitigation:* Tune `AlertTriageV2Service` thresholds using historical data (Day 2-3).
5.  **Audit Log Completeness:** *Risk:* Critical actions (e.g., "Ignore Alert") aren't logged. *Mitigation:* Audit `ProvenanceLedger` calls against the new workflow (Day 3).
6.  **Export Formatting:** *Risk:* PDF exports (`ReportingService`) look amateur. *Mitigation:* Design review of PDF templates (Day 2).
7.  **Onboarding Friction:** *Risk:* New tenants require manual SQL inserts. *Mitigation:* Script the `TenantService` onboarding flow (Day 4).
8.  **Support Volume:** *Risk:* Team overwhelmed by "how-to" questions. *Mitigation:* Write "Golden Path" documentation (Day 5).

---

## 1) GA Definition of Done (GA DoD)

### A. Product DoD
- [ ] **Closed-Loop Workflow:** End-to-end flow (Alert -> Triage -> Packet -> Response -> Archive) verified by Analyst.
- [ ] **UX Polish:** No broken layouts in `MaestroRunConsole`; consistent "Summit" branding.
- [ ] **Onboarding:** "First Login" experience guides user to configure 1 source and 1 alert.
- [ ] **Accessibility:** Basic keyboard navigation for Triage Queue.

### B. Engineering DoD
- [ ] **Test Coverage:** Unit tests >80% for `InvestigationSessionService` and `ResponseOrchestrator`.
- [ ] **CI/CD:** Green build on `main`; automated deploy to Staging.
- [ ] **Migrations:** All DB migrations (Postgres/Neo4j) tested with rollback scripts.
- [ ] **Performance:** p95 Triage load time < 200ms; Graph expansion < 2s.

### C. SRE/Operations DoD
- [ ] **SLOs:** Defined in `server/src/lib/telemetry/slo.ts` (Ingest Latency, API Availability).
- [ ] **Dashboards:** "GA Health" Grafana dashboard (Ingest Rate, Queue Depth, Error Rate).
- [ ] **Runbooks:** `runbooks/GA_INCIDENT_RESPONSE.md` created and linked in alerts.
- [ ] **Alerts:** Critical alerts (Ingest Down, DB High CPU) routed to PagerDuty/OpsGenie.

### D. Security/Privacy DoD
- [ ] **RBAC:** `ensureRole` middleware applied to all mutating API endpoints.
- [ ] **Audit:** All state changes write to `ProvenanceLedger` with `actor_id` and `tenant_id`.
- [ ] **Retention:** Data expiry job configured (default 30 days) in `DataRetentionService`.
- [ ] **Secrets:** No plaintext secrets in code/env logs; use `SecretsService`.

### E. Trust & Safety DoD
- [ ] **Review Gates:** "Publish" action requires second-person approval (simulated via permissions).
- [ ] **Misuse Controls:** Rate limits on "Add Source" and "Export" endpoints.
- [ ] **Policy:** Terms of Service link visible in UI footer.

### F. Customer Readiness DoD
- [ ] **Docs:** "Analyst Guide" and "Admin Guide" published to `docs/`.
- [ ] **Status:** Status page mechanism (even if manual) established.
- [ ] **Release Notes:** drafted for `release_notes/v1.0.0.md`.

---

## 2) Unfair Advantage Thesis

**Competitor Landscape:**
*   **Monitoring-Only:** (Dataminr, etc.) Great firehose, but no workflow. Overwhelms analysts.
*   **Analytics-Only:** (Graphika, etc.) Great reports, but slow and disconnected from ops.
*   **Trust & Safety Vendors:** (ActiveFence, etc.) Focused on *moderation* (removing bad stuff), not *counter-ops* (defending narratives).

**Why They Fail GA:** They sell "insights" but leave the customer to figure out "what do I do now?". They lack the **Response** half of the loop.

**Why We Win:** We sell the **"Closed-Loop Incident Response Engine."** We don't just show you the lie; we build the **Evidence-Grade Claim Packet** that proves it, and orchestrate the **Response**. We are the "PagerDuty for Disinformation."

**Positioning Statement:**
"The only civic-grade, audit-ready incident response platform that turns disinformation noise into measurable containment."

---

## 3) The “Inevitable Workflow” (The Magic Loop)

**Trigger:**
*   **System:** `AlertingService` detects anomaly (Velocity spike > 3σ) OR `OSINTService` matches Watchlist.
*   **Output:** Creates `Incident` in Triage Queue.

**Step 1: Triage & Verification (Analyst)**
*   **Action:** Analyst views `GraphIntelligencePane`. Confirms "Is this hostile?"
*   **Decision:** "Dismiss" (False Positive) OR "Investigate" (Promote to Case).
*   **System:** Logs decision to `ProvenanceLedger`.

**Step 2: Evidence Packet Creation (Analyst + System)**
*   **Action:** Analyst selects nodes in Graph. System auto-generates `ClaimPacket`.
*   **Content:** Who (Sources), What (Content), When (Timeline), Reach (Metrics), Attribution (if known).
*   **System:** Hashes packet for chain-of-custody.

**Step 3: Response Orchestration (Commander)**
*   **Action:** Commander selects "Response Playbook" (e.g., "Corrective Fact Check", "Platform Takedown Request").
*   **Draft:** Generates response assets (PDF export, email draft).
*   **Gate:** Requires "Approver" role to click "Approve".

**Step 4: Measurement & Learning (System)**
*   **Action:** System tracks specific "Rumor Keywords" post-response.
*   **Metric:** "Rumor Decay Rate" vs. Baseline.
*   **Update:** Closes loop by updating `AlertingService` thresholds.

**Journey:**
*   **Day 0:** Ingests data, establishes baseline.
*   **Day 7:** First real incident routed to Triage.
*   **Day 30:** "Monthly Impact Report" auto-generated showing "Time-to-Containment" reduction.

---

## 4) GA Sprint Plan (2 Weeks)

**Sprint Goal:** Ship the "Closed-Loop Response" workflow (Triage → Packet → Approve) with audit logging to enable a defensible GA launch.

### Epic 1: The Response Engine (Workflow)
1.  **Story: Triage Queue Upgrade**
    *   *As an* Analyst, *I want* a unified queue of Alerts, *so that* I can rapidly dismiss or promote them.
    *   *Acceptance:* List view, "Dismiss/Promote" buttons, keyboard shortcuts. `IncidentService` updates status.
2.  **Story: Evidence Packet Generator**
    *   *As an* Analyst, *I want* to click "Generate Packet" on a Case, *so that* I get a portable evidence bundle.
    *   *Acceptance:* JSON/PDF output including selected graph nodes and metadata. Stored in `WormStorage`.
3.  **Story: Approval Gate**
    *   *As a* Manager, *I want* to approve response actions, *so that* no unverified info is released.
    *   *Acceptance:* "Publish" button disabled for Analysts. Enabled for Managers. State change logged.
4.  **Story: Response Export**
    *   *As an* Analyst, *I want* to export the Packet + Response Plan, *so that* I can email stakeholders.
    *   *Acceptance:* Clean PDF generation via `ReportingService`.

### Epic 2: Trust & Architecture (The Rails)
1.  **Story: RBAC Enforcement**
    *   *As a* Security Lead, *I want* API endpoints to check roles, *so that* Analysts can't change configurations.
    *   *Acceptance:* `ensureRole('ADMIN')` on config routes. Tests verify 403s.
2.  **Story: Provenance Logging**
    *   *As an* Auditor, *I want* every state change logged, *so that* I can reconstruct the incident timeline.
    *   *Acceptance:* `ProvenanceLedger` records `UserID`, `Action`, `Timestamp`, `ArtifactID` for all workflow steps.
3.  **Story: SLO Monitoring**
    *   *As an* Ops Lead, *I want* alerts if Ingest lag > 5m, *so that* I trust the data is real-time.
    *   *Acceptance:* Prometheus alert rule created. PagerDuty mock integration.

**Timeline:**
*   **Day 3 Demo:** "Thin Slice" - Alert appears in Queue, Analyst clicks "Promote", Packet JSON generated.
*   **Day 10 Demo:** Full Loop - Alert → Triage → PDF Packet → Approval → "Sent".
*   **Cut Line:** "Outcome Measurement" (Step 4 of workflow) - can be manual/mocked for GA if needed.

---

## 5) Architecture & Operational Readiness

**High-Level Architecture:**

```
[OSINT Sources] --> [Ingest Service] --> [Kafka/Queue] --> [Enrichment]
                                                              |
                                                       [IntelGraph (Neo4j)]
                                                              |
[Analyst UI] <--> [API Gateway (Node)] <--> [Services (Incident, Alerting)]
                        |                                     |
                 [Auth Service]                       [Provenance Ledger]
```

**Key Services & Failure Modes:**
*   `IngestionService`: Backpressure (Risk: Data lag). *Mitigation:* DLQ + Auto-scaling.
*   `IntelGraphService`: Slow Queries (Risk: UI timeout). *Mitigation:* Read replicas + Caching.
*   `ProvenanceLedger`: Write failure (Risk: Compliance breach). *Mitigation:* Fail-closed (stop workflow if audit fails).

**SLOs:**
*   **Ingest Latency:** 99% of events indexed < 60s.
*   **API Availability:** 99.9% uptime (business hours).
*   **Triage Load:** p95 < 500ms.

**Observability:**
*   **Dashboards:**
    1.  *Executive View:* Active Incidents, MTTR (Mean Time To Resolve).
    2.  *Ops View:* Ingest rate, Lag, Error rates.
    3.  *Analyst View:* Personal Queue depth.
*   **Logging:** JSON structured logs with `trace_id`.

**Alerting (Top 5):**
1.  `IngestLagHigh` (> 5 mins) -> Sev 2
2.  `ApiErrorRateHigh` (> 5%) -> Sev 1
3.  `Neo4jUnreachable` -> Sev 1
4.  `DiskUsageHigh` (> 85%) -> Sev 3
5.  `HighTriageQueue` (> 100 pending) -> Sev 3

---

## 6) Security, Privacy, & Compliance Blueprint

**Threat Model (Top 3):**
1.  **Insider Threat:** Rogue analyst fabricates evidence. *Mitigation:* Immutable `ProvenanceLedger` + 4-eyes approval.
2.  **Data Leakage:** Exporting sensitive graph data. *Mitigation:* `DLPService` (mock/basic) + Audit Log on Export.
3.  **Account Takeover:** *Mitigation:* Enforce MFA (via `AuthService`) for Admin/Approver roles.

**RBAC Matrix:**
*   **Viewer:** Read-only Dashboards.
*   **Analyst:** Triage, Create Packet, Draft Response.
*   **Approver:** Approve/Reject Response, User Mgmt.
*   **Admin:** System Config, integrations.

**Data Retention:**
*   **Raw Events:** 30 days (Hot), 1 year (Cold/S3).
*   **Incidents/Packets:** 7 years (Compliance requirement).
*   **Deletion:** "Right to be Forgotten" endpoint implemented in `PrivacyService`.

**Compliance Posture:**
*   "Audit-Ready Architecture" (Logs exist).
*   "SOC2 Preparable" (Controls defined, not certified).

---

## 7) Trust & Safety / Misuse Prevention

**Misuse Vectors:**
*   Using the tool to *generate* harassment lists.
*   Selectively editing evidence to frame a target.

**Controls:**
*   **No "Targeting" Features:** We do not build "find vulnerable users" tools.
*   **Context Preservation:** `ClaimPacket` always includes the full context window, preventing selective cropping.
*   **Transparency Logs:** Every export includes a footer: "Generated by Summit IntelGraph [Date/Time] [Hash]".
*   **Safe Response:** Playbooks emphasize "Correction" and "Context", strictly forbidding "Counter-Harassment".

**Human-in-the-Loop:**
*   Automated Triage -> **Human Verification** (Mandatory) -> **Human Approval** (Mandatory for Publish).
*   No fully autonomous response.

---

## 8) Measurement & Proof of Value

**North Star Metric:** **Time-to-Containment (TTC)**
*   Time from "First Detection" to "Response Approved".

**Supporting Metrics:**
1.  **Triage Efficiency:** Alerts processed per analyst/hour.
2.  **False Positive Rate:** % of alerts dismissed.
3.  **Rumor Decay:** (Post-GA) Rate of decline in mentions after response.

**Outcomes Dashboard:**
*   "This Week: 5 Incidents Contained. Avg TTC: 45 mins (vs 2h baseline)."

**Rumor Containment Score (Draft):**
`RCS = (Peak_Velocity / Time_to_Response) * Decay_Rate`
*   Higher is better.

---

## 9) Launch Plan (GA)

**Rollout:**
1.  **Internal Alpha (Day 10):** Dev team uses it to track internal "rumors" (dogfooding).
2.  **Design Partner (Day 14):** 1 Trusted Customer (hands-on session).
3.  **Staged GA (Day 30):** Invite-only for waitlist.

**Documentation:**
*   [ ] `docs/user/analyst-guide.md` (Screenshots of Triage).
*   [ ] `docs/admin/configuration.md` (RBAC, Retention).
*   [ ] `docs/playbooks/standard-response.md`.

**Support:**
*   Email support alias (`support@...`) routed to Engineering rotation initially.
*   SLA: < 4 business hours for Sev 1.
