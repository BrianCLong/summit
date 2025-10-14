# IntelGraph — Velocity Plan (Sprints 3–6)

Context: v2 tie-offs complete; Sprint 3 in flight. This plan maximizes delivery speed and quality across Sprints 3–6 while honoring security, multi-tenant safety, and analyst impact. It aligns to the integrated roadmap already captured in "IntelGraph — Integrated Sprints 3–6 (All-Party Plan + Draft PRs + Jira CSV)".

## 1. Outcomes we will measure (Flow + Quality + Impact)

### Flow (weekly targets, rolling 3-week window)

- Throughput: ≥ 18 stories/week (mix of S/M; XL split before start)
- Cycle Time (creation→done): median ≤ 2.5 days; p85 ≤ 5 days
- PR Size: median ≤ 300 LOC; p85 ≤ 700 LOC
- PR Review SLA: first response ≤ 4h business; merge ≤ 24h (non-hotfix)
- Build Time (CI): ≤ 8 min; E2E wall time ≤ 15 min; green first policy
- WIP: per-engineer WIP ≤ 2; per-lane WIP caps below

### Quality/Safety

- Golden Path gate pass rate: ≥ 98% on main; flaky tests < 2%
- Security posture: 0 ad-hoc GraphQL ops in prod; 0 unaudited denies; OPA decision latency p95 < 20ms
- Error budget: ≥ 99.5% SLO adherence; P0 defect MTTR < 2h; P1 < 24h

### Impact (per sprint)

- S3: Explainability shipped; tenant scoping verified; similarity live (demo set).
- S4: p95 ↓ ≥30% on hot endpoints; ATT&CK overlay beta usable by analysts.
- S5: 2-user collaboration E2E green; annotations + sharing v2 in prod.
- S6: rate-limit + breaker enforced; DLP/redaction active; DR drill inside targets.

## 2. Ways of Working (flow-first)

- Trunk-based development
- Short-lived branches; feature flags for risk; merge to main daily; draft PRs created up front (see integrated doc script).
- Small batch size
- Split any PR > 700 LOC or touching 5+ files. Use “vertical slices”: API → UI → test in one change.
- Strict WIP limits (per swimlane)
  - UI/Explainability: 3
  - GraphRAG/Backend/API: 3
  - Realtime/Presence: 2
  - Security/Policy/Compliance: 2
  - Perf/Infra/Neo4j: 2
- Definition of Ready (DoR)
  - Problem statement, AC, test approach, rollback/flag, owner, tenant scope noted, sensitivity tags set.
- Definition of Done (DoD)
  - Unit + integration + Golden Path E2E green; dashboards updated; alerts declared; policies tested; docs updated; feature flag default "off" unless explicitly approved.
- Review play
  - PR template enforced (scope, AC, test steps, metrics). 2 reviewers for security-touching PRs (one must be Security Eng or Architect).

## 3. Cadence & Rituals (time-boxed, outcome-driven)

- Daily standup (10 min): blockers, flow health (WIP, cycle time), today’s one outcome; no status monologues.
- Twice-weekly Flow Review (20 min): stuck PRs, SLA breaches, flake board, slow tests. Actions recorded.
- Backlog Refinement (45 min, weekly): keep ≤ 2 sprints ready; slice XL → S/M; set DoR fields.
- Sprint Review (30 min): demo Explainability/Threat overlay/Collab features to analysts; collect top 3 insights.
- Retro (30 min): pick 1 process fix, 1 tooling fix, 1 quality fix; assign an owner; track next retro.

## 4. Capacity & Assignment (from Team Matrix)

- Owners (A): Product = Brian; Architecture = Guy; Delivery = Elara.
- Core lanes:
  - UI/Explainability → Frontend Lead + Design + QA
  - Backend/API/GraphRAG → Backend Lead + Graph Data Eng + ML Lead
  - Security/Policy → Security Eng + Architect
  - Realtime → Backend Lead + Realtime buddy (assign)
  - Perf/Infra → DevOps + SRE/Obs
