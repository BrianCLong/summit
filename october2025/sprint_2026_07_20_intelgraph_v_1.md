```markdown
# IntelGraph — Social/Communications Intelligence & Coordination Detection Sprint (v1.16.0)
**Slug:** `sprint-2026-07-20-intelgraph-v1-16`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-07-20 → 2026-07-31 (10 business days)  
**Theme:** **Comms→Graph at Speed** — ingest threaded conversations (social, forums, chats), infer conversation graphs, detect coordinated behavior & bots, and surface narratives with citations and policy guardrails.

---
## 0) North Stars & DoD
- **Thread→Graph in Minutes:** Ingest posts/replies/mentions → canonical graph with authors, threads, communities, and time slices.
- **Coordination & Bots:** Tempo‑correlation, content similarity, and account heuristics flag clusters with explainers and false‑positive controls.
- **Narratives & Claims:** Topic/narrative extraction with source citations; exportable narrative cards with license & TLP.
- **Ops SLOs:** p95 thread ingest < **1m** per 10k posts; coordination job < **90s** on 250k edges; UI filter < **200ms**.

**DoD Gate:**
1) Demo: ingest a hashtag stream dump → thread graph + communities render; analyst filters to a time window; top narratives & suspicious clusters appear with explainers.  
2) Bot/coordination detections show reasons (burstiness, similarity, shared metadata) and allow FP suppression; watchlist toasts wired.  
3) Narrative cards export with citations & license; policy gate blocks restricted content; dashboards green.

---
## 1) Epics → Objectives
1. **Comms Ingest (COM‑E1)** — Parsers for common social/forum exports (JSON/CSV), mapping → canonical graph, license/TLP propagation.
2. **Conversation Graph (CONV‑E2)** — Build reply/mention/quote edges, thread IDs, time‑sliced views, community overlays.
3. **Coordination Detection (COORD‑E3)** — Tempo‑corr + shingled text similarity + metadata joins; FP controls & explanations.
4. **Narrative Extraction (NARR‑E4)** — Topic/n‑gram/narrative clustering; Narrative Cards with citations; export & policy checks.
5. **Ops/QA/Docs (OPS‑E5)** — Throughput, latency, FP rates, dashboards, golden corpora, and analyst guides.

---
## 2) Swimlanes
### Frontend (React + MUI + Cytoscape.js + jQuery)
- Thread graph overlay chips (reply/mention/quote); time window slider; community palettes.
- Coordination panel: suspicious cluster list, reasons, FP suppress/ack; watchlist add.
- Narrative Cards explorer; export dialog with policy preview.

### Backend (Node/Express + Apollo + Neo4j + Postgres + Python workers)
- Ingest parsers; mapping to canonical entities/claims; lineage/license stamps.
- Conversation graph builder; community detection jobs; coordination scorer (Python) + writer.
- Narrative extraction (Python) with citations; export pipeline with OPA checks.

### Ops/SRE & Security
- k6 load for ingest/queries; Grafana panels: ingest lag, job durations, FP rate, cluster sizes.

### QA/Docs
- Golden hashtag/forum dumps; coordination gold labels; analyst & operator guides.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### Comms Ingest (26 pts)
1. Parsers (Twitter/X JSON, Reddit JSONL, generic forum CSV).  
   **AC:** Map to Person/Post/Thread/Claim; errors to DLQ; p95 10k posts < 60s. (**L**)
2. License/TLP propagation.  
   **AC:** Source license → posts → claims; blocked exports warn; tests. (**M**)
3. Ingest console.  
   **AC:** Lag chart; DLQ viewer; retry. (**M**)

### Conversation Graph (22 pts)
4. Thread builder & edges.  
   **AC:** reply/mention/quote edges; threadId; time slices; lineage. (**L**)
5. Community overlays.  
   **AC:** Louvain/Leiden job; overlay chips; cache; p95 overlay < 200ms. (**M**)

### Coordination Detection (28 pts)
6. Tempo correlation + burstiness.  
   **AC:** Z‑score bursts (per actor); pairs with corr>τ; reasons logged. (**L**)
7. Text similarity (shingles + MinHash/LSH).  
   **AC:** Candidate near‑dupes; cluster score; UI reasons. (**L**)
8. Metadata joins (shared URLs/UTM/clients).  
   **AC:** Feature table; thresholds; FP suppression window. (**M**)

### Narrative Extraction (12 pts)
9. Topic/narrative clustering + cards.  
   **AC:** Top‑k narratives with exemplar posts; citations; exportable cards. (**M**)

### QA/Docs (4 pts)
10. Golden sets + guides.  
    **AC:** Labeled coordination examples; docs & E2E. (**S**)

---
## 4) Scaffolds & Code

### 4.1 Canonical Mapping (TypeScript)
```ts
// server/src/comms/map.ts
export function mapPost(p:any){
  return {
    person: { id: `user:${p.user.id}`, name: p.user.name, handle: p.user.handle },
    post:   { id: `post:${p.id}`, ts: new Date(p.created_at).toISOString(), text: p.text, lang: p.lang, license: p.license||'Unknown' },
    edges:  edgesFrom(p)
  }
}
function edgesFrom(p:any){
  const out:any[]=[]
  if(p.in_reply_to) out.push({ type:'REPLIED_TO', src:`post:${p.id}`, dst:`post:${p.in_reply_to}` })
  for(const m of (p.mentions||[])) out.push({ type:'MENTIONED', src:`post:${p.id}`, dst:`user:${m}` })
  for(const q of (p.quotes||[])) out.push({ type:'QUOTED', src:`post:${p.id}`, dst:`post:${q}` })
  return out
}
```

### 4.2 Conversation Builder (Cypher)
```cypher
// Build thread edges and threadId
UNWIND $edges AS e
MATCH (s { id: e.src }), (t { id: e.dst })
MERGE (s)-[:REL { kind: e.type, at: datetime() }]->(t);
// ThreadId via roots
MATCH (p:Post)
OPTIONAL MATCH path = (p)-[:REL*1..5]->(root:Post)
WHERE NOT (root)-[:REL]->(:Post)
SET p.threadId = coalesce(p.threadId, root.id)
```

### 4.3 Coordination Scorer (Python FastAPI)
```python
# services/coord/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
import numpy as np
app = FastAPI()

