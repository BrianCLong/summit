# Architect-General — Multi‑Tenant Residency, Diff Audits, Adaptive Anomaly, SLA Auto‑Remediation

**Workstream:** Governance at Scale — Multi‑Tenant Controls & Self‑Healing Ops  
**Sprint Window:** 2026-01-05 → 2026-01-16 (10 biz days)  
**Ordinal:** Sprint 27 (Q1’26 kick‑off)  
**Prime Objective:** Generalize governance to **multi‑tenant** deployments and make reliability **self‑correcting**: tenant‑scoped residency policies & routing, near‑real‑time EU↔US diff audits, adaptive anomaly thresholds, cohort sampling automation, export transparency attestations to a public index, and SLA auto‑remediation hooks that act before users feel pain.

---

## 0) Executive Summary
- **Track A (Now‑value):**
  - **Tenant‑Scoped Residency** (OPA + router): per‑tenant region/label policies, UI selector, signed bundle.
  - **Diff Audits (Near‑Real‑Time):** CDC compare EU↔US mirrors; emits diffs, exceptions, and proofs.
  - **Adaptive Anomaly Engine:** EWMA + robust z‑score + seasonal windows; fewer false positives.
  - **Cohort Sampling Automation:** auto‑generate synthetic journeys per cohort from production telemetry shapes.
  - **Public Export Index:** pushes transparency attestations + manifests to a queryable public index (read‑only).
  - **SLA Auto‑Remediation:** playbooks → actions (pause deploys, widen canary, scale out, toggle cache) triggered by burn‑rate and provenance SLAs.
- **Track B (Moat):**
  - **Tenant Isolation Tests** (policy fuzz + chaos) in CI; **evidence bundles** per tenant.

**Definition of Done:**
- Tenant policies enforce residency/labels; cross‑tenant leakage tests pass; UI shows active tenant + region.
- Diff audits run ≤60s lag; exceptions triaged with proofs; zero unauthorized cross‑region writes.
- Anomaly alerts reduced ≥40% at same detection power; suppressions fall week‑over‑week.
- Cohort journeys auto‑generated and versioned; canary gates use latest cohort set.
- Export transparency index reachable; entries carry signatures & digests; verifier script green.
- Auto‑remediation actions execute and roll back safely; evidence archived.

---

## 1) Objectives & Key Results

**OBJ‑1: Multi‑Tenant Residency & Labels**  
- **KR1.1** Tenant config schema (`tenants.yaml`) with `region`, `labels`, `data_classes`.  
- **KR1.2** OPA v0.5: tenant‑aware ABAC; deny codes include TENANT and LABEL mismatches.  
- **KR1.3** Router reads tenant → sets `x-tenant-id`, region; UI picker with sticky cookie.  

**OBJ‑2: EU↔US Diff Audits (CDC) v1**  
- **KR2.1** Debezium stream joiner compares per key; emits NDJSON diffs with reasons.  
- **KR2.2** Exception list with TTL + justification; evidence manifests for each run.  
- **KR2.3** Lag p95 ≤ 60s; daily report with counts and MTTR for exceptions.

**OBJ‑3: Adaptive Anomaly Thresholds**  
- **KR3.1** EWMA + MAD‑based z‑score with seasonal baseline (hour‑of‑day, day‑of‑week).  
- **KR3.2** Auto‑tune per rule; store parameters; backtests show 30–50% FPR reduction.  
- **KR3.3** Guardrails to prevent under‑sensitivity (min detection power tests).

**OBJ‑4: Cohort Sampling Automation**  
- **KR4.1** Telemetry → schema sampler → synthetic fixtures per cohort (JSON).  
- **KR4.2** Journey generator renders flows from fixtures; PR‑gated.  
- **KR4.3** Canary uses latest cohort fixtures; gates apply per priority cohort.

**OBJ‑5: Export Transparency Public Index**  
- **KR5.1** Public, read‑only index (static site + JSON index) with signed entries.  
- **KR5.2** CI publisher; verifier script cross‑checks local bundle ↔ index ↔ Rekor.  
- **KR5.3** Availability SLO 99.9% for index; hash chain manifests.

**OBJ‑6: SLA Auto‑Remediation Hooks**  
- **KR6.1** Actions: pause rollout, widen canary window, scale HPA bounds, enable edge cache, flip read‑only mode.  
- **KR6.2** Decision policy (OPA) governing actions + cooldowns.  
- **KR6.3** Simulated incidents prove safe apply + auto‑revert.

---

## 2) Work Breakdown & Owners

