# 🧨 Consolidate & Dominate — Sprint 6 (Day 71–84)

**Start:** 2025‑12‑11  
**Duration:** 14 days  
**Prime Directive:** Cement the beachhead: internationalize, zero‑trust the data plane, automate compliance at scale, and squeeze the graph until it sings. Build **only** on S1–S5 outputs; **no rework**.

---
## Non‑Dup Boundary (inherits S1–S5)
Already done/in‑flight and **off‑limits for duplication**: prov/attestation + verifier SDKs, authority lifecycle + OPA packs, ER‑XAI v3, Disclosure Bundler + reply/e‑file, GraphRAG + path rationales + caching, Planner v3.1 + hot‑paths, FinOps guards + billing/entitlements, streaming/CDC, offline kits + DR, multi‑region A/A + isolation proofs, chaos GameDays, SOC‑lite + auditor UX, partner adapters, tenant scale‑out, brief factory, auditor auto‑packs, guardrails v3.

---
## Sprint Objectives
1) **Zero‑Trust Data Plane:** encrypt‑in‑use options, per‑tenant keys, and scoped compute.  
2) **Globalization:** i18n/L10n for UI + search/ER signals incl. transliteration pipelines.  
3) **Compliance Automation:** continuous evidence generation, policy drift alarms, and one‑click auditor exports.  
4) **Throughput & Cost:** double ingest headroom, shrink hot‑path latencies, and reduce $/case.  
5) **Productization:** plans → entitlements → in‑app upsell; customer self‑serve; docs that sell.

---
## Workstreams

### WS‑A — Zero‑Trust Data Plane (ZTDP v1)
**Lead:** @sre‑hawk • **Areas:** `gateway/`, `graph-service/`, `storage/`, `kms/`
- [ ] Per‑tenant KMS keys; envelope encryption for exhibits + manifests.  
- [ ] **Scoped compute**: service‑to‑service short‑lived tokens; policy‑bound data views.  
- [ ] Encrypt‑in‑use option (TEE or process‑isolation stub) with attestation receipts.  
- **DoD:** Keys rotated on schedule; attempts outside policy return **explainable deny**; attestation receipts land in prov‑ledger.

### WS‑B — Internationalization & Multilingual ER (L10n+i18n)
**Lead:** @er‑wright • **Areas:** `apps/web/`, `graph-xai/`, `featurestore/`
- [ ] UI i18n scaffold (en, es, fr to start) + date/num/RTL support.  
- [ ] Transliteration + phonetic pipelines (CJK/AR) feeding ER features (no biometrics).  
- [ ] Locale‑aware tokenization for GraphRAG retriever; language‑tag propagation.  
- **DoD:** Two non‑EN locales usable end‑to‑end; ER F1 within −2pp of EN baseline on multilingual golden set; citations remain resolvable.

### WS‑C — Continuous Compliance (CCP v1)
**Lead:** @ops‑audit • **Areas:** `governance/`, `docs/`, `ci/`, `alerts/`
- [ ] Control‑as‑code repo (retention, residency, access reviews) with simulator snapshots each merge.  
- [ ] **Policy drift** alarms vs. last attested hash; impact report per tenant.  
- [ ] One‑click **Auditor Export** (evidence, policy hashes, privacy ledger) from UI.  
- **DoD:** Weekly attestation job produces signed artifacts; drift alarms triaged <24h; auditor export reconstructs a case unaided.

### WS‑D — Ingest Headroom & Replay v3
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `data-pipelines/`, `storage/`
- [ ] Parallel backfills with **idempotent receipts**; dead‑letter queues with replay guarantees.  
- [ ] 2× throughput target (→ 200k events/min in staging) with backpressure and graceful shedding.  
- [ ] Region‑aware replay determinism (clock skew and sequence gap handling).  
- **DoD:** 200k/min sustained; determinism proofs across regions; zero data loss in scripted failovers.

### WS‑E — Hot‑Path Ruthlessness (Planner 3.2 + Caches)
**Lead:** @rag‑marshal • **Areas:** `graph-service/`, `cache/`, `copilot/`
- [ ] Learned cardinality hints materialized by pattern; index‑advisor auto‑PRs.  
- [ ] **Answer delta cache** (evidence‑timestamp aware) to avoid recompute.  
- [ ] Copilot **latency governor** with per‑plan budgets and graceful fallbacks.  
- **DoD:** p95 graph read −15% vs S5; copilot p50 <600ms/p95 <1.1s on eval; zero stale answers after evidence changes.

