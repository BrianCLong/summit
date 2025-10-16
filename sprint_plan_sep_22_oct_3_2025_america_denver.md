# IG Squad — Sprint 24 (Sep 22 – Oct 3, 2025)

> **Charter:** accelerate activation, measure value, and drive compounding growth that supports the core Sprint 24 plan.

# Build Platform — Next Sprint (Sep 22 – Oct 3, 2025)

> Mission: cut CI lead time, harden supply-chain, and enable faster, safer releases.

---

## 1) Sprint Goal

<<<<<<< HEAD

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

**IG-241 | Event schema for onboarding v2** — _5 pts_

- **AC:**
  - Emit `onboarding_step_started/completed`, `checklist_viewed`, `tooltip_opened` with `user_id`, `step_id`, `ts`.
  - P95 ingestion-to-warehouse < 10 min; schema documented in dbt.

**IG-242 | Nudge service: magic-link reminder** — _8 pts_

- **AC:**
  - Send reminder after 10 minutes of idle invite; throttle per user/day; unsubscribe honored.
  - Template variables: `first_name`, `cta_url`, `exp_minutes`.
  - Metrics: send, delivered, open, click, convert.

**IG-243 | In-app coach marks (progressive)** — _5 pts_

- **AC:** Contextual tips appear only when step incomplete; dismiss persists; a11y verified.

### Epic B — Search Engagement & Measurement

**IG-244 | Search telemetry envelope** — _8 pts_

- **AC:**
  - Client logs `query`, `has_quotes`, `results_count`, `latency_ms`, `click_position`, `zero_result`.
  - Server aggregates CTR, zero-result rate by cohort; dashboard in Looker/Metabase.

**IG-245 | Relevance evaluation set v1** — _5 pts_

- **AC:** 200 labeled queries with relevance grades; nightly job computes NDCG@10 baseline.

**IG-246 | Zero-result rescue UX test** — _5 pts_

- **AC:** When zero-result, show suggestions/typo fix; track adoption & re-query rate.

### Epic C — Lifecycle Channel & Experimentation

**IG-247 | Email infrastructure (SendGrid) hardening** — _8 pts_

- **AC:** DKIM/SPF/DMARC aligned; categories set; IP warm-up plan; bounce/complaint webhooks.

**IG-248 | Experiment framework v1 (feature flags + assignment)** — _8 pts_

- **AC:** User assignment deterministic; exposure events; guardrails on churn & complaint rate.

**IG-249 | Onboarding email v1 (copy + design)** — _5 pts_

- **AC:** Modular template (header/body/cta); dark-mode compliant; renders in top 5 clients.

### Bugs/Chores

**IG-250 | Fix: duplicate activation events** — _3 pts_

- **AC:** Exactly-once semantics via idempotency key; warehouse de-dupe migration.

**IG-251 | Data quality: timezone normalization** — _3 pts_

- **AC:** All user timestamps stored in UTC; UI shows local; backfill script executed.

**Stretch (not committed)**

- **IG-252 | D1 retention cohort dashboard** — _5 pts_

**Total committed:** ≈ **69 pts** (excl. stretch)

---

## 6) Experiment Plans (Pre-Registered)

| ID    | Hypothesis                                            | Metric               | Min Detectable Effect | Sample/Power | Duration  |
| ----- | ----------------------------------------------------- | -------------------- | --------------------: | -----------: | --------- |
| EXP-A | Coach marks raise completion of "Connect Source" step | Step completion rate |                   +8% |  80% @ α=.05 | 7–10 days |
| EXP-B | Reminder email raises D1 activation                   | D1 activated         |                   +5% |  80% @ α=.05 | 7–10 days |
| EXP-C | Zero-result rescue increases search CTR               | CTR                  |                   +6% |  80% @ α=.05 | 5–7 days  |

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

| ID  | Item                                                 | Likelihood | Impact | Mitigation                                  |
| --- | ---------------------------------------------------- | ---------: | -----: | ------------------------------------------- |
| D1  | Build Platform: webhooks & secrets mgmt for SendGrid |        Med |   High | Align on ADR-043; stage first               |
| D2  | Core App: onboarding checklist v2 availability       |        Med |    Med | Stubs/feature flag; decouple event emission |
| R1  | Email deliverability                                 |        Med |   High | Warm-up, seed tests, feedback loops         |
| R2  | Data privacy/compliance                              |        Low |   High | DPIA checklist; opt-out flow verified       |

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
- # Data: dbt repo `models/activation/`, `models/search/`.

* **Reduce CI end-to-end time by ≥ 30%** (baseline P50 28m → target ≤ 19m).
* **Reach SLSA L2 posture** (attestations & provenance for all prod artifacts).
* **Stabilize flakiness to ≤ 1.5%** (7-day moving average).

**Success signals**

- P50/P95 pipeline time ≤ 19m/35m.
- Green-to-deploy success rate ≥ 97%.
- Signed images with SBOMs published for 100% of deployable services.

---

## 2) Scope & Non-Goals

- **In-scope:** CI/CD performance, caching, runner strategy, test parallelization, supply-chain security, build insights.
- **Out-of-scope:** Language upgrades (except build tooling), infra scaling unrelated to CI/CD.

---

## 3) Capacity (Platform Squad)

