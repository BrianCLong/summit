# Guy • IntelGraph Platform Workstream — **Recoverability & Active ER v1.1** (Sprint 05)
**Slug:** `guy-intelgraph-platform-recoverability-active-er-2025-12-01-sprint-05`  
**Window:** Dec 1–Dec 12, 2025 (10 biz days)  
**Cadence alignment:** Company Sprint 22 (Q4’25). Builds on S04 Federated Scale & ER v1; addresses seeds from S03.

**Repo base:** `summit-main/` (apps/web, server, er-service, prov-ledger, graph-xai, helm, terraform).  

---

## 0) Continuity & Strategic Delta
**Shipped up to S04:** Federation connectors + streaming ingest, ER v1 (explainable), merge SafeOps, HPA/quotas, ER dashboards.  
**New focus:** **reversibility, learning, and federation reach.** We make merges safe to undo with lineage rewind, close the loop on ER via active learning, and expand connectors into a **Marketplace** with sandbox runners. Add policy‑projected **multi‑graph federation** (read‑through) for cross‑domain analytics.

---

## 1) Sprint Goal
Deliver **Recoverability & Active ER v1.1**: unmerge tooling with provenance‑anchored lineage rewind; an active‑learning loop for ER (feedback→retrain); connector **Marketplace v0.1** (install/run safely); and **Multi‑Graph Read‑Through** with OPA policy projections — while keeping SLOs green.

**Victory Conditions**
- **Unmerge**: Any ER merge performed since S04 can be fully undone in ≤ 5s with relationship restoration and provenance continuity.
- **Active ER**: Analyst accept/decline decisions produce labeled pairs; nightly job retrains ER model; next‑day precision ↑ by ≥2 pp without recall↓.
- **Marketplace**: Install & run a new connector (e.g., JSONLines or S3) in a sandbox; license/DPIA enforced; no prod creds exposure.
- **Multi‑Graph Read‑Through**: Query remote Neo4j/PG sources via **policy‑projected view** (no raw PII leakage); p95 added latency < 300ms on demo.

---

## 2) Backlog (Stories → Acceptance)
### A. Recoverability
1. **Unmerge Tooling** (`server/src/graph/unmerge.ts`, `apps/web/src/features/er-queue/unmerge.tsx`)  
   *AC:* Given provenance claim id or node id pair, restore original nodes/relationships; guard via OPA; audit new claim.
2. **Lineage Rewind** (`prov-ledger` & `server/src/provenance/rewind.ts`)  
   *AC:* Reconstruct prior state by replaying inverse ops; checksum matches snapshot; partial rewind by time/window.

### B. Active Learning ER
3. **Feedback Capture** (`apps/web/src/features/er-queue/feedback.tsx`)  
   *AC:* Accept/decline pushes (pair, features, decision) to labeled store with PII‑safe hashes.
4. **Training Pipeline** (`er-service/train/` + `ops/cron`)  
   *AC:* Nightly trainer builds a new model id; evaluation report (precision/recall/F1) stored; auto‑promote on guard thresholds.
5. **Online Calibrator** (`er-service/calibrate/`)  
   *AC:* Platt scaling/temperature or isotonic per‑batch; drift monitor triggers retrain hint.

### C. Marketplace & Federation
6. **Connector Marketplace v0.1** (`server/src/marketplace/`, `apps/web/src/features/connectors/`)  
   *AC:* Catalog JSON, signed bundles, sandbox execution (Deno/Node --no-network by default, allowlist env), DPIA/license gates.
7. **S3 & JSONLines Connectors** (`server/src/connectors/{s3,jsonl}/`)  
   *AC:* Stream in via contract; incremental resume; license stored.
8. **Multi‑Graph Read‑Through** (`server/src/federation/readthrough/`)  
   *AC:* GraphQL resolver plugs remote sources; **policy projection** strips disallowed fields; caching + TTL.

### D. Observability & Policy
9. **ER Learning Metrics** (`server/src/metrics/er_learning.ts`)  
   *AC:* Labeled pairs/day, model promotions, A/B precision deltas; Grafana panels.
10. **Unmerge Policy** (`SECURITY/policy/opa/unmerge.rego`)  
   *AC:* Only roles Admin/DataSteward; require provenance claim and risk threshold; denial rationale surfaced.

---

