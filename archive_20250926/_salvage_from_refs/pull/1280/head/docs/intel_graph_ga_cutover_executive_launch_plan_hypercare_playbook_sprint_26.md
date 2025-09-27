# IntelGraph GA Cutover: Executive Launch Plan & Hypercare Playbook

**Version:** 1.0  
**Date:** September 17, 2025  
**Authors:** Covert Insights (with IntelGraph Eng, SRE, Security)  
**Audience:** Execs, PMO, Eng, SRE, SecOps, Support

---

## 1) Executive Summary & Go/No‑Go
**Recommendation:** ✅ **GO for GA cutover** based on Sprint 26 outcomes and guardrails.

**Key evidence:**
- **Performance:** GraphQL + Neo4j optimized. Targets met: **p95 reads ≤ 350 ms**, **p95 writes ≤ 700 ms** under K6 scenarios.
- **Reliability:** ER pipeline stable at **2× peak** with **< 60 s queue lag**, **< 0.1% DLQ**.
- **Security & Privacy:** WebAuthn step‑up, OPA policy reasoner, privacy reasoner and licensing enforcement in place.
- **Supply Chain:** SLSA3 provenance enforced via `verify-bundle` with round‑trip proof; gated in CD.
- **Cost:** Adaptive sampling delivering **60–80%** observability cost reduction while preserving signal quality.
- **Operations:** DR drills automated; change‑freeze workflows and runbooks prepared.

**Go/No‑Go Gates (must be Green):**
1. CI/CD provenance verification (SLSA3) ✅  
2. Canary health across **%1 → %5 → %25** cohorts within SLO guardrails ✅  
3. Redis + Neo4j capacity/latency headroom ≥ **30%** ✅  
4. Security step‑up exceptions ≤ **0.5%** of auth attempts and declining ✅  
5. Error budget burn < **2%/day** for last 5 days ✅

---

## 2) Cutover Plan (T‑24h → T+48h)

### T‑24h (Readiness)
- Freeze window confirmed; change advisory circulated.  
- Final **config snapshot**: GraphQL PQ LRU sizes, Redis TTLs, Neo4j routing rules, OPA bundles versions, feature flags.  
- Confirm **read‑replica lag < 50 ms**; warm caches with top persisted queries.  
- Validate `verify-bundle` signatures for release tag; archive attestations.  
- Page primary/secondary On‑Call rosters; War Room bridge established.

### T‑0 (Switch)
1. **Enable canary** at 1% traffic on selected tenants.  
2. Watch 15‑min rolling SLOs and the **hot metrics** (see §4).  
3. Expand to **5%**, then **25%** if within thresholds.  
4. Enable WebAuthn **step‑up = risk ≥ Medium** (gradual from Audit→Enforce).  
5. Validate OPA policy decisions latency < **25 ms p95**; cache hit rate > **90%**.

### T+6h / T+24h / T+48h
- Progressively ramp to **50% → 100%** if all guardrails green.  
- Run **provenance spot checks** on hot paths each window.  
- Issue **daily GA status** to execs with KPIs and risk deltas.

---

## 3) Rollback Criteria & Decision Tree
**Immediate rollback** (auto or SRE‑led) if any trigger sustains > 10 minutes:
- p95 read > **500 ms** or write > **900 ms** across ≥ 3 tenants.
- Error budget burn > **6%/hour** or **≥ 2% of requests** 5xx/Policy‑Denied (unexpected).
- ER queue lag > **180 s** OR DLQ rate ≥ **0.5%**.
- WebAuthn failure rate > **2%** of auth attempts (non‑user error) or spike in **step‑up prompts** > 3× baseline.
- Policy reasoner latency > **60 ms p95** or cache hit rate < **85%**.
- Redis P99 > **5 ms** or eviction storm > **2%/min** sustained; Neo4j replica lag > **250 ms**.

