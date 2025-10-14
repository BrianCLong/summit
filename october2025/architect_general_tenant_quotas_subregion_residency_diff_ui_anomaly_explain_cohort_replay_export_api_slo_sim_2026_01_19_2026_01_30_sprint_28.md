# Architect-General — Tenant Quotas, Sub‑Region Residency, Diff UI, Anomaly Explainability, Cohort Replay, Export Transparency API, SLO Simulator

**Workstream:** Governance at Scale & Ops Intelligence — Switchboard Platform  
**Sprint Window:** 2026-01-19 → 2026-01-30 (10 biz days)  
**Ordinal:** Sprint 28 (Q1’26 cadence)  
**Prime Objective:** Convert governance controls into **operator levers** and **user‑visible confidence**: tenant quotas/rate limits, sub‑region residency (state/data paths), diff‑audit UI, anomaly explainability, cohort traffic replay for canaries, public export transparency API, and an SLO “what‑if” simulator that ties policy to deploy gates.

---

## 0) Executive Summary
- **Track A (Now‑value):** Tenant **quota/rate limiting** (per tenant+route), **sub‑region residency (US‑E/EU‑C)** with compliant routing and storage, **Diff Audit UI** with drill‑downs and proofs, **Anomaly Explain** cards, **Cohort Replay** runner hooked to deploy gates.
- **Track B (Moat):** Public **Export Transparency API**, **SLO What‑If Simulator** producing policy diffs & risk scores, plus auto‑generated evidence packs.

**Definition of Done:**
- Quotas enforced at edge+app, dashboards live; violations gated by policy with audit entries.
- Sub‑region residency enforced in router, storage labels, and policy; probes validate; no cross‑sub‑region writes.
- Diff UI renders comparisons and manifest proofs; export and shareable links.
- Explainability surfaces rule, threshold, baseline slice, and sample traces.
- Cohort replay feeds canary score; rollback triggers on <90 for priority cohorts.
- Export Transparency API live with signed responses; SLO Simulator outputs policy recommendations gated in PRs.

---

## 1) Objectives & Key Results

**OBJ‑1: Tenant Quotas & Rate Limits**  
- **KR1.1** Token‑bucket limiter (edge) + leaky‑bucket (app) keyed by `tenant×route×region`.  
- **KR1.2** Quota config (`tenants.yaml` additions) + hot‑reload; 95p under 10µs per check at edge.  
- **KR1.3** Dashboards + alerts on sustained 429s; OPA policy allows emergency overrides.

**OBJ‑2: Sub‑Region Residency (US‑E/W, EU‑C/W)**  
- **KR2.1** Router detects **sub‑region**; storage classes labeled; policy V0.6 enforces `region:sub`.  
- **KR2.2** Data path: audit sharded by sub‑region; CDC mirrors remain **read‑only** cross‑sub.  
- **KR2.3** Probes & DR drill validate sub‑region isolation.

**OBJ‑3: Diff Audit UI**  
- **KR3.1** Grid with status (ok/diff/missing/late), filters (tenant, region, key, reason).  
- **KR3.2** Proof viewer (manifest hash, sample payloads, Rekor link if export‑backed).  
- **KR3.3** Export selected diffs to NDJSON with manifest.

**OBJ‑4: Anomaly Explainability**  
- **KR4.1** Explain cards: rule, baseline window, z‑score, EWMA, contributing features.  
- **KR4.2** Counterfactuals: how to fall below threshold; attach triage checklists.  
- **KR4.3** Store feature slices for 7 days; PII redacted.

**OBJ‑5: Cohort Traffic Replay**  
- **KR5.1** Deterministic replayer from recorded traces (sanitized) → synthetic canary traffic.  
- **KR5.2** Supports priority cohorts; contributes 60% of canary score weight.  
- **KR5.3** Replay safety: rate caps, kill‑switch, tenant sandboxes.

**OBJ‑6: Export Transparency API**  
- **KR6.1** Public API for export index, manifests, and attestation lookups; signed JSON responses.  
- **KR6.2** Verifier CLI hits API; cross‑checks signatures/digests/Rekor UUIDs.  
- **KR6.3** Availability SLO 99.9%; cache headers & ETags.

