# Sprint: Mar 2–13, 2026 (America/Denver) — “Early Access **Launch**”

**Sprint Goal:** Open the gates to a controlled Early Access (EA) cohort. Ship trust & readiness: (1) tenant backup/restore, (2) incident & status comms, (3) SOC-2 lite controls & audit packs, (4) plan-based feature gating end-to-end, (5) in-app announcements & changelog, (6) DR drill.

---

## Sprint Backlog (stories, AC, estimate)

1. **Tenant Backup/Restore (MVP)** — *8 pts*
   As an admin, I can snapshot a tenant (config + policy + graph + evidence bundles) and restore to a fresh sandbox.
   **AC:** Snapshot completes <15 min on golden tenant; restore idempotent; cryptographic manifest; RBAC preserved.

2. **Incident Comms & Status Page** — *5 pts*
   As an operator, I publish incidents/maintenance with tenant impact, timelines, and RCA notes.
   **AC:** Public status page + in-app banner; templated comms; webhook for partner Slack.

3. **SOC-2 Lite Control Pack** — *5 pts*
   As a prospect, I can request a downloadable control pack (change mgmt, access, backup, audit logging).
   **AC:** Generated PDF/HTML pack; evidence links to audit queries; date-stamped.

4. **Plan-Based Feature Gating (E2E)** — *5 pts*
   As PM/FE/BE, features are gated by plan (Free/Pro/Ent) across UI, API, and export.
   **AC:** Central policy; 10 contract tests; “blocked by plan” UX consistent.

5. **In-App Announcements & Changelog** — *5 pts*
   As a user, I see a non-intrusive announcement center and a versioned changelog tied to flags/releases.
   **AC:** Dismissible; per-tenant targeting; permalink to release notes.

6. **Disaster Recovery Drill (Tabletop + Sim)** — *5 pts*
   As ops, we run a DR play: simulate region outage; restore two tenants from latest backups; RTO/RPO recorded.
   **AC:** Tabletop doc + simulated drill; RTO≤4h, RPO≤24h on test tenants; follow-ups logged.

7. **Support Escalation & On-Call Runbooks** — *3 pts*
   As support, I have clear L1→L2→Eng escalation, with APIs/queries for common diagnostics.
   **AC:** Playbooks published; escalation SLAs; one live drill.

**Stretch (time-boxed):**
8) **Data Residency Selector (EU/US Beta)** — *3 pts*
Tenant can be pinned to EU/US data plane at create time.
**AC:** Residency label enforced in storage & compute; cross-region export blocked unless allowed.

*Total forecast: 36–39 pts (stretch optional).*

---

## Definition of Done (DoD)

* All AC met; feature flags controllable per plan and per tenant; stage demo updated.
* Tests: unit + contract; recorded E2E covering backup→restore→export; plan-gating contracts.
* Security/GRC: SOC-2 lite pack generated; access reviews run; audit queries captured.
* Observability: dashboards include snapshot duration, restore success, incident publish SLA, DR RTO/RPO.

## Definition of Ready (DoR)

* Each story has AC, dependencies, rollback, test data/tenants, and comms templates (where applicable).

---

## Capacity & Calendar

* **Capacity:** ~38–42 pts.
* **Ceremonies:**

  * Sprint Planning: Mon Mar 2, 09:30–11:00
  * Daily Stand-up: 09:15–09:30
  * Mid-sprint Refinement: Thu Mar 5, 14:00–14:45
  * Sprint Review (EA go/no-go): Fri Mar 13, 10:00–11:00
  * Retro: Fri Mar 13, 11:15–12:00

---

## Environments, Flags, Data

* **Envs:** dev → stage (EA cohort tenants) with canary + auto-rollback; offsite snapshot bucket.
* **Flags:** `tenantBackupRestore`, `incidentComms`, `soc2LitePack`, `planGatingE2E`, `announcementsChangelog`, `drDrillV1` (+ `residencySelectorEUUS` stretch).
* **Test Data:** Two golden tenants (Pro/Ent), seeded graphs/evidence, synthetic outages, sample incident templates.

