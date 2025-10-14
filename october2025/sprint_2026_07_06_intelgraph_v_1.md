```markdown
# IntelGraph — Compliance, Privacy Analytics & Data Subject Requests Sprint (v1.15.0)
**Slug:** `sprint-2026-07-06-intelgraph-v1-15`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-07-06 → 2026-07-17 (10 business days)  
**Theme:** **Trust at Enterprise Scale** — DPIA tooling, DSAR/RTBF pipelines, lineage explorer, privacy test harness, and differentially private (DP) analytics for safe sharing.

---
## 0) North Stars & DoD
- **Whole‑of‑System Auditability:** Every fact is traceable end‑to‑end across collection → transforms → use → export with **purpose** and **license**.
- **Subject Rights at Speed:** DSAR search + export ≤ **2 minutes** for a subject across hot+cold tiers; RTBF (erasure) completes with **provable tombstones**.
- **Privacy by Math:** Release counts/aggregates only when they satisfy **k‑anonymity** or **ε‑DP** budgets.
- **SLOs:** DSAR p95 ≤ 120s; RTBF batch p95 ≤ 10m/10k records; lineage graph load ≤ 900ms; privacy test CI < 5m.

**DoD Gate:**
1) Demo: create a DPIA for a case → run privacy tests → failures block export → fix policies → export proceeds.  
2) DSAR: enter identifiers → results stitch across hot graph + Parquet snapshots; package export; RTBF request enqueued → replayed across shards + snapshots; verifier shows erasure proofs.  
3) DP analytics: run a query that aggregates PII → system enforces `k ≥ 10` or adds calibrated noise (ε=1.0); release includes privacy note + budget ledger.

---
## 1) Epics → Objectives
1. **Lineage & Purpose Explorer (LIN‑E1)** — End‑to‑end lineage view with purpose licenses, transforms & exports; path queries and diffs.
2. **DSAR/RTBF Pipelines (DSR‑E2)** — Subject discovery (PII search), portable package export, erasure with tombstones across hot+cold tiers.
3. **Privacy Policies & Tests (PRV‑E3)** — OPA + unit tests + CI gate; forbidden data flows; purpose/time windows; retention.
4. **DP & k‑Anon Analytics (DPA‑E4)** — k‑anon guard, ε‑DP noise for counts; budget ledger; report annotations.
5. **Ops/QA/Docs (OPS‑E5)** — Dashboards, runbooks, golden privacy packs, auditor checklists.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- **Lineage Explorer:** node→edge walk with filters (purpose/license/time); diff view between two points in time.
- **DSAR Console:** input identifiers, progress bar, hit breakdown (hot/cold), export button; RTBF queue status.
- **Privacy Test Runner:** show failing policies, code fences w/ rego details, quick‑fix links.
- **DP Analytics Panel:** run safe counts; see k‑anon/ε usage and privacy notes on results.

### Backend (Node/Express + Apollo + Neo4j + Postgres + DuckDB/S3 + Workers)
- Lineage resolver building provenance subgraph quickly; purpose/license summarizer.
- DSAR worker: subject search (hot Neo4j + cold Parquet via DuckDB), package builder (JSON/CSV/ZIP+manifest).
- RTBF worker: policy gate + min‑retention checks; hot delete + cold snapshot rewrite + tombstones + audit trail.
- Privacy test runner (OPA + fixtures); DP service with Laplace mechanism; k‑anon guard.

### Ops/SRE & Security
- DSAR/RTBF queues, alerts; privacy budgets, ε‑ledger; immutable logs for erasures; backup/restore verify in RTBF context.

### QA/Docs
- Golden DSAR pack; RTBF replay corpus; privacy test suites; auditor & operator guides.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### Lineage & Purpose (22 pts)
1. Provenance subgraph & summarizer.  
   **AC:** Path from evidence→claim→export; shows purpose/license; loads ≤ 900ms for 10k‑edge subgraph. (**L**)
2. Diff & time window.  
   **AC:** Compare lineage at T1 vs T2; highlight added/removed edges. (**M**)

### DSAR/RTBF (36 pts)
3. Subject discovery across hot+cold.  
   **AC:** Identifier graph walk; cold DuckDB scan; merged result set; progress events. (**XL**)
4. DSAR export pack.  
   **AC:** JSON+CSV + manifest + purpose; hashes; signed ZIP; verifier OK. (**L**)
5. RTBF executor + tombstones.  
   **AC:** Policy checks; hot delete + cold rewrite; tombstone writes; audit chain; replay‑safe idempotency. (**L**)

### Privacy Tests & DP (26 pts)
6. OPA privacy tests & CI gate.  
   **AC:** Fail PR on violations; report with reasons & code pointers. (**L**)
7. k‑anon guard & ε‑DP counts.  
   **AC:** Release only if `k≥10` else add DP noise; annotate result with ε; ledger updated. (**L**)

### QA/Docs (8 pts)
8. Golden privacy packs & runbooks.  
   **AC:** DSAR/RTBF golden set; auditor checklist; operator guide; E2E passes. (**M**)

---
## 4) Architecture & Scaffolds

### 4.1 Lineage Resolver (Cypher + TS)
```ts
// server/src/lineage/resolve.ts
export async function lineageFor(nodeId:string, ctx:any, window?:{from:string,to:string}){
  const cy = `MATCH path=(s)-[r*..6]->(t) WHERE id(s)=$id AND (all(rel IN r WHERE rel.at >= datetime($from) AND rel.at <= datetime($to)) OR $from IS NULL)
             WITH nodes(path) AS ns, relationships(path) AS rs
             UNWIND ns AS n UNWIND rs AS rel
             RETURN collect(DISTINCT {id:id(n), labels:labels(n), props:properties(n)}) AS nodes,
                    collect(DISTINCT {id:id(rel), type:type(rel), props:properties(rel)}) AS rels`
  const res = await ctx.driver.executeQuery(cy,{ id: Number(nodeId), from: window?.from || null, to: window?.to || null })
  const row = res.records[0]
  return { nodes: row.get('nodes'), rels: row.get('rels') }
}
```

### 4.2 DSAR Discovery (DuckDB over Parquet + Neo4j)
```ts
// server/src/dsar/discover.ts
import duckdb from 'duckdb'
export async function discoverSubject(ids:{ email?:string, phone?:string, name?:string }, ctx:any){
  const hot = await ctx.driver.executeQuery('MATCH (p:Person) WHERE p.email=$e OR p.phone=$p OR p.name CONTAINS $n RETURN p LIMIT 10000', { e:ids.email||null, p:ids.phone||null, n:ids.name||'' })
  const cold = await scanCold(ids)
  return mergeHotCold(hot.records.map((r:any)=>r.get('p').properties), cold)
}
async function scanCold(ids:any){
  const db = new duckdb.Database(':memory:'); const c = db.connect()
  const q = `SELECT * FROM read_parquet('s3://ig/cold/person/*.parquet') WHERE email='${ids.email||''}' OR phone='${ids.phone||''}' OR name ILIKE '%${ids.name||''}%' LIMIT 100000`
  const rows = await new Promise<any[]>((res,rej)=> c.all(q,(e,r)=> e?rej(e):res(r)))
  c.close(); return rows
}
```

### 4.3 DSAR Export Pack (Manifest)
```ts
// server/src/dsar/pack.ts
import crypto from 'crypto'
export function buildManifest(items:any[]){
  return {
    createdAt: new Date().toISOString(),
    purpose: 'DSAR',
    items: items.map(x=>({ id:x.id, hash: sha256(JSON.stringify(x)), kind:x.kind })),
    signer: 'IntelGraph',
  }
}
function sha256(s:string){ return crypto.createHash('sha256').update(s).digest('hex') }
```

### 4.4 RTBF Executor (Hot + Cold + Tombstones)
```ts
// server/src/rtbf/execute.ts
export async function eraseSubject(subjectId:string, ctx:any){
  // Hot graph
  await ctx.driver.executeQuery('MATCH (p:Person {id:$id}) DETACH DELETE p', { id: subjectId })
  // Cold snapshots (rewrite plan registered)
  await ctx.queue.enqueue('snapshot-rewrite', { table:'person', predicate:{ id: subjectId } })
  // Tombstone
  await ctx.db.insert('tombstones', { id: subjectId, at: Date.now(), reason:'RTBF' })
}
```

### 4.5 OPA — Privacy Policies & Tests
```rego
package intelgraph.privacy