| Role              | People | Eff. Days | Notes                                      |
| ----------------- | -----: | --------: | ------------------------------------------ |
| Build/Tooling Eng |      3 |        27 | 10-day sprint; 1 day ceremonies per person |
| SRE               |      1 |         8 | shared across squads                       |
| QA/SET            |      1 |         9 | focus on e2e stability                     |
| **Est. Velocity** |      — |         — | **~36–40 pts** commitment                  |

---

## 4) Sprint Backlog (Build Platform PBIs)

> PBIs are INVEST-ready with AC; owners are placeholders.

### Theme A — CI Performance

**BP-201 | Remote build cache for Docker+Node layers** — _8 pts_

- **AC:**
  - Shared registry cache enabled; cache hit-rate ≥ 60% on repeat builds.
  - `--mount=type=cache` used for npm/pnpm; warm cache job precedes fan-out.
  - No cache poisoning; eviction policy documented.
- **Tasks:** Cache registry setup; pipeline step; cache metrics panel.

**BP-202 | Test sharding & parallelism v2** — _5 pts_

- **AC:** Dynamic shards via historical timings; retry only failed shards; P50 test phase −40%.
- **Tasks:** Timing store; shard allocator; CI matrix; docs.

**BP-203 | Ephemeral runners on autoscaling** — _5 pts_

- **AC:** Workloads move to ephemeral VMs/containers; isolation per job; scale-to-zero in < 5m idle.
- **Tasks:** Runner image; autoscaling config; budget guardrails.

**BP-204 | Flaky test quarantine workflow** — _3 pts_

- **AC:** Flaky label auto-applied after 3/50 failures; quarantine lane; weekly report.

### Theme B — Supply-Chain Security

**BP-205 | SBOM + image signing (Syft + Cosign)** — _8 pts_

- **AC:** SBOMs for all images (SPDX); signatures verified in admission; publish to artifact store.

**BP-206 | Provenance attestations (SLSA L2)** — _5 pts_

- **AC:** Provenance attached to artifacts; verification step gates prod deploy.

### Theme C — Developer Experience

**BP-207 | Pipeline templates v3 (monorepo aware)** — _3 pts_

- **AC:** DRY templates with path filters; changed-packages only; docs with examples.

**BP-208 | Pre-merge preview envs (smoke pack)** — _5 pts_

- **AC:** On PR label, deploy minimal stack; 5-minute teardown SLA; smoke suite auto-runs.

### Theme D — Observability & Cost

**BP-209 | CI observability dashboard** — _3 pts_

- **AC:** Panels for queue time, exec time by job, cache hit-rate, flakiness, spend/day.

**BP-210 | Artifact retention policy** — _2 pts_

- **AC:** Default retention 30d; LTS builds 180d; documented recovery path.

**Stretch (not committed)**

- **BP-211 | Bazel/Turbo POC for top package** — _5 pts_

**Total committed:** ~42 pts (trim to 38–40 during planning if capacity tight)

---

## 5) Acceptance Criteria (Cross-Cutting)

- All pipelines linted; templates validated.
- Rollback path for each change (flag or revertable config).
- Metrics & alerts wired for each new capability.

---

## 6) Definition of Ready (DoR)

- Clear success metric (time, rate, or coverage).
- Validation plan defined (how we’ll measure improvement).
- Security review needs noted (if admission/verify stages touched).

## 7) Definition of Done (DoD)

- Code/config merged; CI green.
- Dashboards updated; alerts firing in staging.
- Docs/playbooks updated; runbook snippet added.
- Change released and verified in production (or behind a safe flag).

---

## 8) Risks & Mitigations

| ID  | Risk                              | Likelihood | Impact | Mitigation                                                          |
| --- | --------------------------------- | ---------: | -----: | ------------------------------------------------------------------- |
| R1  | Cache corruption/poisoning        |        Low |   High | Content-addressable cache; signature verify; kill-switch            |
| R2  | Ephemeral runners hit quota caps  |        Med |    Med | Scale policy + budget alerts; fallback static pool                  |
| R3  | Signing breaks deploys            |        Med |   High | Staged rollout; verify in staging; emergency bypass key w/ approval |
| R4  | Test sharding increases flakiness |        Low |    Med | Sticky re-runs; shard stability tracking                            |

---

## 9) Measurement Plan (Dashboards)

- **CI lead time:** queue, setup, build, test, artifact, deploy phases.
- **Flaky rate:** flaky/total tests by suite; top offenders list.
- **Cache hit-rate:** by job & step; misses by key.
- **Supply-chain:** % images with valid SBOM & signature; attestation verification pass rate.
- **Spend:** cost per 100 pipelines; cost per successful deploy.

---

## 10) Rollout & Change Management

1. Enable on staging projects first (Mon–Wed).
2. Canary on 20% of repos/services (Thu).
3. Expand to 100% after 24h clean metrics (Fri).
4. Publish post-change report in #eng-platform and update runbook.

---

## 11) Communications

- Daily update thread in **#eng-platform** (queue time, failures, blockers).
- Weekly digest to stakeholders (Fri): deltas vs baseline, risks, asks.

---

## 12) Backlog Links & Artifacts

- ADRs: `ADR-042 Build Cache`, `ADR-043 Signing & SBOM`, `ADR-044 Runner Strategy` (create during sprint).
- Runbooks: `CI-Cache-Ops`, `Signing-Verify-Gate`, `Quarantine-Flow`.
- Flags/Config: `ci.cache.enabled`, `ci.runners.ephemeral`, `deploy.verify.attestations`.
  > > > > > > > 8ebc785cf (docs: refresh build platform sprint plan)