| # | Epic | Issue | Owner | Acceptance | Evidence |
|---|------|-------|-------|------------|----------|
| A | Tenant | Tenant schema + UI + router | AppEng | Tenant switch drives region/policy | UI video, headers logs |
| B | Policy | OPA v0.5 tenant ABAC | SecEng | 95% tests; deny codes present | `opa test` report |
| C | Diff | CDC joiner + proofs | DataEng | p95 lag ≤60s; proofs archived | Diff counts, manifests |
| D | Anomaly | EWMA+MAD thresholds | SecEng | FPR ↓≥40% vs baseline | Backtest report |
| E | Cohorts | Fixture generator + journeys | SRE | Gates read fixtures; PR checks pass | CI artifacts |
| F | Exports | Public index + publisher | DevOps | Verifier passes; index SLO 99.9% | Uptime, hashes |
| G | SLA | Auto‑remediation engine | ProdOps | Actions safe & reversible | Run logs, rollback proof |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 Tenant Config & Router
**`config/tenants.yaml`**
```yaml
version: 1
tenants:
  - id: acme
    name: Acme Corp
    region: EU
    labels: [confidential, pii]
    data_classes: { audit: confidential, agents: internal }
  - id: beta
    name: Beta Ltd
    region: US
    labels: [internal]
    data_classes: { audit: internal, agents: public }
```

**Router Middleware**
```ts
// apps/web/src/middleware/tenant.ts
export function withTenant(handler:any){
  return async (req:any, res:any)=>{
    const t = req.cookies['x-tenant-id'] || req.headers['x-tenant-id'] || 'beta';
    res.setHeader('x-tenant-id', t);
    // Lookup tenant → set x-region
    const region = lookupTenantRegion(t);
    res.setHeader('x-region', region);
    return handler(req,res);
  };
}
```

**UI Picker**
```tsx
// apps/web/src/components/TenantPicker.tsx
export function TenantPicker({ tenants }:{tenants:{id:string,name:string}[]}){
  return (
    <select onChange={e=>document.cookie=`x-tenant-id=${e.target.value}; Path=/; Max-Age=604800`}>{tenants.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}</select>
  );
}
```

### 3.2 OPA v0.5 Tenant ABAC (`policies/switchboard_v0_5.rego`)
```rego
package switchboard

import future.keywords.if

default allow := false

allow if {
  input.subject.authenticated
  input.tenant.id == input.resource.tenant
  input.context.region == data.tenants[input.tenant.id].region
  input.resource.classification <= data.tenants[input.tenant.id].data_classes[input.resource.kind]
  not deny[_]
}

deny[{"code":"TENANT_MISMATCH"}] if { input.tenant.id != input.resource.tenant }

deny[{"code":"RESIDENCY"}] if { input.context.region != data.tenants[input.tenant.id].region }

deny[{"code":"LABEL"}] if { input.resource.label notin data.tenants[input.tenant.id].labels }
```

**Tenants Data (`policies/data/tenants.json`)**
```json
{
  "acme": { "region":"EU", "labels":["confidential","pii"], "data_classes": {"audit":2, "agents":1} },
  "beta": { "region":"US", "labels":["internal"], "data_classes": {"audit":1, "agents":0} }
}
```

**Tests**
```rego
package switchboard_test

allow_acme_audit {
  inp := {"subject": {"authenticated": true}, "tenant": {"id":"acme"}, "resource": {"tenant":"acme","kind":"audit","classification":2,"label":"confidential"}, "context": {"region":"EU"}}
  data.switchboard.allow with input as inp with data.tenants as data.tenants
}
```

### 3.3 Diff Audits CDC Joiner
**Joiner (`services/diff-joiner/main.ts`)**
```ts
// consume audit.US.audit_events.mirror & audit.EU.audit_events.mirror
// join on (tenant,id) → compare payload hashes → emit diff if mismatch
```

**Diff Event Schema**
```json
{ "tenant":"string", "id":"string", "kind":"audit", "lhs_sha256":"string", "rhs_sha256":"string", "reason":"missing|mismatch|late", "ts":"string" }
```

**Proof Manifest**
```json
{ "run_id":"uuid", "started":"ts", "ended":"ts", "counts": {"ok":0, "diff":0}, "sha256":"..." }
```

### 3.4 Adaptive Anomaly Thresholds
**Config (`ops/anomaly/adaptive.yaml`)**
```yaml
rules:
  - id: export-spike
    baseline: seasonal
    method: ewma_mad
    min_power: 0.8
    alpha: 0.2
    window: 7d
```

