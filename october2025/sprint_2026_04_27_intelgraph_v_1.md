```markdown
# IntelGraph — Entity Resolution 2.0, Ground Truth & Data Integrity Sprint (v1.10.0)
**Slug:** `sprint-2026-04-27-intelgraph-v1-10`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-04-27 → 2026-05-08 (10 business days)  
**Theme:** **ER 2.0 (cross‑lingual), Active Labeling & Integrity** — high‑precision entity resolution with cross‑lingual NER, active‑learning labeling loops, audit‑friendly merges/splits, and integrity checks (lineage/versioning/consistency) at scale.

---
## 0) North Stars & DoD
- **Precision First:** ≥ **98.5%** precision on golden pairs; tunable recall buckets with safe review queues.
- **Explainable ER:** Every merge decision has features, scores, and **evidence citations** (text spans, source IDs).
- **Cross‑lingual:** NER + transliteration for **en/es/fr/de/ru/ar**; phonetic & script‑aware blocking.
- **Integrity:** Full lineage + reversible merges/splits; versioned truth sets; integrity audits pass.

**DoD Gate:**
1) Demo: ingest records in multiple languages → ER blocks → active labeling UI → model improves → merges proposed with explainers → review queue approval → reversible operations audited.  
2) Integrity job finds a conflicting merge → auto‑split with reason; lineage graph proves provenance end‑to‑end.  
3) Dashboards show precision/recall, review SLA, disagreement rate, and integrity violations (all green).

---
## 1) Epics → Objectives
1. **ER 2.0 Core (ER2‑E1)** — Blocking keys (phonetic/script), pairwise classifier, graph clustering (connected components/weighted union‑find), explainers.
2. **Cross‑lingual NER & Transliteration (XLG‑E2)** — Language detect, NER, script normalization/transliteration; phonetic codes (Soundex/Double‑Metaphone/Beider–Morse).
3. **Active Labeling & Review (LAB‑E3)** — Uncertainty sampling, review queues, conflict tools, reversible merges/splits, bulk decisions.
4. **Integrity & Versioning (INT‑E4)** — Lineage graph, truth‑set versioning, integrity audits (invariants), rollback tools.
5. **Ops/QA/Docs (OPS‑E5)** — Metrics, perf tests, golden corpora, annotator handbook, operator runbooks.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- ER Review Workbench: pair cards with highlights, feature scores, approve/deny/unsure, bulk ops, keyboard shortcuts.
- Explainers: feature table, source citations, counterfactual hints ("if email mismatched, score drops by X").
- Cross‑lingual helpers: side‑by‑side transliteration, normalized forms, phonetic chips.
- Integrity console: lineage diffs, violations list, one‑click auto‑split.

### Backend (Node/Express + Apollo + Neo4j + Postgres + Python ML svc)
- Blocking service (keys by locale/script/phonetics); candidate generation.
- Python FastAPI `er-ml` for pairwise scoring + embeddings; Node orchestrator for clustering/thresholds.
- Review queues & decision writer; reversible merges/splits with audit + lineage edges.
- Integrity auditor jobs (invariants: conflicting identifiers, inconsistent attributes, license discordance).

### Ops/SRE & Security
- Perf panels for blocking hit‑rate, scoring p95, review throughput; quotas & budgets; audit export.

### QA/Docs
- Golden truth sets (multilingual), evaluation harness; annotator & operator guides.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **94 pts**

### ER 2.0 Core (34 pts)
1. Blocking keys (script/phonetic) + candidate gen.  
   **AC:** Hit‑rate ≥ 95% on golden; p95 block time < 150ms; keys stored per record. (**L**)
2. Pairwise classifier API (Python) + features.  
   **AC:** Outputs score ∈ [0,1] + feature importances; latency p95 < 120ms (cached). (**L**)
3. Graph clustering (weighted union‑find).  
   **AC:** Threshold θ splits clusters; reversible ops; persisted cluster IDs. (**XL**)

### Cross‑lingual (20 pts)
4. Lang‑detect + NER + transliteration.  
   **AC:** en/es/fr/de/ru/ar supported; script normalized; tokens indexed. (**L**)
5. Phonetic codes + chips.  
   **AC:** Soundex/Double‑Metaphone/BM codes stored; chips render in UI; toggles for matching. (**M**)

### Active Labeling (24 pts)
6. Uncertainty sampler + queues.  
   **AC:** Top‑K uncertain pairs enqueued; SLA dashboard; assignments by role. (**L**)
7. Review workbench + bulk ops & keybindings.  
   **AC:** Approve/deny/unsure; bulk (≤50); keyboard shortcuts; audit trail. (**L**)
8. Reversible merge/split tools.  
   **AC:** Merge writes `MERGED_INTO`; split restores; lineage intact. (**M**)

### Integrity (12 pts)
9. Integrity auditor + auto‑split.  
   **AC:** Detect conflicting identifiers & license discord; auto‑split with reason; report export. (**M**)

### QA/Docs (4 pts)
10. Eval harness + guides.  
    **AC:** Precision/recall/F1 + confusion matrix; annotator handbook; operator runbook. (**S**)

---
## 4) Scaffolds & Code

### 4.1 Blocking Keys (TypeScript)
```ts
// server/src/er/blocking.ts
import natural from 'natural'
import { transliterate as tr } from 'transliteration'
export type Keys = { script:string, norm:string, phonetic:string[] }
export function keys(name:string){
  const norm = tr(name).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()
  const script = /[\u0400-\u04FF]/.test(name)?'cyrillic':/[\u0600-\u06FF]/.test(name)?'arabic':'latin'
  const dm = new natural.DoubleMetaphone()
  const codes:string[] = []; dm.process(norm, (p1:string,p2:string)=>{ codes.push(p1); if(p2) codes.push(p2) })
  return { script, norm, phonetic: codes }
}
```

### 4.2 Pairwise Classifier (Python FastAPI)
```python
# services/er-ml/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
import math
app = FastAPI()

