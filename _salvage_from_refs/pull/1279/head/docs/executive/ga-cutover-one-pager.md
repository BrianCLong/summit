# IntelGraph GA Cutover — Executive One‑Pager

**Date:** September 17, 2025
**Audience:** ELT, PMO, Eng/SRE/SecOps Leads
**Decision:** ✅ **GO for GA** (all gates green)

---

## Why Now (Sprint 26 outcomes)

* **Performance:** p95 reads ≤ **350 ms**, writes ≤ **700 ms** (K6, 5 scenarios).
* **Reliability:** ER @ **2× peak** with **< 60 s** lag, **< 0.1%** DLQ.
* **Security/Privacy:** WebAuthn step‑up + OPA reasoner + privacy & licensing enforcement.
* **Supply Chain:** **SLSA3** provenance enforced; `verify-bundle` gated.
* **Cost:** **60–80%** observability spend reduction via adaptive sampling.
* **Operations:** DR drills automated; runbooks and change‑freeze in place.

---

## Go/No‑Go Gates (all ✅)

1. Provenance verification (SLSA3)
2. Canary health **1% → 5% → 25%** within SLOs
3. Redis/Neo4j headroom ≥ **30%**
4. Step‑up exceptions ≤ **0.5%**
5. Error budget burn < **2%/day** (5‑day)

---

## Cutover Plan (T‑24h → T+48h)

* **T‑24h:** Freeze confirm; config snapshot; cache warm; verify attestations; staff on‑call; open war room.
* **T‑0:** Enable 1% canary → observe 15‑min SLOs → ramp to 5%/25%; WebAuthn enforce (risk ≥ Medium); OPA p95 < **25 ms**.
* **T+6h/24h/48h:** Ramp **50% → 100%** if green; provenance spot checks; daily exec update.

---

## Live Guardrails (KPIs)

* **Availability:** 99.9% monthly; burn alerts at **2%/6%/10%** per day.
* **Latency SLOs:** p95 read **≤ 350 ms**; write **≤ 700 ms**.
* **Error Rate:** < **0.5%** total; 5xx < **0.2%**.
* **Policy:** OPA p95 **≤ 25 ms** (goal; max 60 ms).
* **Auth UX:** Step‑up < **0.5%** sessions; failures < **0.2%**.
* **Cost:** Spend rate ≤ **1.0×–1.3×** forecast; sampling floor not sustained > 15 min.

---

## Rollback Triggers (10‑min sustained)

* p95 read > **500 ms** or write > **900 ms** across ≥ 3 tenants.
* Error budget burn > **6%/hr** or **≥ 2%** 5xx/Unexpected policy denials.
* ER lag > **180 s** or DLQ ≥ **0.5%**.
* WebAuthn failures > **2%**; step‑up prompts > **3×** baseline.
* OPA p95 > **60 ms** or cache hit < **85%**.
* Redis P99 > **5 ms** or eviction storm > **2%/min**; Neo4j lag > **250 ms**.

**Rollback Path:** Safe‑mode flags → shrink cohort → redeploy N‑1 (attested) → cache invalidate/rehydrate → post‑incident RC within 24h.

---

## Hypercare (Days 0–14)

* **Coverage:** Days 0–3 (24×7), Days 4–7 (16×5), Days 8–14 (standard on‑call).
* **Handover:** last 8h events, risks (ranked), open actions/owners, next‑shift priorities.
* **Top dashboards:** GraphQL/Redis/Neo4j/ER/OPA/WebAuthn/FinOps (pre‑built links).

---

## Owner Matrix (DRIs)

* **Release Manager:** *Name*
* **SRE Lead:** *Name*
* **Security Lead:** *Name*
* **Data/Graph Lead:** *Name*
* **FinOps Lead:** *Name*
* **Support/Comms:** *Name*

---

## Risks & Mitigations (Top‑5)

1. **Cache churn/evictions** → Conservative cache flag + warm top PQs; Redis headroom.
2. **Replica lag spikes** → Route hot reads to primary; tune page cache; cohort rollback.
3. **ER backpressure** → Throttle bulk ops; DLQ batch reprocess; scale consumers.
4. **Step‑up fatigue** → Lower risk threshold; audit‑only mode; vendor status watch.
5. **Provenance bypass misuse** → VP+ approval; immutable logs; weekly audit.

---

## Comms

* **Exec daily:** status (G/Y/R), traffic split, SLOs, incidents, next steps.
* **Tenant incident:** what/when/impact/remediation/preventive & POC.

---

**Ready to flip to GA.** All systems validated; controlled ramp with strict guardrails and rapid rollback.

