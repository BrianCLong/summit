# Sprint Plan — Apr 13–Apr 24, 2026 (America/Denver)

> **Context:** Sprint 9 — **Scale & Efficiency**. Mandate: make margin inevitable by accelerating the hot path (graph queries, policy decisions, receipt pipeline) and cutting storage/egress via compaction and retention mechanics. Focus on p95/p99 latency, tenant-level COGS, and verifiable storage reductions without breaking proofs.

---

## 1) Sprint Goal (SMART)

By **Fri Apr 24, 2026**, deliver a production-ready efficiency release that makes **p95 critical flows 20–30% faster**, reduces **p99 tails by >15%**, cuts **COGS per active tenant by 15–25%**, lowers provenance/evidence storage by **≥30% via compaction/tiering**, and holds **receipt issuance lag <30s p95** with DLQ depth near-zero under **2–3× current peak load** — all with proofs intact and regression gates enforced.

**Key outcomes**

- Hot-path graph + policy decisions measurably faster at p95/p99 versus Sprint 6 baseline.
- Tenant-level COGS down 15–25% with ≥95% attribution confidence (compute + storage + egress).
- Provenance/evidence storage trimmed ≥30% through compaction/tiered retention without losing verifiability.
- Receipt issuance p95 <30s under load; DLQs stay near-zero in normal ops.
- Stable operation at 2–3× current peak load in staging with dashboards and manifests captured.

---

## 2) Success Metrics & Verification

- **Latency:** p95 for top critical flows improves **20–30%**; **p99** improves **>15%**.  
  _Verify:_ k6/load harness results; profiling traces; before/after dashboards.
- **COGS:** **15–25%** reduction in cost per active tenant with **≥95% attribution confidence** across compute/storage/egress.  
  _Verify:_ staging cost model reports; per-tenant cost attribution dashboards; variance analysis.
- **Storage:** **≥30%** reduction in provenance/evidence footprint with compaction/tiered retention; proofs remain valid.  
  _Verify:_ storage deltas per tier; reconstructor validation; signature checks on compacted receipts.
- **Reliability:** Receipt issuance p95 **<30s** under expected load; DLQ depth near-zero.  
  _Verify:_ pipeline latency dashboards; DLQ monitors; failure drills.
- **Capacity:** Stable at **2–3×** current peak load without SLO regressions.  
  _Verify:_ scaled load tests; saturation alerts; error-budget burn tracking.

---

## 3) Scope

**Must-have (commit):**

- **Epic A — Hot-path performance:** Index & query plan optimizations on tenant partitions and top-N traversals; decision cache (tenant + action + resource type + attribute hash, short TTL); policy bundle distribution efficiency; publish decision p50/p95/p99 per bundle version; batch orchestration to cut round-trips while preserving policy preflight + receipt invariants.
- **Epic B — Provenance & metering compaction:** Receipt compaction v1 with dictionary tables for repeated fields; optional dual-write full+compacted with reconstruction path; evidence tiering (hot 30–90d, warm archives, cold WORM export); purge manifests that remain verifiable; storage savings dashboards.
- **Epic C — COGS engineering:** Per-tenant right-size recommendations (idle/bursty); scheduling/isolation tweaks to reduce overprovisioning and noisy-neighbor effects; egress minimization (compressed exports, deduped evidence exports, resumable exports with caching).
- **Epic D — Proof/regression gates:** Load-testing harness for graph traversals, preflight+execute, approvals, receipt issuance, metering rollups; regression gates that fail on latency/COGS regressions beyond thresholds; perf/storage/COGS dashboards wired.

**Stretch (time-boxed):**

- Learned cost-attribution model that auto-updates right-size recommendations weekly.
- Dynamic TTL tuning for decision cache based on bundle volatility signals.

**Out-of-scope:** New feature surfaces beyond dashboards/recommendation views; cross-tenant behavioral changes; non-proofed data deletion.

---

## 4) Team & Capacity

- 10 business days; focus factor **0.8** ⇒ commit **~38–40 pts** with a small buffer for load-test surprises.
- Shared resources: infra/perf SWAT for profiling/k6, data platform for storage metrics, policy team for OPA bundle work.

---

## 5) Backlog (Ready for Sprint)

