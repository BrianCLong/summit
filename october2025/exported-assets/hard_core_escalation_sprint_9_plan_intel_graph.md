# 🪓 HARdCORE Escalation — Sprint 9 (Day 113–126)

**Start:** 2026‑01‑22  
**Duration:** 14 days  
**Prime Directive:** Escalate pressure on correctness, sovereignty, and speed. Convert every claim into a cryptographic, reproducible receipt and crush tail‑latency. No duplication of S1–S8—only escalation.

---
## Non‑Dup Boundary (inherits S1–S8)
Hands off re‑implementing: prov/attestation + verifier SDKs, authority lifecycle + proofs, ER‑XAI v4, Disclosure Bundler + reply/e‑file, GraphRAG + caches + Planner 3.3, FinOps/billing/entitlements (v2), streaming/CDC + 200k/min, offline kits + DR, A/A multi‑region, chaos/fuzzing v2, SOC‑lite + auditor UX, partner adapters + adapter factory, tenant scale‑out, brief factory + auditor auto‑packs, ZTDP, i18n, continuous compliance, predictive governance, PiT graph, blue/green releases, WORM+.

---
## Sprint Objectives
1) **Receipts Everywhere**: cryptographically signed, human‑readable receipts for queries, exports, policy decisions, and incidents.  
2) **Sovereign Max**: per‑tenant key segregation at the query plan level; attested build provenance chained to runtime.  
3) **Tail‑Latency Murder**: p99 guardrails + circuit breakers + plan hints surfaced to clients.  
4) **Forensic Replay at Scale**: PiT + query replay across tenants and regions with identical results.  
5) **Operational Autonomy**: self‑healing playbooks that act, then explain.

---
## Workstreams

### HC9‑A — Universal Receipts (UR v1)
**Lead:** @prov‑capt • **Areas:** `prov-ledger/`, `gateway/`, `apps/web/`
- [ ] **Receipt schema** for actions: {type, subject, inputs, outputs, hashes, authorityId, policyHash, timestamp}.  
- [ ] Gateway middleware emits receipts for: graph reads/writes, exports, policy denies/allows, billing events.  
- [ ] **Human‑readable receipts** view in UI with verify button; export to packs.  
- **DoD:** 95% of audited actions produce verifiable receipts; external verifier CLI passes on 3 random samples.

### HC9‑B — Sovereign Planner Keys & Build→Runtime Chain
**Lead:** @sre‑hawk • **Areas:** `graph-service/`, `deploy/`, `kms/`
- [ ] Per‑tenant **planner keying**: plan generation restricted by tenant KMS scope; plan hashes attached to receipts.  
- [ ] Build provenance chained to runtime attestation (image digest → node attestation → service receipt).  
- [ ] Break‑glass path with dual‑control + receipts.  
- **DoD:** Receipt shows plan‑hash + tenant key; third‑party verifies build→runtime chain on one service.

### HC9‑C — Tail‑Latency Killbox (p99)
**Lead:** @rag‑marshal • **Areas:** `graph-service/`, `cache/`, `copilot/`, `alerts/`
- [ ] **Adaptive timeouts** + partial answers with evidence when p99 threatens SLO.  
- [ ] Query **shape caps** (max hops/cardinality per plan) with user‑visible hints.  
- [ ] Hot‑path trace sampler + automatic hint suggestions as PR comments.  
- **DoD:** p99 graph read −30% vs S8; zero SLO breaches on eval; partial‑answer path preserves citations.

### HC9‑D — PiT + Replay at Scale (Multi‑Tenant)
**Lead:** @rag‑marshal • **Areas:** `graph-service/`, `storage/`, `cache/`, `apps/web/`
- [ ] **Tenant‑scoped replay** harness with deterministic seeds; diff viewer (node/edge/evidence).  
- [ ] Region parity checker; alert on divergence with provenance traces.  
- **DoD:** 20 case snapshots across 6 tenants replay identically; any divergence emits actionable diffs.