**Decision Tree:**
1. **Contain:** Toggle feature flags to Safe Mode (disable step‑up enforce → audit; reduce aggressive caching invalidations; route writes to primary only).  
2. **Roll back canary cohort** to last good %; run smoke tests.  
3. **Full rollback:** Redeploy last green build (tag N‑1) with attestation verified; invalidate relevant caches; rehydrate read models.  
4. **Post‑incident**: Root cause within 24h; backport fix behind flag; rehearse specific failure mode in next GameDay.

---

## 4) Hypercare (Days 0–14)

**War Room Cadence:**
- **Days 0–3:** 24×7 coverage, updates every **2 hours**.  
- **Days 4–7:** 16×5 coverage, daily standup + end‑of‑day digest.  
- **Days 8–14:** Normal on‑call; bi‑weekly exec roll‑ups.

**DRIs & Escalation Ladder:**
- **SRE/Platform:** Cache, infra, K6/load, SLO burn.  
- **Data/Graph:** Neo4j, query plans, read replica routing.  
- **App/API:** GraphQL gateway, persisted queries, PQ invalidation.  
- **Security:** WebAuthn, OPA bundles, privacy reasoner.  
- **FinOps:** Cost guardrails, sampling, budget alerts.  
- **Support/PM:** Tenant comms, release notes, incident comms.

**Shift Handover Template:**
- Past 8h: notable incidents, metrics deltas, mitigations.  
- Current risks & watch items (ranked).  
- Open actions with owners & ETAs.  
- Next shift priorities.

---

## 5) Live Guardrails & Alerting

**SLOs & Burn Alerts**
- **Availability SLO:** 99.9% monthly; **burn alerts** at 2%/day, 6%/day, 10%/day.  
- **Latency SLOs:** p95 read ≤ **350 ms**; write ≤ **700 ms**.  
- **Error Rate:** < **0.5%** total; server 5xx < **0.2%**.  
- **Policy Latency:** OPA p95 ≤ **25 ms** (goal), **60 ms** (max).  
- **Auth UX:** Step‑up < **0.5%** of sessions; failure rate < **0.2%**.

**Top Alerts (with initial thresholds):**
- **GraphQL Cache Hit Rate** < 85% (persisted queries) for 10 min.  
- **Redis**: P99 > 5 ms OR evictions > 1%/min OR CPU > 70% for 15 min.  
- **Neo4j**: p95 query > 300 ms; replication lag > 150 ms; page cache hit < 95%.  
- **ER Pipeline**: lag > 120 s; DLQ > 0.3%; circuit breaker open > 3% of time.  
- **OPA/Privacy**: decision p95 > 40 ms; policy violations spike > 3× baseline.  
- **WebAuthn**: challenge failures > 1% over 10 min; step‑up prompts > 2× baseline.  
- **Cost**: spend rate > **1.3×** forecast; sampling floor hit for > 15 min.  
- **Provenance**: verification failures > 0 OR emergency bypass used.

---

## 6) Observability & Dashboards

**Gateway / GraphQL:**
- PQ cache hit%, LRU evictions/min, top‑N query hashes, response cache hit%, invalidations/min.  
- Latency histograms (p50/p95/p99), error rates by op & tenant, 4xx vs 5xx split.  
- Subscription throughput and disconnect reasons.

**Redis:**
- Cmd/sec, net I/O, connection pool saturation, memory fragmentation.  
- Keyspace TTL distribution; hot keys; replication offsets.

**Neo4j:**
- Query plan changes; page cache hit%; GC pauses; active transactions; replica routing ratios; causal cluster health.

**ER / Messaging:**
- Inflight, lag, reprocess success%, DLQ age, backpressure signals; retry histogram; circuit‑breaker state.

**Security/Policy:**
- Step‑up prompt rate, success/fail, device/location risk mix; OPA decision counts & latency, bundle version distribution.  
- Privacy reasoner detections by class; false positive/negative review queue age.

**FinOps:**
- Cost by service/tenant; spend velocity vs budget; sampling rate over time; forecast vs actual; rightsizing actions.

---