| ID       | Title                                     | Owner   | Est | Dependencies | Acceptance Criteria (summary)                                       |
| -------- | ----------------------------------------- | ------- | --: | ------------ | ------------------------------------------------------------------- |
| PERF-901 | Tenant-partition indexes & query plans    | BE/DB   |   5 | telemetry    | Top-N traversals faster 20–30% p95; plans reviewed; index map       |
| PERF-902 | Decision cache + bundle distro            | Policy  |   5 | OPA bundles  | Cache keyed per spec; TTL; metrics per bundle version               |
| PERF-903 | Orchestration batching                    | BE      |   4 | PERF-901     | Reduced round-trips; payload trimmed; receipts intact               |
| PROV-911 | Receipt compaction v1 + reconstructor     | Ledger  |   6 | schema       | Dictionary tables; dual-write; reconstructor passes sig checks      |
| PROV-912 | Evidence tiering + purge manifests        | Ledger  |   5 | storage      | Hot/warm/cold tiers; purge manifests verifiable; savings dashboards |
| COGS-921 | Right-size recommendations                | FinOps  |   4 | metrics      | Idle/bursty tenants flagged; recs with confidence + actions         |
| COGS-922 | Pool efficiency + noisy-neighbor signals  | Infra   |   4 | scheduler    | Scheduling tweaks landed; variance signals exposed                  |
| COGS-923 | Egress minimization                       | Export  |   4 | exporters    | Compressed/resumable exports; duplicate evidence avoided            |
| GATE-931 | Load harness & perf/COGS regression gates | QA/Perf |   6 | PERF-901-903 | Harness covers flows; gates trip on regressions; dashboards wired   |

> Planned: ~43 pts including stretch buffer; trim or pull stretch based on mid-sprint burndown.

---

## 6) Dependencies & Assumptions

- Updated telemetry on top-N graph traversals and policy decisions available for query tuning.
- OPA bundle pipeline supports versioned metrics publishing; cache invalidation hooks exposed.
- Access to staging datasets mirroring tenant distribution; safe test tenants for compaction drills.
- Storage metrics per tier and cost attribution data refreshed nightly.
- k6/load harness environments stable with 2–3× load generators.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Apr 13 — 09:30–11:00:** Sprint Planning.
- **Daily — 09:15–09:30:** Stand-up.
- **Thu Apr 16 — 14:00–14:45:** Mid-sprint Refinement/Checkpoint.
- **Thu Apr 23 — 15:00–16:00:** Perf/COGS review & gate dry-run.
- **Fri Apr 24 — 10:00–11:00:** Sprint Review/Demo.
- **Fri Apr 24 — 11:15–12:00:** Retro.

---

## 8) Definition of Ready (DoR)

- Story has AC with target p95/p99/COGS deltas, rollback path, flags, telemetry hooks, and test data.
- Cache invalidation and migration paths documented where applicable.
- Load-test fixture and acceptance harness identified.

## 9) Definition of Done (DoD)

- Metrics meet targets; dashboards updated; regression gates green (or intentionally tripped with follow-up).
- Compaction outputs validated with signature checks; reconstructor passes; purge manifests stored.
- Tests: unit + contract; load harness recorded before/after; no `.only`/`.skip`.
- Runbooks updated for compaction failures, archive restore, cache invalidation, and regression-gate triage.

---

## 10) QA & Validation Plan

- **Performance:** k6 runs for graph traversals, policy preflight+execute, approvals, receipt issuance; compare to baseline; trace sampling for hotspots.
- **Compaction & storage:** Dual-write verification; reconstructor tests; signature validation on compacted receipts; tier-movement drills with purge manifest inspection.
- **COGS:** Per-tenant cost model evaluation; recommendation accuracy spot-check; scheduler variance tests; export egress measurement with compression/resume.
- **Reliability:** Receipt issuance latency under load; DLQ depth monitoring; failover drill for cache invalidation.
- **Gates:** Automated regression gates in CI/nightly for latency, COGS, storage deltas; alerting wired.

---

## 11) Risks & Mitigations

| Risk                                       | Prob. | Impact | Mitigation                                                               |
| ------------------------------------------ | ----- | -----: | ------------------------------------------------------------------------ |
| Compaction breaks verification or replay   | Med   |   High | Keep full+compacted dual-write; reconstructor + sig tests; fast rollback |
| Cache staleness affecting policy decisions | Med   |    Med | Short TTLs; explicit invalidation hooks; bundle-version metrics          |
| Cost savings not realized in staging       | Med   |    Med | Calibrate cost model; widen sample tenants; add sensitivity analysis     |
| Load harness drift vs prod patterns        | Low   |    Med | Mirror top-N queries; rotate fixtures weekly; review telemetry           |

---

## 12) Reporting Artifacts & Demo Script

- **Artifacts:** Before/after perf dashboards, p95/p99 deltas, cost attribution report, storage savings report with purge manifests, decision cache hit-rate, receipt issuance latency logs, load-harness configs, regression gate results.
- **Demo script (live):**
  1. Run baseline load → show p95/p99 and cost/storage baselines.
  2. Deploy optimized build → rerun load → highlight latency/COGS/storage improvements.
  3. Show decision cache + bundle metrics; cache TTL/invalidations in action.
  4. Demonstrate receipt compaction: compacted receipt + reconstructed full receipt passes signature check; purge manifest review.
  5. Export evidence bundle with compression/resume; confirm no duplicate evidence and reduced egress.
  6. Show COGS dashboard with right-size recommendations and scheduler/noisy-neighbor signals.
  7. Open regression gate dashboard showing thresholds and current status; note alerts if tripped.
