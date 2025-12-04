# Sprint Plan — Feb 9–20, 2026 (America/Denver)

> **Context:** Sprint 18 themed “Copilot Actions, Redaction, Data Quality.” Focus: turn insights into **actions**, make exports **safe by default**, and keep the graph **clean and trustworthy** while tightening ops controls.

---

## 1) Sprint Goals (SMART)

- Ship **Copilot Actions v2.0**: NL → playbook planning, review screen, guarded execution with budget caps and audit for every step.
- Deliver **Privacy‑First Exports**: field/row redaction, k‑anon buckets, and optional DP noise for counts; manifest with rationale.
- Launch **Data Quality Guardrails**: declarative constraints + drift monitors + fix‑it wizard; violations surfaced with undoable fixes.
- Improve **Relevance Feedback**: telemetry + reranker refresh + prompt tuning with versioning.
- Harden **Ops & Cost Controls**: export budgets/rate limits, per‑playbook cost estimates, and audit coverage across actions/redactions/fixes.

**Target outcomes by Feb 20, 2026**

- ≥80% of gold intents plan successfully; ≤2% halted for budget overruns in demo set; zero unaudited writes.
- 100% exports enforce redaction policy; k≥5 satisfied on demo; DP epsilon selectable when enabled.
- Constraint coverage ≥80% for key entities; drift detection ≤2 min; fix success rate ≥90% on fixtures.
- Top‑5 recall +5% vs baseline; CTR@5 +3% WoW on dogfood.

---

## 2) Success Metrics & Verification

- **Planner validity:** ≥90% syntactic validity on gold intents. _Verify:_ golden intent harness; manual spot‑check.
- **Execution safety:** Budget breach soft‑fail rate ≤2% of demo playbooks; 100% annotate steps show preview diff. _Verify:_ audit logs + demo scripts.
- **Privacy enforcement:** 0 policy bypasses in export tests; manifest includes rationale for every blocked field. _Verify:_ export pipeline tests + manifest hash check.
- **k‑Anon/DP:** Demo datasets satisfy k≥5 with quasi‑identifiers; DP noise optional with epsilon logged. _Verify:_ property tests and sampled exports.
- **Data quality:** Constraint violation detection coverage ≥80%; drift alert under 2 min; fix wizard completes common flows in <5 clicks. _Verify:_ synthetic drift + wizard usability tests.
- **Relevance:** CTR@5 +3% WoW; top‑5 recall +5% post‑reranker. _Verify:_ telemetry dashboards + nightly eval.
- **Ops:** Budget breach notifications dispatched within 1 min; audit trails reconstruct end‑to‑end for sampled traces. _Verify:_ alert sampling + audit replay.

---

## 3) Scope

**Must‑have (commit)**

- Copilot playbook engine (steps: {cypher, filter, annotate, export, notify}) with dry‑run + execute; audit per step.
- NL → playbook planner with review/risk screen and review‑before‑run; budget caps (rows/time) + kill switch.
- Redaction policy model (roles → field actions + row predicates) integrated into export pipeline; manifest with rationale + hash.
- k‑anon buckets for quasi‑identifiers; optional DP Laplace noise for aggregate counts; tunable epsilon.
- Constraint DSL + monitors (unique/not_null/enum/pii/schema) with violation surfacing; drift monitor for column/type change; fix‑it wizard with undo + audit.
- Relevance telemetry capture (query → opened target → dwell) with opt‑in hashing; nightly reranker weights and Copilot prompt versioning.
- Ops hardening: per‑user export caps, per‑playbook cost estimate with stop‑before‑run, audit coverage for playbooks/redactions/fixes/exports.

**Stretch**

- Scenario templates for common playbooks (“Tag & Export Top N”, “Enrich with OSINT then link to case”).
- DP defaults tuned per role; quasi‑identifier presets configurable in UI.
- Fix‑it wizard recommendations for merging/splitting entities with guided diff previews.