class Post(BaseModel):
    uid: str
    ts: float
    text: str
    url_hashes: List[str] = []

@app.post('/score')
async def score(posts: List[Post]):
    # toy: burstiness via interarrival std, Jaccard on url hashes
    actors = {}
    for p in posts:
        actors.setdefault(p.uid, []).append(p.ts)
    burst = { u: np.std(np.diff(sorted(ts))) if len(ts)>2 else 0 for u,ts in actors.items() }
    return { 'burstiness': burst }
```

### 4.4 MinHash/LSH (TypeScript)
```ts
// server/src/coord/minhash.ts
import crypto from 'crypto'
export function shingle(s:string, k=5){ const out:string[]=[]; for(let i=0;i<=s.length-k;i++) out.push(s.slice(i,i+k)); return out }
export function minhash(sig:string[], h=64){
  const salts = Array.from({length:h}, (_,i)=>`seed${i}`)
  return salts.map(salt => sig.reduce((m,sh)=>{
    const h = crypto.createHash('sha1').update(salt+sh).digest('hex');
    return m < h ? m : h
  }, 'f'.repeat(40)))
}
export function lsh(bands:number, rows:number, mh:string[]){ /* bucket mh into bands */ }
```

### 4.5 Narrative Extraction (Python)
```python
# services/narr/app.py
from fastapi import FastAPI
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
app = FastAPI()

@app.post('/narratives')
async def narratives(texts: list[str], k: int = 6):
    vec = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
    X = vec.fit_transform(texts)
    km = KMeans(n_clusters=k, n_init='auto').fit(X)
    labels = km.labels_.tolist()
    return { 'labels': labels }