**OBJ‑7: SLO What‑If Simulator**  
- **KR7.1** Simulator ingests last 7d metrics; predicts burn under changed SLOs/policies.  
- **KR7.2** Produces policy diffs + risk score; PR check comments results; gate on high risk.  
- **KR7.3** Evidence bundle saved per run.

---

## 2) Work Breakdown & Owners

| # | Epic | Issue | Owner | Acceptance | Evidence |
|---|------|-------|-------|------------|----------|
| A | Quotas | Edge+App limiters + dashboards | SRE | p95 check <10µs, alerts wired | Grafana JSON, 429 heatmap |
| B | Residency | Sub‑region routing + policy v0.6 | SecEng | Probes & denies correct | OPA tests, probe logs |
| C | Diff UI | Grid + proofs + export | FE | p95 <300ms; manifest hashes | Video + artifacts |
| D | Explain | Explain cards + counterfactuals | SecEng | Cards render for top 5 rules | Screens, sample traces |
| E | Replay | Cohort replayer + canary tie‑in | SRE | Score shifts reflect replay | Gate logs |
| F | Export API | Signed responses + verifier | DevOps | CLI verify passes, 99.9% SLO | Uptime + hashes |
| G | SLO Sim | What‑if sim + PR gate | ProdOps | Risk calc accurate on backtest | PR comments + reports |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 Quotas & Rate Limits
**Tenant Config Additions (`config/tenants.yaml`)**
```yaml
quotas:
  defaults: { rps: 50, burst: 200 }
  overrides:
    acme: { rps: 80, burst: 300 }
```

**Edge Limiter (pseudo, Vercel/Cloudflare Worker)**
```js
const buckets = new Map();
export async function limit(key, rps, burst){
  const now=Date.now();
  const b=buckets.get(key)||{ tokens:burst, ts:now };
  const elapsed=(now-b.ts)/1000; b.tokens=Math.min(burst, b.tokens+elapsed*rps);
  if(b.tokens<1){ return { allowed:false, retry: Math.ceil((1-b.tokens)/rps*1000) }; }
  b.tokens-=1; b.ts=now; buckets.set(key,b); return { allowed:true };
}
```

**App Limiter (Leaky Bucket)**
```ts
// apps/server/mw/limit.ts
export function rateLimit(key:string, capacity=100, leakPerSec=50){ /* ... */ }
```

**OPA Override (`policies/quotas.rego`)**
```rego
package quotas

allow_override { input.subject.role == "admin"; input.context.emergency == true }
```

**Dashboards** — 429 rate, top tenants/routes, override events.

### 3.2 Sub‑Region Residency
**Policy v0.6 (`policies/switchboard_v0_6.rego`)**
```rego
package switchboard

deny[{"code":"SUBREGION"}] { input.context.subregion != data.tenants[input.tenant.id].subregion }
```

**Tenants Data**
```json
{ "acme": { "region":"EU", "subregion":"EU-C" }, "beta": { "region":"US", "subregion":"US-E" } }
```

**Router**
```ts
const sub = detectSubregion(req); res.headers.set('x-subregion', sub);
```

**StorageClass Labels (K8s)**
```yaml
metadata:
  labels: { residency/subregion: EU-C }
```

### 3.3 Diff Audit UI
```tsx
// apps/web/src/app/diff/page.tsx
export default function Diff(){ /* filters, grid, proof drawer, export */ }
```

**Proof Drawer**
```tsx
// shows manifest hash, sample payloads (redacted), Rekor link if available
```

**API**
```ts
// /api/diff/query?tenant=&subregion=&reason=&since=
```

### 3.4 Anomaly Explain Cards
```tsx
// apps/web/src/components/AnomalyExplain.tsx
export function AnomalyExplain({ a }:{ a:any }){
  return (
    <div className="rounded-2xl p-3 bg-slate-50">
      <div className="font-medium">{a.rule} · z={a.z.toFixed(2)} · ewma={a.ewma.toFixed(2)}</div>
      <div className="text-xs">baseline: {a.baselineRange} · window: {a.window}</div>
      <div className="text-xs">top contributors: {a.features.join(', ')}</div>
      <div className="text-xs">counterfactual: reduce {a.features[0]} by {a.delta}%</div>
    </div>
  );
}
```

