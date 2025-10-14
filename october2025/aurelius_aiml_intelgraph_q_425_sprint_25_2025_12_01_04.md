# AURELIUS — Next Sprint Plan (Sprint 25)

**Workstream:** IntelGraph — AI/ML Research & Engineering  
**Cadence Alignment:** Q4’25, **Sprint 25** (2025‑12‑01 → 2025‑12‑12, 10 business days)  
**Author:** AURELIUS  
**Version:** v1.0 (2025‑09‑30)

---

## 1) Objectives (What we will ship)
**O1 — Production Readiness GA:** Promote NL→Graph Preview + Receipts to GA with multi‑tenant configs, rate limits, quotas, and SLO dashboards.  
**DoD:** Multi‑tenant policies live; p95 SLO alerts and dashboards; on‑call runbook; canary + rollback.

**O2 — Edge/WASM Execution Path:** Ship a WASM runtime to run preview, cost estimation, and rewriting entirely in‑browser/edge (no secrets), with deterministic outputs.  
**DoD:** `aurelius-wasm` bundle < 3.5 MB; preview parity tests ≥ 99.5%; offline demo works.

**O3 — Graph Embeddings + Intent‑Aware Retriever:** Add compact graph embeddings (node2vec‑lite) and an intent‑aware retriever to constrain candidate subgraphs before NL→Cypher.  
**DoD:** Retriever reduces explored nodes by ≥ 40% at equal correctness; receipts log embedding versions.

**O4 — Caching & Learned Reuse:** Introduce query/plan cache with **semantic keys** (intent+schema hash) and TTL, plus learned reuse hints.  
**DoD:** ≥ 25% cache hit rate in canary; correctness preserved; cold‑start bounded.

**O5 — Privacy & Safety Hardening:** PII redaction/red‑flagging in receipts and telemetry, plus policy tags for sensitive graph regions.  
**DoD:** Zero PII leaks in red‑team pack; receipts redact by policy while retaining auditability.

---

## 2) KPIs & Targets
- **Perf:** Preview p95 ≤ 220ms (server) / ≤ 280ms (WASM); e2e p95 ≤ 900ms; cache hit ≥ 25%.  
- **Cost:** Median DB cost/query ↓ ≥ 20% vs Sprint 24 (retriever+cache).  
- **Quality:** Exact/functional success ≥ 98.5% on goldens; retriever recall ≥ 0.97.  
- **Robustness:** ≥ 92% mitigation on attack set; zero PII in receipts.  
- **Ops:** SLO pages green ≥ 99.9%; MTTR < 20 min on induced faults.

---

## 3) Backlog (Stories & Estimates)
- **S1 (XL)** Edge/WASM Runtime
  - Port `cost_model_learned_v2` + `rewriter` to WASM via Pyodide or Rust→wasm; seed‑deterministic RNG; snapshot tests.
  - WASM bridge API: `previewWasm(q, schema, budget)` returning `{cypher, estimate, policy}`.
- **S2 (L)** Graph Embeddings + Retriever
  - Train node2vec‑lite or FastRP on demo graph + pluggable stats; intent‑aware scoring function; fallback to full scan on low confidence.
  - Receipts include embedding hash + params; dataset card.
- **S3 (M)** Semantic Cache
  - Key: `hash(intent, schema_signature, user_policy, rewrite_signature)`; LRU + TTL; invalidation hooks on schema drift.
  - Canary metrics + ablation vs no‑cache.
- **S4 (M)** Multi‑Tenancy & Quotas
  - Quota policy: tokens/min, queries/min, cost budget/user; OPA + rate limiter; per‑tenant receipts and dashboards.
- **S5 (M)** Privacy Guard
  - PII detectors (regex + ML lite) → redact in receipts/telemetry; sensitive subgraph labels; policy fail‑closed.
- **S6 (S)** Ops & Observability
  - SLO dashboards (p50/p95, error rate, cache hits, retriever recall); chaos drills; runbook.
- **S7 (S)** IP Pack v4
  - Claims for WASM edge preview, semantic caching, and intent‑aware retrieval; prior‑art expansion.

---