default allow_export = false

allow_export {
  input.purpose in {"DSAR","Legal","Investigation:Case"}
  not contains_prohibited_license
}

contains_prohibited_license {
  some i
  input.items[i].license == "Prohibited"
}
```

### 4.6 k‑Anon Guard & ε‑DP Counts
```ts
// server/src/privacy/dp.ts
export function kanonCount(count:number, k=10){ return { allowed: count>=k, released: count>=k? count : null } }
export function dpCount(trueCount:number, epsilon=1.0){
  const noise = laplace(0, 1/epsilon)
  return { released: Math.max(0, Math.round(trueCount + noise)), epsilon }
}
function laplace(mu:number, b:number){
  const u = Math.random() - 0.5; return mu - b * Math.sign(u) * Math.log(1 - 2*Math.abs(u))
}
```

### 4.7 DP Budget Ledger (Postgres)
```sql
-- ops/db/dp_ledger.sql
CREATE TABLE IF NOT EXISTS dp_ledger (
  id BIGSERIAL PRIMARY KEY,
  case_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  epsilon NUMERIC NOT NULL,
  query TEXT NOT NULL,
  at TIMESTAMPTZ DEFAULT now()
);
```

### 4.8 jQuery — DSAR & RTBF Console Hooks
```js
// apps/web/src/features/privacy/jquery-dsar.js
$(function(){
  $('#dsar-run').on('click', function(){
    const ids = { email: $('#email').val(), phone: $('#phone').val(), name: $('#name').val() }
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ dsarDiscover(ids:${JSON.stringify(ids)}){ count token } }` }) })
  })
  $('#rtbf-run').on('click', function(){
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ rtbf(subjectId:"${$('#sid').val()}"){ ok } }` }) })
  })
})
```

### 4.9 Grafana Panels (YAML)
```yaml
panels:
  - title: DSAR latency p95
    query: histogram_quantile(0.95, sum(rate(dsar_ms_bucket[5m])) by (le))
  - title: RTBF batch time
    query: histogram_quantile(0.95, sum(rate(rtbf_ms_bucket[15m])) by (le))
  - title: DP epsilon spent
    query: sum(rate(dp_ledger_epsilon_sum[1h])) by (case_id)
  - title: Privacy test failures
    query: sum(rate(privacy_test_fail_total[5m])) by (rule)
