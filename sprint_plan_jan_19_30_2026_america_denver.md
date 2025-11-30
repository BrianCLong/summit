# Sprint: Jan 19–30, 2026 (America/Denver) — "Design Partner Onboarding"

**Sprint Goal:** Make it dead-simple for external design partners to try the golden path safely. Focus on onboarding flows, sandboxed tenancy, auditability, and “getting started” assets so a new org can: import data → run NL graph queries → compile a brief → export with provenance, all without hand-holding.

---

## Sprint Backlog (stories, AC, estimate)

1. **Tenant Bootstrap Wizard (MVP)** — *8 pts*
   As an admin, I can create a tenant in <10 min with defaults for RBAC, data retention, and redaction presets.
   **AC:** Guided steps, validation, idempotent; emits an audit event trail; rollback deletes all artifacts cleanly.

2. **Self-Serve Ingest Samples & Fixtures** — *5 pts*
   As a new analyst, I can load sample datasets (CSV/JSON) + a prebuilt graph fixture to complete the golden path in <20 min.
   **AC:** One-click load, clear docs, teardown script; works in fresh tenants.

3. **Getting Started Tour (Product Tours)** — *5 pts*
   As a first-time user, I get inline tips across ingest → NL→Cypher → Authority Compiler → export.
   **AC:** Dismissible, persisted; re-openable from Help; no impact on keyboard nav.

4. **Audit Log v1 (Search + Export)** — *8 pts*
   As compliance, I can query audit events by actor, object, and time, and export a signed log bundle.
   **AC:** 10 event families logged (auth, ingest, query, compile, export, overrides); export includes hash and manifest.

5. **Sandboxed Tenancy Guardrails** — *5 pts*
   As an operator, each partner runs in an isolated namespace with quotas and safe defaults (no external egress by default).
   **AC:** Quotas enforced; cross-tenant tests = 0 leakage; egress allowlist.

6. **Authority Compiler: Templates Pack + Share Link** — *5 pts*
   As an author, I can start from 5 curated templates and share a read-only link inside the tenant.
   **AC:** Template gallery; share link respects RBAC; link revocation works.

7. **Export UX Polish + Failure Explainability** — *3 pts*
   As a user, if export fails (license/provenance), I see a human-readable reason and “fix-it” link.
   **AC:** Reasons mapped to policy, owner, and next action; copy reviewed.

**Stretch (time-boxed):**
8. **Billing/Metering (Shadow Mode)** — *3 pts*
   Track usage by tenant (queries, tokens/rows, exports) without enforcement.
   **AC:** Daily rollups; basic dashboard.

*Total forecast: 39 pts (stretch optional).* 

---

## Definition of Done (DoD)

* All AC met; behind flags where applicable; stage demo updated; user and ops docs merged.
* Unit + contract tests; one recorded E2E from *fresh tenant* through export.
* Security: tenancy isolation tests, audit log coverage documented; no critical findings.
* Observability: dashboards include audit-log ingest rate, bootstrap success, and export failure reasons.

## Definition of Ready (DoR)

* Each story has AC, dependencies, flags, sample data, and rollback notes; UI stories include wire or copy doc.

---

## Capacity & Calendar

* **Capacity:** ~40 pts.
* **Ceremonies:**
  * Sprint Planning: Mon Jan 19, 09:30–11:00
  * Daily Stand-up: 09:15–09:30
  * Mid-sprint Refinement: Thu Jan 22, 14:00–14:45
  * Sprint Review (live partner demo): Fri Jan 30, 10:00–11:00
  * Retro: Fri Jan 30, 11:15–12:00

---

## Environments, Flags, Data

* **Envs:** dev → stage (partner sandboxes).
* **Flags:** `tenantBootstrapWizard`, `sampleDataPacks`, `productToursV1`, `auditLogV1`, `tenantGuardrails`, `authorityTemplatesPack`, `exportExplainV1`, (`billingShadowV0` stretch).
* **Test Data:** Sample CSV/JSON bundles, prebuilt graph fixture, canned evidence sets, two license models for negative tests.