**Out‑of‑scope**

- Cross‑tenant destructive actions; mobile clients; customer‑visible ABAC editor changes.

---

## 4) Team & Capacity

- **Working days:** 10 business days (Feb 9–20, 2026).
- **Focus factor:** 0.8 baseline.
- **Commit target:** ~40–44 pts; hold 4–6 pts for risk buffer.

---

## 5) Backlog (Ready for Sprint)

### Epic A — Copilot 2.0 (Actions)
- **A1 Playbook Engine:** server‑side DAG steps {cypher, filter, annotate, export, notify}; dry‑run + execute; audited.
- **A2 NL → Planner:** ≥90% syntactic validity; review screen shows plan + risks; variables supported.
- **A3 Guarded Execution:** budget caps (rows/time), kill switch, preview diffs for annotate; friendly remediation on cap breach.

### Epic B — Privacy & Redaction
- **B1 Policy Model:** roles → field actions (`mask`, `hash`, `drop`, `pass`) + row predicates; eval <10 ms/row on test sets.
- **B2 Export Integration:** CSV/PDF/JSON honor policy; manifest records redactions + reasons; manifest hash stored.
- **B3 k‑Anon & DP Counts:** group‑by quasi‑identifiers with k≥5; optional Laplace noise for aggregates; epsilon selectable.

### Epic C — Data Quality Guardrails
- **C1 Constraint DSL:** `unique`, `not_null`, `enum`, `pii(tag_conf>=T)`, `schema(version)`; violations logged + surfaced; coverage report.
- **C2 Drift Monitor:** alerts on column add/remove/type shift in streaming + batch; synthetic drift triggers alert <2 min.
- **C3 Fix‑It Wizard:** guided merges/splits/remap fields/re‑run PII tagger; undoable; audit snapshot stored.

### Epic D — Relevance Feedback
- **D1 Telemetry:** capture query → openedTarget → dwell; opt‑in; PII‑free hashed IDs; CTR@5 dashboard.
- **D2 Reranker Tuning:** nightly learned‑to‑rank refresh; Copilot prompt templates versioned; top‑5 recall +5% target.

### Epic E — Ops & Cost
- **E1 Budgets & Rate Limits:** per‑user daily export cap; per‑playbook cost estimate + stop‑before‑run; budget breach soft fail + admin notify.
- **E2 Full Audit Coverage:** who/what/why/when for playbooks, redactions, fixes, exports; immutable IDs; sample trace reconstructs end‑to‑end.

---

## 6) Interfaces & Examples

- **GraphQL (Apollo/Node 18)**
  - `planPlaybook(intent: String!, variables: JSON): JSON!` — returns planned DAG
  - `runPlaybook(plan: JSON!, reviewAccepted: Boolean!): PlaybookResult!`
  - `setRedactionPolicy(workspaceId: ID!, policy: JSON!): Boolean!`
  - `exportWithPolicy(target: JSON!, policyId: ID, format: String!): ExportTicket!`
- **Redaction evaluator (Node)**: field actions `mask/hash/drop/pass`; rowFilter string; evaluation under 10 ms/row.
- **DP counts (FastAPI/Python)**: Laplace noise with tunable epsilon; sensitivity 1; non‑negative outputs.
- **Constraint DSL (YAML)**: declarative rules for unique/not_null/enum/pii/schema; coverage report generated.
- **Frontend (jQuery bridge)**: Copilot review/run workflow showing plan JSON and guarded run with toast feedback.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Feb 9:** Kickoff; risk review; align on budgets + audit coverage.
- **Fri Feb 13:** Mid‑sprint demo/checkpoint (30m); drift and redaction test drill.
- **Wed Feb 18:** Grooming for Sprint 19; planner gold intent review.
- **Fri Feb 20:** Demo (45m) + Retro (45m) + Release cut; audit sampling.

---

## 8) Definition of Ready (DoR)