```

### 4.10 CI Gate — Privacy Tests
```yaml
# .github/workflows/privacy-tests.yml
name: Privacy Tests
on: [pull_request]
jobs:
  test-privacy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/privacy/run.js --opa ./policies --fixtures ./fixtures/privacy --fail-on-violation
```

---
## 5) Delivery Timeline
- **D1–D2:** Lineage resolver + UI; OPA policy skeleton; DSAR discovery over hot+cold.  
- **D3–D4:** DSAR export pack + verifier; RTBF hot delete + tombstones + snapshot rewrite hook.  
- **D5–D6:** Privacy test runner + CI gate; k‑anon guard + ε‑DP counts; DP ledger.  
- **D7:** Dashboards & alerts; operator/auditor runbooks; soak tests on DSAR/RTBF.  
- **D8–D10:** Hardening, golden packs, docs, demo polish.

---
## 6) Risks & Mitigations
- **Cold tier gaps** → dual‑read compare, snapshot rewrite verifier, audit sampling.  
- **Over‑deletion risk** → dry‑run mode, scopes, approvals, tombstones, restore playbook.  
- **Privacy regressions** → CI gate, red‑team privacy tests, policy diffs.  
- **DP misunderstandings** → annotations and ledger, thresholds, safe defaults.

---
## 7) Metrics
- DSAR latency; RTBF batch time; lineage load time; privacy test failures; ε spend; k‑anon blocks; SLO compliance.

---
## 8) Release Artifacts
- **ADR‑050:** Lineage explorer & purpose model.  
- **ADR‑051:** DSAR/RTBF pipelines & tombstones.  
- **RFC‑040:** Differential privacy & k‑anon guardrails.  
- **Runbooks:** DSAR outages; RTBF replay; privacy test failures; DP ledger audit.  
- **Docs:** Auditor checklist; DSAR/RTBF guides; DP analytics user guide.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Open Lineage Explorer → trace fact to export; view purpose/license chain; run diff T1 vs T2.  
2) Run DSAR across identifiers → watch hot/cold progress → download signed package → verify manifest.  
3) Submit RTBF → see tombstones written → snapshot rewrite job completes → verifier shows erasure proof.  
4) Run aggregate query → k‑anon blocks or ε‑DP noise added → result annotated, ε logged; CI privacy tests passing.

---
## 11) Out‑of‑Scope (backlog)
- Homomorphic encryption; MPC across tenants; synthetic data generation; automated DPIA drafting with LLMs.
```