---

## QA Plan

**Functional:**

* Bootstrap wizard happy/rollback paths; default RBAC & retention applied.
* Sample data one-click load; teardown leaves no residue.
* Tours appear only for first-time users; accessibility pass (keyboard/screen reader).
* Audit search by actor/object/time; export signed and verifiable.
* Tenant quotas & egress allowlist enforced; cross-tenant leakage tests.
* Authority templates pack; read-only share link honors RBAC.
* Export failures show reason + fix path.

**E2E:** Fresh tenant → sample load → ask NL question (see Cypher preview) → compile brief (template) → export (PASS) and audit export.

**Non-functional:**

* p95 onboarding flow (<10 min bootstrap, <20 min golden path).
* Audit log write/read SLO and index size checks.

---

## Risks & Mitigations

* **Bootstrap complexity across envs** → idempotent scripts + teardown verified in CI.
* **Tour fatigue** → dismiss persistence + Help relaunch; limit to 5 concise steps.
* **Audit log cost/volume** → partitioned storage + retention policy defaults.
* **Isolation edge cases** → add fuzz tests for headers/claims; egress allowlist by default.

---

## Reporting Artifacts (to produce this sprint)

* Partner onboarding runbook, 10-minute quickstart, demo script, risk register, burndown & throughput, SLO snapshots (start/end).

---

## Demo Script (review)

1. **Admin:** Run Tenant Bootstrap Wizard → defaults applied, audit trail visible.
2. **Analyst:** One-click load of samples → NL question → Cypher preview → sandbox run.
3. **Author:** Open Authority Compiler → select template → add/edit → share read-only link.
4. **Compliance:** Trigger export → PASS badge; show audit log search; simulate failure to show reason + fix link.
5. **Ops:** Show quotas and egress allowlist; (if enabled) peek at shadow usage dashboard.

---

## Jira-ready ticket matrix (copy/paste)

| ID      | Title                                           | Owner  | Est | Dependencies | Acceptance Criteria (summary)                                            |
| ------- | ----------------------------------------------- | ------ | --: | ------------ | ------------------------------------------------------------------------ |
| ONB-101 | Tenant Bootstrap Wizard (MVP)                   | BE+FE  |   8 | —            | Create tenant with defaults; rollback cleans fully; audit events emitted |
| ONB-111 | Sample Data Packs (Load/Teardown)               | BE     |   3 | —            | One-click load & teardown; works on fresh tenants                        |
| ONB-112 | Graph Fixture for Golden Path                   | BE     |   2 | ONB-111      | Fixture loads; NL→Cypher demo queries pass                               |
| ONB-121 | Product Tours Framework                         | FE     |   3 | —            | Step-by-step hints; dismiss & relaunch; a11y pass                        |
| ONB-122 | Tours Content (Golden Path)                     | PM+FE  |   2 | ONB-121      | Copy reviewed; metrics on completion                                     |
| ONB-131 | Audit Log v1 (Ingest & Query)                   | BE     |   3 | —            | Events persisted & queryable                                             |
| ONB-132 | Audit Log v1 (Compile & Export + Signed Bundle) | BE     |   5 | ONB-131      | Export bundle signed; manifest included                                  |
| ONB-141 | Tenancy Guardrails (Quotas & Egress)            | BE+Ops |   5 | —            | Quotas enforced; allowlist default; tests green                          |
| ONB-151 | Templates Pack + Read-only Share                | FE+BE  |   5 | —            | Gallery, share link, revoke; RBAC respected                              |
| ONB-161 | Export Failure Explainability                   | FE     |   3 | —            | Reasons mapped; fix-it links; copy reviewed                              |
| ONB-171 | Shadow Billing/Metering (Stretch)               | BE+Ops |   3 | —            | Daily rollups; dashboard tiles                                           |

---

### Outcome of this sprint

A fully **onboardable** product: clean tenant bootstrap, safe isolation, clear tours, auditable actions, and a frictionless path for design partners to generate real value (and for us to observe it). Ready for scaled partner invites the following sprint.