### 3.5 Cohort Replay
**Trace Schema (sanitized)**
```json
{ "traceId":"...", "cohort":"regulated_eu", "route":"/agents", "method":"GET", "headers":{ "x-tenant-id":"acme" }, "body":{} }
```

**Replayer**
```ts
// ops/replay/run.ts
// reads fixtures; replays with rate caps; writes probe.results.json
```

**Gate**
```yaml
- name: Cohort replay gate
  run: node ops/gates/cohort-score.js
```

### 3.6 Export Transparency API
**OpenAPI (`apis/export-transparency.yaml` excerpt)**
```yaml
paths:
  /index: { get: { summary: List export entries } }
  /manifests/{sha256}: { get: { summary: Fetch manifest (signed) } }
  /attestations/{uuid}: { get: { summary: Fetch attestation record } }
```

**Signed Response (JWS)**
```ts
// server signs JSON body; returns `Digest`, `ETag`, and `x-rekor-uuid`
```

**Verifier CLI**
```bash
npx export-verify --index https://exports.example.com/index --sha <manifest-sha>
```

### 3.7 SLO What‑If Simulator
**Config**
```yaml
inputs:
  - latency_p95_ms: [250, 300, 350]
  - availability: [99.0, 99.5, 99.9]
scenarios:
  - name: strict
    multipliers: { traffic: 1.2 }
```

**Algorithm (excerpt)**
```ts
// Monte‑Carlo using last 7d distributions; outputs burn probability & expected minutes to breach
```

**PR Check Commenter**
```yaml
- name: SLO what‑if
  run: node tools/slo-whatif.js --config ops/sim/whatif.yaml --out report.md
- uses: marocchino/sticky-pull-request-comment@v2
  with: { path: report.md }
```

---

## 4) Testing Strategy
- **Unit:** limiter math; sub‑region detector; diff proof renderer; explain math; replay runner; JWS signer; simulator math.
- **Integration:** quota overrides; cross‑subregion writes deny; diff export manifest; explain cards for seeded anomalies; cohort replay affects score; API verification; PR gate.
- **Security:** OPA gates for overrides; signed API responses; PII redaction in diff/explain UIs.
- **Performance:** limiter p95 check <10µs (edge); diff UI p95 <300ms; replay runner stable at target RPS; simulator completes <2m.

---

## 5) Acceptance Checklist (DoR → DoD)
- [ ] Quotas & rate limits live with dashboards & alerts.
- [ ] Sub‑region residency enforced end‑to‑end; probes & DR drill green.
- [ ] Diff Audit UI functional with proofs & export.
- [ ] Anomaly explain cards available for top rules.
- [ ] Cohort replay tied to canary gate; rollback on failure path tested.
- [ ] Export Transparency API live, signed; verifier passes.
- [ ] SLO simulator comments on PRs; high‑risk changes blocked.

---

## 6) Risks & Mitigations
- **Limiter hot keys** → sharded keys, jitter, fallback to app limiter.
- **Sub‑region mis‑detect** → manual override + cookie; audit discrepancies.
- **Explain privacy** → aggregate features only; redact trace samples.
- **Replay side effects** → sandbox tenants + read‑only APIs; rate caps + kill switch.

---

## 7) Evidence Hooks
- **429 heatmap URL:** …  
- **Sub‑region probe report:** …  
- **Diff export manifest SHA:** …  
- **Explain sample IDs:** …  
- **Replay score delta:** …  
- **Export API signature digest:** …  
- **SLO sim report link:** …

---

## 8) Backlog Seed (Sprint 29)
- Per‑tenant budget marketplace; sub‑region failover UX; diff audit remediation flows; anomaly RCA helper; cohort traffic shadowing; export API rate‑limit & cache tiering; simulator → auto‑policy proposal & review.