---

## QA Plan

**Functional:**

* Backup creates verifiable snapshot; restore preserves RBAC/policies.
* Status page + banners; webhooks post to test Slack; comms templates render.
* SOC-2 pack builds with live evidence links; timestamps correct.
* Plan gating: UI/API/export consistent; negative tests show humane block + upgrade path.
* Announcements center targets tenants; changelog entries link to release notes.
* DR drill: restore 2 tenants; RTO/RPO captured; follow-ups filed.
* Support runbooks accessible; escalation drill completes within SLA.

**E2E:** Create snapshot → simulate incident → publish status → restore tenant → verify export PASS → annc/changelog entry published.

**Non-functional:**

* Snapshot duration p95; restore success rate; incident publish SLA (<15 min); DR drill RTO/RPO; status page uptime.

---

## Risks & Mitigations

* **Snapshot size/time bloat** → dedupe + delta strategy; off-peak scheduling; progress UI.
* **Inconsistent plan gating** → central policy layer + contract tests at API boundary.
* **Incident comms latency** → canned templates + on-call guard; automation to prefill tenant impact.
* **DR drill gaps** → tabletop before sim; capture blameless follow-ups with owners/dates.
* **SOC-2 evidence drift** → nightly job to verify links; pack shows build date and versions.

---

## Reporting Artifacts (produce this sprint)

* EA launch checklist, DR drill report (RTO/RPO), incident/RCA templates, SOC-2 lite control pack, release notes & changelog, burndown/throughput, SLO snapshots.

---

## Demo Script (review)

1. Trigger **snapshot** on a Pro tenant → verify manifest + duration.
2. Flip **incident** to “degraded” → status page + in-app banner + Slack webhook fire.
3. Run **restore** into sandbox → RBAC/policies intact → complete export with PASS badge.
4. Open **SOC-2 Lite Pack** → show evidence-linked sections (access, backup, audit).
5. Toggle **plan gating** on a feature from Pro→Free to show consistent block UX.
6. Post **announcement** and **changelog** entry → targeted tenant sees banner + permalink.
7. Review **DR drill** metrics (RTO/RPO) and support escalation runbook.

---

## Jira-ready ticket matrix (copy/paste)

| ID       | Title                                       | Owner       | Est | Dependencies | Acceptance Criteria (summary)                   |
| -------- | ------------------------------------------- | ----------- | --: | ------------ | ----------------------------------------------- |
| EA-101   | Tenant Snapshot (Create/Verify)             | BE          |   5 | —            | Snapshot with manifest; duration metric         |
| EA-102   | Tenant Restore (Sandbox)                    | BE          |   3 | EA-101       | Idempotent; RBAC/policy preserved               |
| REL-111  | Status Page + Incident Banners              | FE+Ops      |   5 | —            | Publish incidents; Slack webhook; templates     |
| GRC-121  | SOC-2 Lite Control Pack                     | PM+BE       |   5 | —            | Pack generated; evidence links; timestamped     |
| PLAN-131 | Plan-Based Feature Gating (E2E)             | BE+FE       |   5 | —            | Central policy; UI/API/export consistent        |
| COM-141  | Announcements Center + Changelog            | FE          |   5 | —            | Dismissible; targeted; permalink                |
| OPS-151  | DR Drill (Tabletop + Sim)                   | Ops         |   5 | EA-101/102   | RTO≤4h; RPO≤24h; report published               |
| SUP-161  | Support Escalation Runbooks + Drill         | Support+Ops |   3 | —            | Playbooks live; drill passes SLA                |
| RES-171  | Data Residency Selector (EU/US) *(Stretch)* | BE+Ops      |   3 | —            | Residency enforced; cross-region export blocked |

---

### Outcome of this sprint

We exit with **EA-ready** fundamentals: trustworthy backups/restores, crisp incident communications, a downloadable control pack, consistent plan gating, clear announcements/changelog, and a practiced DR motion—unlocking a safe, confident Early Access launch.
