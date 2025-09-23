# IG Squad — Sprint 24 (Sep 22 – Oct 3, 2025)

> **Charter:** accelerate activation, measure value, and drive compounding growth that supports the core Sprint 24 plan.

---

## 1) Sprint Goal

1. Lift **new-user activation rate by +8%** via onboarding improvements and timely nudges.
2. Ship **search engagement telemetry** to validate latency/relevance changes.
3. Deliver **one scalable lifecycle channel** (email) with experimentable templates.

**Definition of Success**

- Activation (D7) ≥ 50% (baseline 42%).
- Search CTR +6% with stable zero-result rate (±1%).
- Lifecycle infra: 100% of eligible users reachable, hard bounces < 0.8%.

---

## 2) Team & Roles

- **PO:** <Name> | **Scrum Master:** <Name> | **Tech Lead:** <Name>
- **Engineers:** <Names> | **Design/Content:** <Name> | **Data/Analyst:** <Name>
- **Stakeholders:** Core App, Build Platform, Marketing Ops, Compliance

**Working Agreements**

- Daily 9:35–9:50 MDT; decisions captured in #ig-squad.
- PR SLA: first review ≤ 4 hours business time.
- Experiments gated by data checklist and ethics/compliance review where applicable.

---

## 3) Cadence & Key Dates

- **Sprint Planning:** Mon Sep 22, 10:00–11:30
- **Backlog Refinement:** Thu Sep 25 & Thu Oct 2, 14:00–15:00
- **Design/Content Jam:** Tue Sep 23, 13:00–14:00
- **Review:** Fri Oct 3, 10:00–11:00 | **Retro:** Fri Oct 3, 11:15–12:00
- **Release Window:** Fri Oct 3, 14:00–16:00

---

## 4) Capacity & Commitment

| Role                | Headcount | Effective Days | Notes                                     |
| ------------------- | --------: | -------------: | ----------------------------------------- |
| Engineers           |         4 |           34.5 | accounts for ceremonies & 1 PTO day total |
| Analyst             |         1 |              9 | shared w/ Core App                        |
| Design/Content      |         1 |              8 | asset production & copy QA                |
| **Velocity window** |         — |              — | **66–72 pts** target (commit ~69 pts)     |

---

## 5) Sprint Backlog (Stories w/ Acceptance Criteria)

### Epic A — Activation & Onboarding Support

**IG-241 | Event schema for onboarding v2** — *5 pts*

- **AC:**
  - Emit `onboarding_step_started/completed`, `checklist_viewed`, `tooltip_opened` with `user_id`, `step_id`, `ts`.
  - P95 ingestion-to-warehouse < 10 min; schema documented in dbt.

**IG-242 | Nudge service: magic-link reminder** — *8 pts*

- **AC:**
  - Send reminder after 10 minutes of idle invite; throttle per user/day; unsubscribe honored.
  - Template variables: `first_name`, `cta_url`, `exp_minutes`.
  - Metrics: send, delivered, open, click, convert.

**IG-243 | In-app coach marks (progressive)** — *5 pts*

- **AC:** Contextual tips appear only when step incomplete; dismiss persists; a11y verified.

### Epic B — Search Engagement & Measurement

**IG-244 | Search telemetry envelope** — *8 pts*

- **AC:**
  - Client logs `query`, `has_quotes`, `results_count`, `latency_ms`, `click_position`, `zero_result`.
  - Server aggregates CTR, zero-result rate by cohort; dashboard in Looker/Metabase.

**IG-245 | Relevance evaluation set v1** — *5 pts*

- **AC:** 200 labeled queries with relevance grades; nightly job computes NDCG@10 baseline.

**IG-246 | Zero-result rescue UX test** — *5 pts*

- **AC:** When zero-result, show suggestions/typo fix; track adoption & re-query rate.

### Epic C — Lifecycle Channel & Experimentation

**IG-247 | Email infrastructure (SendGrid) hardening** — *8 pts*

- **AC:** DKIM/SPF/DMARC aligned; categories set; IP warm-up plan; bounce/complaint webhooks.

**IG-248 | Experiment framework v1 (feature flags + assignment)** — *8 pts*

- **AC:** User assignment deterministic; exposure events; guardrails on churn & complaint rate.

**IG-249 | Onboarding email v1 (copy + design)** — *5 pts*

- **AC:** Modular template (header/body/cta); dark-mode compliant; renders in top 5 clients.

### Bugs/Chores

**IG-250 | Fix: duplicate activation events** — *3 pts*

- **AC:** Exactly-once semantics via idempotency key; warehouse de-dupe migration.

**IG-251 | Data quality: timezone normalization** — *3 pts*

- **AC:** All user timestamps stored in UTC; UI shows local; backfill script executed.

**Stretch (not committed)**

- **IG-252 | D1 retention cohort dashboard** — *5 pts*

**Total committed:** ≈ **69 pts** (excl. stretch)

---

## 6) Experiment Plans (Pre-Registered)

| ID    | Hypothesis                                            | Metric        | Min Detectable Effect | Sample/Power | Duration |
| ----- | ----------------------------------------------------- | ------------- | --------------------: | -----------: | -------- |
| EXP-A | Coach marks raise completion of "Connect Source" step | Step completion rate | +8% | 80% @ α=.05 | 7–10 days |
| EXP-B | Reminder email raises D1 activation                   | D1 activated  | +5% | 80% @ α=.05 | 7–10 days |
| EXP-C | Zero-result rescue increases search CTR               | CTR           | +6% | 80% @ α=.05 | 5–7 days |

Guardrails: error rate, complaint rate, unsubscribe rate; instant kill if thresholds breached.

---

## 7) Data & Analytics Artifacts

- **Tracking Plan:** event names, props, ownership, data tests.
- **Dashboards:** Activation funnel, Search CTR/Zero-result, Email deliverability & conversion.
- **Data Quality:** dbt tests (`not_null`, `unique`, `accepted_values`), freshness checks.

---

## 8) DoR / DoD

**Ready when:** clear user value, AC testable, dependencies mapped, experiment/metrics defined, privacy review sign-off.

**Done when:** code merged & deployed/flagged, events validated end-to-end, dashboards live, docs/runbooks updated, PO/QA sign-off.

---

## 9) Dependencies & Risks

| ID | Item                                                 | Likelihood | Impact | Mitigation                                  |
| -- | ---------------------------------------------------- | ---------: | -----: | ------------------------------------------- |
| D1 | Build Platform: webhooks & secrets mgmt for SendGrid |        Med |   High | Align on ADR-043; stage first               |
| D2 | Core App: onboarding checklist v2 availability       |        Med |    Med | Stubs/feature flag; decouple event emission |
| R1 | Email deliverability                                 |        Med |   High | Warm-up, seed tests, feedback loops         |
| R2 | Data privacy/compliance                              |        Low |   High | DPIA checklist; opt-out flow verified       |

---

## 10) Release, Telemetry & Rollback

- Staged rollout by cohort; feature flags: `onboarding.coach_marks`, `email.reminder`, `exp.framework.v1`.
- Alerts: ingest delay > 15m; bounce rate > 1.5%; complaint rate > 0.2%.
- Rollback: disable flag; stop sends; revert dbt model to previous version.

---

## 11) Communications

- Daily thread in **#ig-squad** with: activation delta, CTR delta, issues.
- Weekly stakeholder digest (Mon/Wed/Fri during sprint) with experiment status & decision log.

---

## 12) References

- PRD links (placeholders): Activation PRD, Search Telemetry PRD, Email Infra PRD.
- Design: Figma file for coach marks & email template.
- Data: dbt repo `models/activation/`, `models/search/`.