## 4) Deliverables & Repro Pack Diffs
```
/impl/aurelius_core/
  wasm/
    Cargo.toml                 # if Rust path
    src/lib.rs                 # core kernels
    pkg/                       # wasm-bindgen output
  embeddings/
    fast_embeddings.py         # node2vec-lite/FastRP wrapper
    retriever.py               # intent-aware retriever
  cache/
    semantic_cache.py
  privacy/
    pii_guard.py
/ui/components/
  WasmSwitch.tsx
  RetrieverBadge.tsx
  CacheStats.tsx
/experiments/
  configs/wasm_parity.yaml
  configs/retriever_ablation.yaml
  datasets/embeddings/
/benchmark/
  wasm_parity_report.md
  retriever_ablation.md
  cache_effect.md
/ip/
  claims.md (v4)
  prior_art.csv (≥24 rows)
  fto.md (v3)
/integration/gh_actions/
  wasm.build.yml
  slo.canary.yml
  privacy.scan.yml
```

---

## 5) Technical Specs
### 5.1 WASM Runtime
- **Kernels:** cost inference (tiny MLP ensemble) → export weights; rewriting rules; deterministic hashing.
- **Size budget:** < 3.5 MB gz; lazy‑load models; SIMD if available.
- **Parity harness:** run N=1,000 query previews (server vs WASM) → require ≥ 99.5% identical decisions and |Δms| median < 15ms.

### 5.2 Embeddings & Retriever
- **Embedding dim:** 32–64; walk len 40; 10 walks/node; window 5.  
- **Retriever:** score subgraph candidates by (intent, entity types, centrality priors); feed top‑k to NL→Cypher generator.  
- **Safety:** confidence threshold τ; below τ → conservative path; receipts encode k, τ, model ver.

### 5.3 Semantic Cache
- **Value:** preview package + plan; TTL tuned by drift detector.  
- **Coherence:** invalidate on schema/permission change; per‑tenant namespaces.  
- **Metrics:** hit/miss, staleness, correctness audits (shadow compute on sample).

### 5.4 Privacy Guard
- **PII classes:** email, phone, SSN‑like, address; redact in receipts + logs; attach `redactions[]` with reason codes.  
- **Fail‑closed:** if redaction fails, block execution and raise appealable event.

---

## 6) Interfaces & CLI
```bash
# WASM parity test
python -m impl.cli.wasm_parity --cases experiments/configs/wasm_parity.yaml --p99 0.5

# Retriever ablation
python -m impl.cli.retriever_bench --dataset experiments/datasets/demo_graph --topk 5

# Cache canary
python -m impl.cli.cache_canary --dataset experiments/datasets/demo_graph --ttl 600 --lru 5000
```

**Edge API (TypeScript):**
```ts
import { previewWasm } from "@aurelius/core-wasm";
const out = await previewWasm(query, schema, { budgetMs: 900, tenant: "acme" });
if(out.policy.pass) execute(out.cypher);
```

---

## 7) Milestones & Calendar
- **M1 (D3):** WASM kernel parity ≥ 98%; cache MVP; dashboards scaffold.  
- **M2 (D5):** Retriever integrated; ablation shows ≥ 35% node reduction; privacy guard passes core tests.  
- **M3 (D7):** WASM parity ≥ 99.5%; multi‑tenant quotas live; SLO canaries green.  
- **M4 (D9):** Cache tuning + learned reuse; red‑team privacy pack passes 100%; docs.  
- **M5 (D10):** GA readiness review; release & rollback assets prepared.

---

## 8) Acceptance Tests (DoD Gates)
- `make wasm_parity` passes; parity thresholds met.  
- `make retriever_bench` ≥ 40% node reduction; correctness maintained.  
- `make cache_canary` ≥ 25% hit rate; no correctness drift.  
- Privacy scan finds zero unredacted PII across receipts/logs.  
- SLO dashboards show targets met for 48h canary.

---

## 9) Risks & Mitigations
- **WASM perf on low‑end:** feature‑detect SIMD; reduce embedding dims; stream weights.  
- **Retriever recall holes:** confidence thresholds + fallback; periodic refresh.  
- **Cache staleness:** strong invalidation hooks + shadow checks.  
- **PII false positives/negatives:** dual detectors + human review on uncertain; continuous tuning.

---

## 10) IP & Compliance
- New claims on **edge/WASM preview**, **intent‑aware retriever**, and **semantic cache with policy‑bound receipts**.  
- Expand prior‑art; update FTO with WASM/SDK packaging; SPDX/SBOM for WASM bundle.

---

## 11) Release Notes (Template)
**Added:** WASM preview path; graph embeddings + retriever; semantic caching; multi‑tenancy; privacy guard.  
**Changed:** Receipts include embedding and cache provenance; SLO dashboards.  
**Security/Prov:** Zero‑PII receipts; per‑tenant quotas; attestations for WASM builds.  
**Perf:** Preview p95 ≤ 220ms server / ≤ 280ms WASM; e2e p95 ≤ 900ms; ≥20% cost reduction.