- Coverage & handoffs
  - Follow the matrix coverage_hours (Primary 09:00–17:00 MDT; Secondary 17:00–01:00; Tertiary 01:00–09:00). PR handoffs noted in PR description.

## 5. Release Train & Environments

- Train: weekly release (Thu), hotfix as needed.
- Promotion gates: dev → staging (all tests green) → prod (Golden Path smoke + observability diff check).
- Feature flags: EXPLAINABILITY_UI, SIMILARITY_API, TENANT_SCOPE_STRICT, REALTIME_LWW, ANNOTATIONS_V2, RATE_LIMITS, DLP_EXPORT.

## 6. Tooling & Automation (velocity boosters)

- Required checks: lint, typecheck, unit, Golden Path, new sprint E2E(s).
- Branch protection: require test:golden-path and 1 code owner (2 for security-touching).
- gh script: use the provided script to pre-open draft PRs with bodies.
- Persisted ops: PERSISTED_QUERIES=1 in prod; per-tenant manifests.

## 7. Risk Register (proactive mitigations)

- Policy bypass drift → mandatory wrapper & CI policy tests; fail build if unwrapped resolver detected.
- E2E flakiness → deterministic seeds; retry budget ≤ 1; quarantine list reviewed in Flow Review.
- Graph scale perf → neighborhood cache + indexes in S4; LOD in UI.
- Realtime contention → start LWW + idempotency; instrument conflicts; CRDT only where data proves it.
- Compliance creep → DLP and retention in S6; export path redaction tests.

## 8. Per-Sprint Velocity Commitments (targets + levers)

### Sprint 3

- Targets: 30 stories (S/M), median cycle ≤ 2.5d, PR SLA ≤ 24h, GP pass ≥ 98%.
- Levers: split PRs > 700 LOC; reviewers on-rotation; flaky test triage daily.

### Sprint 4

- Targets: 32 stories; p95 latency ↓ ≥30% on hot endpoints; ANN p95 < 100ms (demo); cache hit ≥ 70%.
- Levers: profiling checklist; index hints; Redis TTL tuning; load test harness in CI nightly.

### Sprint 5

- Targets: 28 stories; ghost sessions < 0.5%; conflict rate < 2%/day; collab E2E green.
- Levers: idempotency keys; socket heartbeat tuning; conflict toast UX polish.

### Sprint 6

- Targets: 26 stories; 0 P0 security regressions; DR RPO ≤ 15m / RTO ≤ 30m achieved.
- Levers: k6 abuse suite; breaker thresholds; backup rehearsal script and timers.

## 9. Dashboards & Alerts (what we watch every day)

- Flow: throughput, cycle time, WIP per lane, PR age heatmap, build duration, flake rate.
- Reliability: error rate, saturation, dependency budgets, socket RTT, conflict rate.
- Performance: resolver p95, Neo4j query ms, cache hit ratio, LLM call ms, ANN ms.
- Security/Compliance: OPA decisions/s, deny logs, rate-limit trips, export redactions, backup timings.

### Alert examples

- GP failure rate > 2% (1h) → warn.
- Cache hit < 50% (2h) → action perf squad.
- Conflict rate > 2% (15m) → realtime review.
- Breaker open > 5m → page on-call.

## 10. Working Agreements (quick reference)

- "Make it small, make it safe, make it visible."
- No hidden work: everything has an issue/PR.
- Be boring on prod: flags + rollback plan; no Friday risky deploys.
- Write the dashboard before the code for anything that can break prod.

## 11. Links to Execution Artifacts

- Integrated plan (sprints & PR scaffolds): see canvas doc titled above.
- Jira import CSV: included in the integrated doc; import and assign owners.
- Team matrix CSV: coverage hours, escalation contacts, data sensitivity.