- Playbook gold intents finalized; budget defaults agreed; review screen UX mock ready.
- Redaction roles/fields and quasi‑identifier sets documented; DP default off unless explicitly enabled.
- Constraint catalog per entity available; drift fixtures prepared; telemetry schemas defined.

## 9) Definition of Done (DoD)

- Tests passing (unit + property tests for k‑anon/DP + planner syntactic validity); lint/format clean.
- Audit logs populated for playbooks/redactions/fixes/exports; manifests hashed and stored.
- Enablement/runbooks updated; rollout flags and rollback paths verified; dashboards live for telemetry and budgets.

---

## 10) QA & Validation Plan

- **Planner:** golden intent harness ≥90% syntactic validity; manual review of top 20 intents; budget cap simulations.
- **Copilot execution:** dry‑run vs execute diffs; annotate preview diffs validated; kill switch drills.
- **Privacy/redaction:** policy evaluation benchmarks (<10 ms/row); manifest rationale sampling; k‑anon property tests; DP noise bounds unit tests.
- **Data quality:** synthetic drift injection (column add/remove/type change) with alert timer; constraint violation sampling; wizard usability tests (<5 clicks common fixes) with undo verification.
- **Relevance:** telemetry opt‑in flow test; CTR@5 dashboard correctness; nightly reranker refresh job validation.
- **Ops:** export budget breach simulation; cost estimate accuracy sampling; audit trace reconstruction dry‑runs.

---

## 11) Risks & Mitigations (RAID)

| Risk | Prob. | Impact | Mitigation |
| --- | --- | ---: | --- |
| Over‑automation in Copilot actions | Med | High | Enforce review‑before‑run; budget caps; annotate diffs; kill switch drills. |
| Redaction bypass attempts | Low | High | Server‑side enforcement only; signed manifests; deny if policy not resolvable; audit required. |
| Utility loss from DP noise | Low | Med | Default off; user warning; apply only to aggregates; epsilon visible. |
| Constraint noise/false alarms | Med | Med | Start with high‑signal rules; classify low‑signal as warnings; tune thresholds. |
| Drift alert fatigue | Med | Med | Suppress duplicates; batch notifications; curated drift fixtures. |
| Cost overruns for playbooks | Low | High | Pre‑run cost estimate + stop; rate limits; admin notifications on breach. |

---

## 12) Communications & Tracking

- **Channels:** #sprint‑room (daily), #copilot‑actions, #privacy‑exports, #dq‑guardrails, #search‑relevance, exec weekly update.
- **Artifacts:** branches `feature/copilot-actions`, `feature/redaction-export`, `feature/data-quality`, `feature/relevance-feedback`, `chore/ops-budgets`; labels `area:copilot`, `area:privacy`, `area:dq`, `area:search`, `needs:sec-review`, `needs:perf-bench`.
- **Reports:** burnup; planner validity; budget breaches; constraint coverage; drift alerts; redaction manifest sampling; CTR@5/top‑5 recall.

---

## 13) Release & Rollback

- **Release path:** internal cohort → analyst GA → partner cohorts (guarded) for exports/redaction; playbook actions gated by review flag.
- **Rollback:** disable Copilot run endpoints (planner remains); revert redaction enforcement to strict deny; turn off DP noise; pause drift monitor alerts; pin reranker to previous weights/prompts.
- **Audit:** immutable IDs for playbooks, redactions, fixes, exports; sample trace reconstruction validated post‑release.

---

## 14) Open Questions (to resolve early)

1. Which playbooks should be first‑class (“Tag & Export Top N”, “Enrich with OSINT then link to case”, etc.)?
2. Any mandated redaction defaults per role (analyst/partner/auditor) or specific quasi‑identifier sets for k‑anon?
3. Which DQ rules are non‑negotiable for datasets this sprint (unique keys, enum checks, PII thresholds)?

_Prepared: Feb 9, 2026 window — owners: Copilot/Privacy/DQ/Relevance/Ops squads._