## 3) Jira Subtasks CSV (import‑ready)
```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Unmerge Tooling,"Inverse ops + relationship restore + audit.",High,er,server;web,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-02,IG-<parent>
Sub-task,IG,Lineage Rewind,"Prov-ledger replay/rewind APIs + checksums.",High,provenance,server;prov-ledger,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-03,IG-<parent>
Sub-task,IG,ER Feedback Capture,"Queue accept/decline → labeled store.",High,er,web;server,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-03,IG-<parent>
Sub-task,IG,ER Nightly Trainer,"Train/eval/promote with thresholds.",High,er,er-service;ops,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-07,IG-<parent>
Sub-task,IG,Online Calibrator,"Batch calibrator + drift monitor.",Medium,er,er-service,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-06,IG-<parent>
Sub-task,IG,Marketplace Core,"Catalog + signed bundles + sandbox run.",High,marketplace,server;web,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-08,IG-<parent>
Sub-task,IG,S3 Connector,"Reader with pagination/resume + license capture.",High,federation,server,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-09,IG-<parent>
Sub-task,IG,JSONLines Connector,"Stream JSONL files via contract.",Medium,federation,server,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-09,IG-<parent>
Sub-task,IG,Read‑Through Federation,"Remote Neo4j/PG via policy projection + cache.",High,federation,server,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-10,IG-<parent>
Sub-task,IG,Learning Metrics,"Grafana: labeled/day, promotions, deltas.",Medium,telemetry,ops,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-05,IG-<parent>
Sub-task,IG,Unmerge Policy,"OPA for unmerge safety.",High,security,server,,guy@intelgraph.dev,2025.12.r1,"Sprint 22 (Dec 1–12, 2025)",2025-12-02,IG-<parent>
```

---

## 4) Branching Plan
- Branch: `feature/recoverability-active-er-v1-1`
- Integration branches: `feat/unmerge`, `feat/lineage-rewind`, `feat/er-feedback`, `feat/er-train`, `feat/er-calibrate`, `feat/marketplace-core`, `feat/connector-s3`, `feat/connector-jsonl`, `feat/readthrough-federation`, `feat/er-learning-metrics`.

---

## 5) Architecture (ASCII)
```text
Connectors (CSV|REST|PG|S3|JSONL) ──> Contract → Stream → Ingest → Graph
                                           │
                                           ▼
                                   ER Service (train/eval/promote)
                                           │
                                  Feedback (labeled pairs)
                                           │
                                           ▼
                                   Active Learning Loop

Unmerge + Rewind: Prov‑ledger ⇄ Graph SafeOps (inverse ops) ← OPA Unmerge Policy
Federation: Read‑Through Resolvers → Remote Neo4j/PG (Policy Projection + Cache)
```

---

## 6) Code Scaffolding (drop‑in files)
### 6.1 Graph Unmerge & Rewind (server)
```ts
// server/src/graph/unmerge.ts
import neo4j from 'neo4j-driver';
/** Unmerge two previously merged nodes by provenance claim or ids. */
export async function unmergeByClaim(session: neo4j.Session, claimId: string) {
  return session.writeTransaction(async tx => {
    // Lookup merge details recorded during applyMergeDecision
    const res = await tx.run('MATCH (c:Claim {id:$claimId})-[:AFFECTED]->(m:Merged) RETURN m', { claimId });
    if (res.records.length === 0) throw new Error('Claim not found');
    // Example: assume c stores original node ids
    const rec = res.records[0].get('m').properties;
    await tx.run('CALL apoc.refactor.splitNode($id, $originalIds)', { id: rec.mergedId, originalIds: rec.originalIds });
    return { restored: rec.originalIds };
  });
}
```

### 6.2 Provenance Rewind API (server)
```ts
// server/src/provenance/rewind.ts
import fetch from 'node-fetch';
export async function rewindBundle(bundleId: string, toTs?: string) {
  const r = await fetch(process.env.PROV_LEDGER_URL + `/api/v1/rewind`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ bundleId, toTs }) });
  if (!r.ok) throw new Error('Rewind failed');
  return r.json();
}
```

### 6.3 ER Feedback Capture (web)
```tsx
// apps/web/src/features/er-queue/feedback.tsx
import React from 'react';
import $ from 'jquery';
export function FeedbackButtons({ id, pair }: { id:string; pair:any }){
  function send(decision:'accept'|'decline'){
    $.ajax({ url:'/api/er/feedback', method:'POST', contentType:'application/json', data: JSON.stringify({ id, pair, decision })});
  }
  return (
    <div className="space-x-2">
      <button onClick={()=>send('accept')}>Accept (label)</button>
      <button onClick={()=>send('decline')}>Decline (label)</button>
    </div>
  );
}
```