class PairIn(BaseModel):
    a: Dict[str, str]
    b: Dict[str, str]

@app.post('/score')
async def score(inp: PairIn):
    # stub features
    name_j = jaccard(tokens(inp.a.get('name','')), tokens(inp.b.get('name','')))
    email_eq = 1.0 if inp.a.get('email') and inp.a.get('email')==inp.b.get('email') else 0.0
    country_eq = 1.0 if inp.a.get('country')==inp.b.get('country') else 0.0
    s = 0.6*name_j + 0.3*email_eq + 0.1*country_eq
    return { 'score': s, 'features': { 'name_j': name_j, 'email_eq': email_eq, 'country_eq': country_eq } }

def tokens(s):
    return set([t for t in s.lower().split() if t])

def jaccard(a,b):
    if not a or not b: return 0.0
    return len(a & b)/len(a | b)
```

### 4.3 Clustering (Weighted Union‑Find)
```ts
// server/src/er/cluster.ts
export class UF {
  p: Record<string,string> = {}; w: Record<string,number> = {}
  f(x:string){ if(!this.p[x]){ this.p[x]=x; this.w[x]=1 } return this.p[x]===x?x:(this.p[x]=this.f(this.p[x])) }
  u(a:string,b:string,w:number){ const pa=this.f(a), pb=this.f(b); if(pa===pb) return; if(this.w[pa]<this.w[pb]) return this.u(b,a,w); this.p[pb]=pa; this.w[pa]+=this.w[pb] }
}
export function cluster(pairs:{a:string,b:string,score:number}[], theta:number){
  const uf = new UF(); for(const p of pairs) if(p.score>=theta) uf.u(p.a,p.b,p.score); return uf
}
```

### 4.4 Reversible Merge/Split (Cypher)
```cypher
// Merge with lineage
MATCH (a:Entity {id:$a}),(b:Entity {id:$b})
MERGE (b)-[:MERGED_INTO { at: datetime(), by:$user, reason:$reason }]->(a)
SET a.clusterId = coalesce(a.clusterId, randomUUID())
SET b.clusterId = a.clusterId
// Split
MATCH (b:Entity {id:$b})-[r:MERGED_INTO]->(a:Entity)
DELETE r
REMOVE b.clusterId
```

### 4.5 Review Queue (GraphQL)
```graphql
# server/src/graphql/er.review.graphql
type Pair { id:ID!, a:Entity!, b:Entity!, score:Float!, features:[Feature!]!, reason:String }
 type Feature { key:String!, value:Float! }
 type ReviewTask { id:ID!, pairs:[Pair!]!, status:String!, assignedTo:User, createdAt:DateTime }
 extend type Query { erQueue(caseId:ID!, limit:Int=50): ReviewTask! }
 extend type Mutation { erDecision(taskId:ID!, pairId:ID!, decision:String!, reason:String): ReviewTask! }