### WS‑F — Self‑Serve & Expansion Loops
**Lead:** @finops • **Areas:** `apps/web/`, `billing/`, `gateway/`, `docs/`
- [ ] In‑app upsell (plan features, caps, overage previews) with human‑readable metering.  
- [ ] Tenant self‑serve provisioning (request → approval → IaC mint).  
- [ ] **ROI explorer**: usage → outcomes mapping; shareable reports.  
- **DoD:** New tenant can self‑provision to sandbox; upsell converts features behind flags; ROI report exports as signed bundle.

### WS‑G — Casework Playbooks v3 (Operational Tempo)
**Lead:** @brief‑smith • **Areas:** `workflows/`, `apps/web/`, `docs/`
- [ ] SLA timers with breach predictors; escalation ladders; paged ownership.  
- [ ] Cross‑border case variants with residency/retention constraints baked in.  
- [ ] **Brief Factory presets** per locale and case‑type.  
- **DoD:** Median cycle‑time −20% vs S4; cross‑border flow blocked/enabled correctly by policy; presets reduce analyst edits by 30%.

### WS‑H — Threat‑Fwd Guardrails (v4)
**Lead:** @redteam • **Areas:** `copilot/`, `alerts/`, `analytics/`
- [ ] Cross‑tenant exfil heuristics strengthened; burst‑rate traps; sandboxed tool use.  
- [ ] Abuse telemetry to product feedback loop; automatic **safe‑mode** toggles.  
- [ ] Red‑team campaign #4; publish limits/commitments v1.0.  
- **DoD:** ≥92% attack scenarios detected; <4% analyst false positives; public limits doc shipped.

### WS‑I — DevEx Receipts v2
**Lead:** @devrel • **Areas:** `ci/`, `examples/`, `sdks/`
- [ ] PR bot enforces **fixtures + demo scripts + verifier outputs** as merge preconditions.  
- [ ] SDK smoke tests per release train; quickstart telemetry (time‑to‑first‑verify).  
- **DoD:** 100% merged PRs carry receipts; quickstart TTFTV <10 min p90; SDK tests block bad releases.

---
## Cross‑Cut Deliverables
- **Z1. ZTDP Attestation Pack:** KMS config, rotation proofs, compute attestation receipts.  
- **Z2. Multilingual Golden Set:** adjudication tasks across locales + ER metrics.  
- **Z3. Compliance Binder v1.3:** weekly attestation, drift diffs, auditor export examples.  
- **Z4. Perf Board v3:** cost/latency deltas, cache hit‑rates, planner hints adopted.  
- **Z5. Growth Kit:** self‑serve flows, upsell hooks, ROI report templates.

---
## Schedule & Cadence
- **D71–D73:** ZTDP design + KMS wiring; i18n scaffold; ingest baselines; PR bot upgrades.  
- **D74–D78:** ZTDP scoped compute; transliteration pipelines; ingest 2× push; planner 3.2; upsell/self‑serve.  
- **D79–D82:** Compliance automation; cross‑border playbooks; guardrails v4; ROI explorer.  
- **D83–D84:** Hardening; docs; attestation packs; demo + receipts.

---
## Acceptance Gates (Exit)
- ✅ ZTDP: per‑tenant keys active; scoped compute enforced; attestations recorded.  
- ✅ i18n: two locales live; multilingual ER within −2pp F1; citations valid.  
- ✅ Compliance: weekly attestation job green; drift alarms in place; one‑click auditor export reconstructs a case.  
- ✅ Throughput: 200k/min sustained ingest; p95 graph −15% vs S5; copilot p50 <600ms/p95 <1.1s.  
- ✅ Growth: self‑serve sandbox; upsell toggles live; ROI export signed.  
- ✅ DevEx: 100% PR receipts; quickstart TTFTV <10 min p90.

---
## Risks & Mitigations
- **TEE/attestation complexity** → stub path now with clear swap‑in for chosen TEE; strong docs.  
- **Multilingual ER regressions** → golden sets + per‑locale thresholds + adjudication routes.  
- **Cost spikes from encryption** → hot/cold policy‑aware caches + selective encrypt‑in‑use.  
- **Policy drift noise** → tenant‑specific thresholds + manual approval gates.  
- **Self‑serve misconfig** → guardrails + sandbox default‑deny + IaC diff checks.

**Crush variance. Globalize the win. Trust no one—verify everything.**