### 6.4 ER Nightly Trainer (Python)
```python
# er-service/train/nightly.py
import json, os
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import precision_recall_fscore_support

# placeholder: load labeled pairs
X, y = ..., ...
# train simple calibrator
cal = IsotonicRegression(out_of_bounds='clip').fit(X, y)
# evaluate
p, r, f1, _ = precision_recall_fscore_support(y, cal.predict(X) > 0.5, average='binary')
report = {"precision": float(p), "recall": float(r), "f1": float(f1)}
with open('er-service/train/report.json','w') as f: json.dump(report, f)
# promote if thresholds met (env)
if p >= float(os.getenv('PROMOTE_P', '0.92')) and r >= float(os.getenv('PROMOTE_R', '0.85')):
  open('er-service/train/PROMOTE','w').write('1')
```

### 6.5 Marketplace Core (server)
```ts
// server/src/marketplace/index.ts
import crypto from 'crypto';
import vm from 'node:vm';
export async function verifyBundle(buf: Buffer, sig: Buffer, pubKeyPem: string){
  const v = crypto.verify('rsa-sha256', buf, pubKeyPem, sig);
  if (!v) throw new Error('Signature verification failed');
}
export function runSandboxed(code: string, env: Record<string,string>){
  const context = vm.createContext({ console, process: { env: env, versions: {} }, Buffer });
  return vm.runInNewContext(code, context, { timeout: 2000 });
}
```

### 6.6 Read‑Through Federation (server)
```ts
// server/src/federation/readthrough/index.ts
import neo4j from 'neo4j-driver';
export async function fetchRemotePeople(driver: neo4j.Driver, policy: (row:any)=>any){
  const s = driver.session();
  const res = await s.run('MATCH (p:Person) RETURN p LIMIT 200');
  await s.close();
  return res.records.map(r => policy(r.get('p').properties));
}
```

### 6.7 OPA Policy — Unmerge
```rego
# SECURITY/policy/opa/unmerge.rego
package unmerge
import future.keywords.in

default allow = false

allow if {
  input.user.role in {"Admin","DataSteward"}
  input.action == "Unmerge"
  input.resource.claimId != ""
}

reason[msg] {
  not allow
  msg := sprintf("Unmerge denied for user=%v", [input.user.id])
}
```

---

## 7) Observability (Panels)
```json
{
  "title": "IntelGraph — Active ER & Rewind",
  "panels": [
    {"type":"stat","title":"Labeled Pairs / day","targets":[{"expr":"sum(increase(er_labels_total[24h]))"}]},
    {"type":"stat","title":"Model Promotions / week","targets":[{"expr":"sum(increase(er_model_promotions_total[7d]))"}]},
    {"type":"graph","title":"Unmerge Ops","targets":[{"expr":"sum(rate(unmerge_ops_total[1h]))"}]}
  ]
}
```

---

## 8) CI/CD Deltas
```yaml
# .github/workflows/active-er.yml
name: active-er
on: [push, pull_request, schedule]
schedule:
  - cron: '0 6 * * *' # nightly UTC
jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r er-service/requirements.txt
      - run: python er-service/train/nightly.py
      - name: Promote
        if: exists('er-service/train/PROMOTE')
        run: echo "promote model artifact" # placeholder
```

---

## 9) Helm Values (S22)
```yaml
# helm/server/values.sprint22.yaml
features:
  unmerge: true
  marketplace: true
  federationReadThrough: true
activeEr:
  promoteThresholds:
    precision: 0.92
    recall: 0.85
cache:
  federationTtlSeconds: 60
```

---

## 10) Demo Script (2 min)
1) Open ER queue → accept/decline a few; show labels count panel rising.  
2) Nightly job (simulated) promotes model; show precision ↑ in report; new model id in provenance.  
3) Mistake found → run **Unmerge** by claim id; relationships restored; bundle logs rewind.  
4) Install **JSONLines** connector from Marketplace; run in sandbox; data streams; license/DPIA captured.  
5) Run a query with **Read‑Through** to remote Neo4j; fields project per policy; latency panel stays <300ms overhead.

---

## 11) Risks & Mitigations
- **Unmerge correctness** → comprehensive inverse‑op tests; snapshot checksums; guard via OPA.
- **Model regressions** → A/B canary on ER model; rollback switch in Helm; promotion requires thresholds.
- **Marketplace sandbox escape** → restricted VM context; allowlist env; signature verification mandatory.
- **Federation data leaks** → strict policy projection; redaction at resolver; caching with TTL; audit access.

---

## 12) Seeds for Sprint 06
- Case Spaces: presence, comments, @mentions;
- Connector marketplace ratings & remote catalogs;
- Motif library expansion (temporal triangles, venue co‑occurrence);
- ER hardening: hierarchical clustering + transitive closure tooling.