```

### 4.6 jQuery — Review Workbench Hooks
```js
// apps/web/src/features/er/jquery-review.js
$(function(){
  $(document).on('click','.approve', function(){ submit('approve') })
  $(document).on('click','.deny', function(){ submit('deny') })
  $(document).on('keydown', function(e){ if(e.key==='a') submit('approve'); if(e.key==='d') submit('deny') })
  function submit(dec){
    const pairId = $('.pair.active').data('id')
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ erDecision(taskId:"${$('#task').val()}", pairId:"${pairId}", decision:"${dec}") { id } }` }) })
  }
})
```

### 4.7 Integrity Auditor (TypeScript)
```ts
// server/src/integrity/audit.ts
export type Violation = { entityId:string, kind:'conflicting_id'|'license_conflict'|'attr_inconsistent', detail:string }
export async function audit(driver:any):Promise<Violation[]>{
  const res = await driver.executeQuery(`MATCH (e:Entity) WITH e, size(apoc.coll.toSet(e.identifiers)) AS ids WHERE ids>1 RETURN e.id AS id`)
  return res.records.map((r:any)=>({ entityId:r.get('id'), kind:'conflicting_id', detail:'Multiple identifiers' }))
}
```

### 4.8 Evaluation Harness (Node)
```ts
// tools/er-eval/index.ts
import fs from 'fs'
export function evalPairs(pairs:any[]){
  let tp=0,fp=0,tn=0,fn=0
  for(const p of pairs){
    const pred = p.score>=p.theta
    if(pred && p.label) tp++; else if(pred && !p.label) fp++; else if(!pred && !p.label) tn++; else fn++
  }
  const prec = tp/(tp+fp||1), rec = tp/(tp+fn||1), f1 = 2*prec*rec/(prec+rec||1)
  return { tp,fp,tn,fn, precision:prec, recall:rec, f1 }
}
```

### 4.9 Grafana Panels (YAML)
```yaml
panels:
  - title: ER Precision
    query: sum(rate(er_tp_total[5m])) / (sum(rate(er_tp_total[5m])) + sum(rate(er_fp_total[5m])))
  - title: Review Throughput
    query: sum(rate(er_review_decisions_total[5m])) by (decision)
  - title: Integrity Violations
    query: sum(rate(er_integrity_violations_total[15m])) by (kind)
  - title: Blocking Hit‑rate
    query: sum(rate(er_block_hits_total[5m])) / sum(rate(er_block_attempts_total[5m]))
```

### 4.10 k6 — Blocking + Scoring Load
```js
import http from 'k6/http'
export const options = { vus: 50, duration: '3m' }
export default function(){
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'mutation{ erBlockAndScore(caseId:"c1", limit:100){ pairs{ id score } } }' }), { headers:{ 'Content-Type':'application/json' } })
}
```

---
## 5) Delivery Timeline
- **D1–D2:** Blocking keys + candidate gen; lang‑detect/NER/translit; UI shell for review.  
- **D3–D4:** Pairwise scorer + explainers; clustering + thresholds; reversible merges.  
- **D5–D6:** Active labeling queues; workbench + bulk ops + keybindings.  
- **D7:** Integrity auditor + auto‑split; lineage console.  
- **D8–D10:** Eval/golden sets; perf & dashboards; docs, runbooks, demo polish.

---
## 6) Risks & Mitigations
- **Precision regressions** → strict θ gating, review queues, eval harness gates, canary rollouts.  
- **Cross‑lingual quirks** → transliteration fallbacks, phonetic toggles, human review hooks.  
- **Reviewer fatigue** → bulk ops, keyboarding, uncertainty sampling to maximize value.  
- **Integrity drift** → scheduled audits, auto‑split with reason, lineage proofs.

---
## 7) Metrics
- Precision/recall/F1; blocking hit‑rate; scorer p95; review SLA; merges/splits per day; integrity violations; SLO compliance.

---
## 8) Release Artifacts
- **ADR‑040:** ER 2.0 architecture & thresholds.  
- **ADR‑041:** Cross‑lingual NER/transliteration & phonetic blocking.  
- **RFC‑035:** Reviewer workflow & reversible operations.  
- **Runbooks:** Precision regression, review backlog, auto‑split incidents, lineage export.  
- **Docs:** ER explainer guide; Reviewer handbook; Integrity console.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Load multilingual dataset → see phonetic/script chips; run blocking → candidate pairs populate.  
2) Open Review Workbench → approve/deny with keyboard; show explainers & source citations; bulk decisions.  
3) Adjust θ → re‑cluster; merge; show reversible split in Integrity console with lineage.  
4) Show dashboards: precision/recall, review throughput, integrity violations trending to zero.

---
## 11) Out‑of‑Scope (backlog)
- End‑to‑end differentiable ER; cross‑document co‑reference; online learning; privacy‑preserving ER across tenants.
```