```

### 4.6 Narrative Cards (GraphQL)
```graphql
# server/src/graphql/narrative.cards.graphql
 type NarrativeCard { id:ID!, title:String!, summary:String!, citations:[Citation!]!, topics:[String!]!, count:Int! }
 type Citation { sourceId:ID!, postId:ID!, url:String, license:String }
 extend type Query { narratives(caseId:ID!, from:DateTime, to:DateTime, k:Int=6): [NarrativeCard!]! }
```

### 4.7 Policy Gate (OPA) — Restricted Content
```rego
package intelgraph.comms

default allow_export = false

allow_export {
  input.license != "Prohibited"
  not contains_restricted_terms
}

contains_restricted_terms {
  re_match("(?i)pii|medical|children", input.text)
}
```

### 4.8 jQuery — UI Hooks
```js
// apps/web/src/features/comms/jquery-ui.js
$(function(){
  $('#time-slider').on('input', function(){
    const w = $(this).val()
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`{ threadView(caseId:"${caseId}", window:${w}){ nodes{ id } edges{ s t } } }` }) })
  })
  $(document).on('click', '.coord-suppress', function(){
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ coordSuppress(cluster:"${$(this).data('id')}"){ ok } }` }) })
  })
})
```

### 4.9 Grafana Panels (YAML)
```yaml
panels:
  - title: Ingest lag (posts/min)
    query: sum(rate(comms_ingest_total[1m]))
  - title: Coordination job duration p95
    query: histogram_quantile(0.95, sum(rate(coord_ms_bucket[5m])) by (le))
  - title: FP suppressions
    query: sum(rate(coord_fp_suppress_total[1h])) by (reason)
  - title: Narrative coverage
    query: sum(rate(narr_posts_total[5m])) / sum(rate(posts_total[5m]))
```

### 4.10 k6 — Ingest + Query Mix
```js
import http from 'k6/http'
export const options = { vus: 50, duration: '3m' }
export default function(){
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'mutation{ commsIngest(source:"dump.json"){ ok } }' }), { headers:{ 'Content-Type':'application/json' } })
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'{ narratives(caseId:"c1", k:6){ id count } }' }), { headers:{ 'Content-Type':'application/json' } })
}
```

---
## 5) Delivery Timeline
- **D1–D2:** Parsers + mapping; ingest console; thread builder baseline.  
- **D3–D4:** Community overlays; time‑sliced views; coordination (tempo + similarity).  
- **D5–D6:** Metadata joins; FP suppressions; narrative extraction + cards.  
- **D7:** Policy checks; exports; dashboards.  
- **D8–D10:** Perf, docs, golden sets, demo polish.

---
## 6) Risks & Mitigations
- **Content drift/format churn** → robust parsers, contract tests, schema registry for exports.  
- **FP clusters** → thresholds + FP suppressions + analyst feedback loops.  
- **Cost spikes on similarity** → sharding, LSH, caching, cap k.  
- **Policy conflicts** → OPA deny‑by‑default + reasons + overrides logged.

---
## 7) Metrics
- Ingest lag; job durations; FP rate; narrative coverage; export blocks; SLO compliance.

---
## 8) Release Artifacts
- **ADR‑052:** Conversation graph & thread builder.  
- **ADR‑053:** Coordination detection signals & thresholds.  
- **RFC‑041:** Narrative cards & export policy.  
- **Runbooks:** Parser breakage; FP triage; similarity overload; export denials.  
- **Docs:** Analyst comms guide; Coordination panel; Narrative workflow.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Ingest hashtag dump → thread graph renders; time window filter; community overlay on.  
2) Open coordination panel → show clustered accounts with reasons; suppress one FP; watchlist add another.  
3) Open Narrative Cards → pick a narrative → open citations → export narrative pack; policy gate proof.  
4) Grafana: ingest lag, coordination p95, FP suppressions, narrative coverage.

---
## 11) Out‑of‑Scope (backlog)
- Cross‑platform identity resolution; multilingual narrative alignment; real‑time streaming comms; deepfake/media auth.
```