### HC9‑E — IR Auto‑Contain v2
**Lead:** @ops‑audit • **Areas:** `alerts/`, `RUNBOOKS/`, `governance/`, `finops/`
- [ ] Poisoning suspicion → auto‑quarantine + ombuds ticket + policy sim snapshot + operator checklist.  
- [ ] Error‑budget burn → rate‑caps + planner hint injection + cache TTL shrink; revert receipts.  
- [ ] Billing anomaly → meter diff + invoice hold + signal to AE.  
- **DoD:** 3 incident classes auto‑contained; attestation bundles attached to status page; MTTR −30% vs S7.

### HC9‑F — ER‑XAI v5 (Cross‑Locale Robustness)
**Lead:** @er‑wright • **Areas:** `graph-xai/`, `featurestore/`, `apps/web/`
- [ ] Locale transfer tests; **per‑locale thresholds** with decay and adversarial checks.  
- [ ] “Why not merged?” counter‑explanations for high‑risk near‑misses.  
- **DoD:** +2pp F1 on non‑EN golden sets; adversarial near‑miss detection ≥90%; explanations pass sampling audit.

### HC9‑G — Connector Integrity & Throughput v3
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `data-pipelines/`, `storage/`
- [ ] 250k events/min staging with dynamic backpressure and failure envelopes.  
- [ ] **License guard v2**: sink‑side enforcement with clause citations in blockers.  
- [ ] Batch provenance receipts per offset/sequence; replay determinism proofs stored.  
- **DoD:** 250k/min sustained; zero license violations ship; replay proofs resolvable.

### HC9‑H — DevEx Receipts v3 + Demo Batteries
**Lead:** @devrel • **Areas:** `ci/`, `examples/`, `sdks/`
- [ ] CI **receipt gate**: merges blocked without fixtures + verifier output + receipt links.  
- [ ] Demo battery v2 (PiT + multi‑tenant + sovereign/no‑egress).  
- **DoD:** 100% PRs carry receipts; demo battery p90 <12 min; SE “happy path” <10 min.

---
## Cross‑Cut Deliverables
- **E1. Universal Receipt Spec** + SDK bindings.  
- **E2. Build→Runtime Attestation Chain** docs + verifier scripts.  
- **E3. Tail‑Latency Board** with p99, cap hits, partial‑answer frequency.  
- **E4. Replay Kit v2** with tenant and region parity checks.  
- **E5. IR Evidence Packs v2** with auto‑containment receipts.  
- **E6. Non‑EN ER Report** with thresholds, drift, and fairness slices.

---
## Schedule & Cadence
- **D113–D115:** Receipt schema + gateway hooks; planner keying; p99 baselines; replay harness tenants.  
- **D116–D120:** Build→runtime chain; adaptive timeouts; region parity checker; auto‑contain rules.  
- **D121–D124:** Connector 250k/min push; ER v5; CI receipt gate; demo battery.  
- **D125–D126:** Hardening; receipts everywhere; docs; demo + external verification.

---
## Acceptance Gates (Exit)
- ✅ 95%+ audited actions emit verifiable receipts (CLI verified on samples).  
- ✅ Planner receipts show tenant key + plan hash; external verifies build→runtime chain.  
- ✅ p99 graph read −30% vs S8; zero SLO breaches; partial answers fully cited.  
- ✅ 20 PiT replays across 6 tenants identical; divergences diffed with provenance.  
- ✅ 3 incident classes auto‑contained; MTTR −30%.  
- ✅ ER‑XAI: +2pp F1 on non‑EN; 90% adversarial near‑miss flagged with counter‑explanations.  
- ✅ 250k/min ingest sustained; license guard v2 blocks with clause citations; replay proofs stored.  
- ✅ CI receipt gate at 100%; demo battery p90 <12 min.

---
## Risks & Mitigations
- **Receipt sprawl** → schema discipline + sampling for low‑value events.  
- **Planner keying overhead** → memoized plans per tenant + TTL; hint cache.  
- **Partial‑answer confusion** → crystal‑clear UX + resolver links.  
- **Replay storage cost** → tiered PiT retention + diff‑only storage.  
- **Auto‑contain overreach** → human‑approve on escalation + rollback receipts.

**Everything that moves leaves a receipt. We don’t pray for p99—we hunt it.**