**Engine (`ops/anomaly/adaptive.ts`)**
```ts
export function ewma(series:number[], alpha:number){
  let m = series[0]; const out=[m];
  for(let i=1;i<series.length;i++){ m = alpha*series[i] + (1-alpha)*m; out.push(m); }
  return out;
}
export function mad(arr:number[]){ const med = quantile(arr,0.5); return quantile(arr.map(x=>Math.abs(x-med)),0.5)||1; }
export function robustZ(x:number, mean:number, madv:number){ return (x-mean)/(1.4826*madv); }
```

**Backtest Notebook (pointer)**
```
/analysis/adaptive_anomaly_backtest.ipynb
```

### 3.5 Cohort Fixture Generator
**`ops/cohort/gen-fixtures.ts`**
```ts
// reads prod telemetry schema (sanitized), samples per cohort, writes fixtures under ops/cohort/fixtures/<cohort>/*.json
```

**Journey Template**
```yaml
steps: [login, home, agents, audit, admin]
context: { region: EU, role: analyst, tenant: acme }
```

### 3.6 Public Export Transparency Index
**Index Format (`public/export-index/index.json`)**
```json
{ "version":1, "entries":[ {"ts":"2026-01-06T12:00:00Z", "region":"EU", "manifest_sha256":"...", "signature":"...", "rekor_uuid":"..." } ] }
```

**Publisher CI**
```yaml
- name: Publish export index
  run: node tools/publish-export-index.js --dest public/export-index
- uses: actions/upload-pages-artifact@v3
- uses: actions/deploy-pages@v4
```

**Verifier (`tools/verify-export-index.ts`)**
```ts
// cross-check entry signature, manifest hash, and Rekor UUID
```

### 3.7 SLA Auto‑Remediation Engine
**Policy (`policies/autoremed.rego`)**
```rego
package autoremed

action["pause_rollout"] { input.slo.burnrate > 2.0; not cooldown("pause_rollout") }
action["scale_out"] { input.slo.latency_p95 > 300 and input.capacity.cpu > 70 }

cooldown(a) { time.now_ns() - input.last[a] > 10 * 60 * 1e9 }
```

**Controller (`ops/autoremed/app.ts`)**
```ts
// reads SLO metrics → evaluates OPA → executes actions via GitHub/GKE APIs with annotations; auto‑revert on green
```

**Runbook**
```md
# Auto‑Remediation
- Actions: pause_rollout, scale_out, widen_canary, enable_edge_cache, read_only_mode
- Safety: dry‑run flag, cooldowns, change annotations, rollback after 15m green
```

---

## 4) Testing Strategy
- **Unit:** tenant policy tests; diff comparator; EWMA/MAD math; cohort fixture generator; autoremed policy.
- **Integration:** tenant switch routes; CDC diff lag; adaptive thresholds backtest; cohort gates in CI; export index verify; autoremed simulate burn.
- **Security:** cross‑tenant access fuzz; export index signatures; OPA decisions logged; remediation actions audited.
- **Performance:** diff joiner p95 latency; anomaly engine runtime ≤1s for 10k events; index publish <30s.

---

## 5) Acceptance Checklist (DoR → DoD)
- [ ] Tenant controls live; deny codes visible; UI picker persistent; tests ≥95%.
- [ ] Diff audits emit proofs; exceptions triaged; no prohibited cross‑region writes.
- [ ] Anomaly alerts down ≥40%; min‑power tests green; suppressions trend down.
- [ ] Cohort fixtures generated; canary uses them; gates enforced.
- [ ] Public export index live; verifier passes; availability SLO met.
- [ ] Auto‑remediation actions safe and reversible; evidence archived (logs, screenshots, hashes).

---

## 6) Risks & Mitigations
- **Tenant sprawl** → templates + schema validation; owner required for new tenants; rate‑limit switches.
- **Diff audit cost** → sample low‑risk tables; batch windows; gzip NDJSON.
- **Adaptive under‑sensitivity** → guardrails + alerts on drop in detections; manual review window.
- **Auto‑remediation blast radius** → dry‑run first; canary‑only actions; tight cooldowns; instant rollback.

---

## 7) Evidence Hooks
- **Tenant policy test report:** …  
- **Diff audit proof manifest:** …  
- **Anomaly backtest chart:** …  
- **Cohort fixture digest:** …  
- **Export index hash:** …  
- **Autoremed action log IDs:** …

---

## 8) Backlog Seed (Sprint 28)
- Tenant‑aware quota & rate limits; fine‑grained residency (sub‑region); diff audit UI; anomaly explainability; cohort traffic replay; export transparency API; SLO policy simulator with what‑if actions.

