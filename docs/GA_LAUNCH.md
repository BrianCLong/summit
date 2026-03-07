# General Availability (GA) Launch Plan | IntelGraph

## 1) GA Rollout Plan (Three Waves)

### Wave A — Lighthouse (Weeks 0–2)

- **Scope:** 5 lighthouse customers under DPAs.
- **Mode:** Shadow + mirrored prod, **read-only counters** (no auto-post).
- **Gates:**
  - p95 MTTD ≤ 5s
  - precision@90recall ≥ 0.80
  - Zero PII incidents

### Wave B — Scale-Up (Weeks 3–6)

- **Scope:** +20 tenants, regional sharding (US-E/W, EU-C, AP-SE).
- **Mode:** Enable **human-gated counter-ops** for non-sensitive cohorts.
- **Gates:**
  - ECE ≤ 0.05 for attribution calibration
  - False-amplification ≤ 0.5%

### Wave C — Open GA (Week 7+)

- **Scope:** Marketplace listing.
- **Mode:** Full production.
- **Artifacts:** SOC-2 Type II letter, Public status page, security.txt.

## 2) GA SLOs / SLAs

### SLOs

- **Availability:** 99.9% monthly (ingest, detect, attribute).
- **Latency:**
  - p95 Detect ≤ 150 ms
  - p95 Attribution ≤ 450 ms per event
  - Evidence Bundle ≤ 1.5 s
- **Privacy:** 0 P1 PII incidents; audit coverage 100%.

### SLAs

- **Incident Ack:** ≤ 15 min (Gold), 1 hr (Silver), 4 hr (Bronze).
- **MTTR P1:** ≤ 4 hr (Gold), ≤ 8 hr (Silver).

## 3) Risk Matrix

| Threat / Failure Mode                | Likelihood |   Impact | Mitigation (GA)                                               |
| ------------------------------------ | ---------: | -------: | ------------------------------------------------------------- |
| Nation-state red-team campaigns      |       High | Critical | Red cell drills; deception metrics; geo/locale canaries       |
| Prompt injection via content streams |     Medium |     High | Context isolation, instruction allowlist, strict sanitization |
| Purpose creep / GDPR breach          |     Medium | Critical | Frozen purposes in DPIA; DSR automation; 24h raw → hash       |
| Supply-chain (lib poisoning)         |     Medium |     High | SBOM, signature verify, pinned deps, repo scanning            |
| Model drift on microframes           |       High |   Medium | Entropy alarms, weekly eval, hotfix playbooks                 |
| False amplification via counters     |     Medium |     High | Non-amplifying modes, AB guard, human approval                |