## 7) Feature Flags & Safe Modes
- **Auth.SafeMode:** Step‑up = Audit‑Only; bypass risk higher than *High*.  
- **Policy.SafeEval:** OPA fallback to last‑known‑good cache; shadow‑decide + log.  
- **GraphQL.CacheConservative:** Increase TTLs; reduce invalidation frequency.  
- **ER.ThrottleAggressive:** Tighten adaptive rate limiting; increase batch sizes; pause non‑critical bulk ops.  
- **Provenance.EnforceStrict:** Block deploys on any verification warning; **EmergencyBypass** requires VP+ approval & ticket.

---

## 8) Compliance & Audit Hooks
- Archive **attestations**, SBOMs, and verify‑bundle outputs for each cutover step.  
- Immutable logs for **bypass events** with rationale and timeframe.  
- Consent & licensing audit: per‑tenant usage caps, violation alerts; retention policies by data class.

---

## 9) Incident Playbooks (Quick‑Action)

**A) Cache Eviction Storm**  
1. Toggle `GraphQL.CacheConservative`.  
2. Raise Redis maxmemory; switch eviction policy to allkeys‑lfu (if pre‑approved).  
3. Warm top‑50 PQs; reduce invalidation via flag.  
4. Investigate N+1 or query hash churn; ship hotfix if necessary.

**B) Neo4j Replica Lag Spike**  
1. Route hot reads to primary; reduce write amplification (batch).  
2. Increase page cache; check long‑running queries; apply tuned profile.  
3. If > 10 min: shrink read traffic cohort; consider rollback.

**C) ER Backpressure Surge**  
1. Open bulk‑ops throttle; enable batch mode; prioritize high‑value categories.  
2. Drain DLQ with categorized reprocessing; review top error classes.  
3. If lag > 3 min: shed non‑critical producers; scale consumers.

**D) WebAuthn Step‑Up Spikes**  
1. Lower risk threshold one notch to reduce prompts; switch to audit‑only if UX degrades.  
2. Inspect device/location drift; check vendor outage; post status.

**E) OPA/Policy Latency**  
1. Pin bundle to last‑known‑good; increase local cache TTL; precompute hot decisions.  
2. If p95 > 60 ms for 10 min: shadow‑decide and log for post‑mortem.

---

## 10) Communications Templates

**Exec Update (Daily during Hypercare):**
- Status: Green/Yellow/Red  
- Traffic distribution: x% / y% / 100%  
- SLOs: latency/availability/error budget  
- Incidents: brief + mitigations  
- Risks & next steps

**Tenant Notice (if impact):**
- What happened, time window, impact, remediation, preventive action, point of contact.

---

## 11) Post‑GA 30/60/90 Roadmap (Proposed)

**30 Days**
- PQ hash canonicalization v2; schema‑aware invalidations.  
- Neo4j **auto‑tuner** for query plans; add p99 SLO for heavy aggregations.  
- ER **exact‑once** semantics exploration; dead‑letter classifier ML assist.  
- WebAuthn **device binding** hardening; risk model calibration.

**60 Days**
- Multi‑region read replicas with **active‑active** read routing.  
- OPA distributed decision cache (sidecar/shared) & WASM compile paths.  
- Cost **unit economics per tenant**; auto‑rightsizing bots.

**90 Days**
- SLSA4 pilot for hermetic builds; Sigstore keyless across org.  
- DR **regional failover** GameDay; RTO/RPO certification.  
- Privacy reasoner feedback loop with precision/recall targets.

---

## 12) Owners & Contacts
- **Release Manager (DRI):** _Name, contact_  
- **SRE Lead:** _Name_  
- **Security Lead:** _Name_  
- **Data/Graph Lead:** _Name_  
- **FinOps Lead:** _Name_  
- **Support/Comms:** _Name_

---

## 13) Acceptance Sign‑offs
- Eng ✅  
- SRE ✅  
- Security ✅  
- PM/CS ✅  
- Exec Sponsor ✅

---

### Appendix A: K6 Scenario Baselines
- Scenario names, expected throughput, p95s, error ceilings, and SLO alert hooks.

### Appendix B: Query/Alert Snippets
- Example PromQL/LogQL for each alert in §5.

### Appendix C: Provenance Checklist
- Required artifacts and validation commands for deploy gates.

