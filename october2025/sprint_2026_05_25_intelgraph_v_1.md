```markdown
# IntelGraph — GraphRAG Acceleration, Vector Search & Report Studio APIs Sprint (v1.12.0)
**Slug:** `sprint-2026-05-25-intelgraph-v1-12`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-05-25 → 2026-06-05 (10 business days)  
**Theme:** **Ask the Graph, Fast** — production‑grade GraphRAG (chunker→embed→index→retrieve→ground) with guardrails, ANN vector search over claims/evidence, query acceleration (materialized views + plan cache), and external **Report Studio APIs** for programmatic exports.

---
## 0) North Stars & DoD
- **Grounded by Default:** Every Copilot answer references **retrieved claims** with citations; hallucination rate < 1% on golden.
- **Sub‑second Recall:** Vector + metadata filters return top‑k in p95 < **350ms**; plan cache accelerates repeated NL→Cypher.
- **Open Interfaces:** Report Studio APIs let external systems render/verify exports with signatures.
- **Ops SLOs:** Embed throughput ≥ **2k chunks/min/node** (demo); ANN recall@10 ≥ **0.95**; zero Sev‑1.

**DoD Gate:**
1) Demo: ingest a PDF & web page → chunk & embed → ask Copilot a case question → sub‑second grounded answer with citations; show rejection on policy‑violating query.  
2) Repeat the question → plan cache hit; latency drops ≥ 40%; ANN recall dashboards green.  
3) External script calls Report Studio API to generate a signed PDF with selected sections; verifier passes.

---
## 1) Epics → Objectives
1. **GraphRAG Pipeline (RAG‑E1)** — Chunkers for text/PDF, embeddings, metadata store, retriever (ANN + filters), grounding.
2. **Vector Search (VEC‑E2)** — ANN index (HNSW/IVF) backed by Postgres+pgvector or Redis; hybrid lexical+vector ranking.
3. **Query Acceleration (QAX‑E3)** — NL→Cypher plan cache, materialized views for frequent overlays, result cache with invalidation.
4. **Report Studio APIs (REP‑E4)** — REST/GraphQL to compose & sign exports; external verifier improvements.
5. **Ops/QA/Docs (OPS‑E5)** — Throughput/recall panels, cost caps, golden Q&A set, operator & developer guides.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- RAG settings panel (chunk size/overlap, embed model, index status) + test query console.
- Search UI: hybrid ranking toggle; filter chips (case, entity type, license, time); citations preview.
- Report Studio API explorer (OpenAPI viewer), sample snippets, signed export preview.

### Backend (Node/Express + Apollo + Postgres/pgvector + Redis + Workers + Python embed svc)
- Chunker workers (text/PDF); embed service (Python) with batching & caching; metadata writer.
- ANN index builders; hybrid ranker; retriever service with ABAC/purpose filters.
- Plan cache for NL→Cypher; materialized views for overlays; invalidation on writes.
- Report Studio APIs (REST/GraphQL) + signer/verifier; rate limits; audit.

### Ops/SRE & Security
- Backpressure for embed/index queues; quotas; budget hints; tracing from prompt→retrieval→grounding.
- Grafana: embed throughput, ANN recall & latency, cache hit, cost per Q, export success.
- OPA: deny ungrouded answers; enforce license/TLP/ABAC filters in retriever.

### QA/Docs
- Golden Q&A dataset; recall/precision harness; perf tests; API cookbook; grounding & citation guide.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### GraphRAG Pipeline (34 pts)
1. Chunkers (text/PDF) + metadata.  
   **AC:** Configurable chunk size/overlap; store `caseId, sourceId, page, offsets`; unit tests. (**L**)
2. Embed service + cache.  
   **AC:** Batch mode; HNSW‑friendly vectors; caching by (model, hash); throughput ≥ 2k chunks/min/node (demo). (**L**)
3. Retriever with ABAC/purpose filters & grounding.  
   **AC:** Top‑k with citations; filters (case/type/license/time); deny ungrounded answers. (**XL**)

### Vector Search (24 pts)
4. pgvector schema & HNSW/IVFFlat indexes.  
   **AC:** ANN recall@10 ≥ 0.95 on golden; p95 < 350ms; hybrid ranker beats lexical alone by ≥15% nDCG@10. (**L**)
5. Reindex & maintenance tasks.  
   **AC:** Periodic vacuum/reindex; drift monitor; backfill tool. (**M**)

### Query Acceleration (22 pts)
6. NL→Cypher plan cache.  
   **AC:** Keyed by (prompt, schema hash, role); cache hit improves p95 by ≥40%; invalidates on schema change. (**L**)
7. Materialized overlays (communities/PageRank) + invalidation.  
   **AC:** Refresh jobs; cache headers; UI shows freshness; p95 overlay render < 500ms. (**L**)

### Report Studio APIs (12 pts)
8. Compose & sign export (REST/GraphQL) + verifier update.  
   **AC:** Endpoint accepts sections/exhibits; returns signed bundle; CLI verifies. (**M**)

---
## 4) Scaffolds & Code

### 4.1 pgvector Schema & Index
```sql
-- ops/db/pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS chunk_index (
  id BIGSERIAL PRIMARY KEY,
  case_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  page INT,
  offsets INT4RANGE,
  license TEXT,
  kind TEXT,
  ts TIMESTAMPTZ DEFAULT now(),
  embedding vector(768)
);
-- HNSW index
CREATE INDEX IF NOT EXISTS idx_chunk_hnsw ON chunk_index USING hnsw (embedding);
CREATE INDEX IF NOT EXISTS idx_chunk_case ON chunk_index (case_id);
```

### 4.2 Chunker (PDF/Text)
```ts
// workers/chunker/pdf.ts
import pdfjs from 'pdfjs-dist'
import crypto from 'crypto'
export async function chunkPdf(buf:Buffer, caseId:string, sourceId:string, size=1200, overlap=200){
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const out:any[]=[]
  for (let p=1;p<=doc.numPages;p++){
    const page = await doc.getPage(p)
    const text = (await page.getTextContent()).items.map((i:any)=>i.str).join(' ')
    for(let i=0;i<text.length;i+=size-overlap){
      const chunk = text.slice(i, i+size)
      out.push({ caseId, sourceId, page:p, offsets: `[${i},${i+chunk.length})`, text:chunk, id: crypto.createHash('sha1').update(sourceId+p+i+chunk).digest('hex') })
    }
  }
  return out
}
```

### 4.3 Embed Service (Python FastAPI)
```python
# services/embed/app.py
from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
app = FastAPI()

class In(BaseModel):
    texts: list[str]

@app.post('/embed')
async def embed(inp: In):
    # stub: deterministic random for demo; prod uses actual model
    vecs = [np.random.RandomState(abs(hash(t)) % (2**32)).randn(768).tolist() for t in inp.texts]
    return { 'vectors': vecs }
```

### 4.4 Retriever (Hybrid Ranker)
```ts
// server/src/rag/retrieve.ts
import { sql } from '../pg'
import { cosineSim } from './sim'
export async function retrieve(qVec:number[], filters:any, k=10){
  const rows = await sql`SELECT id, case_id, source_id, page, offsets, license, kind, embedding FROM chunk_index WHERE case_id=${filters.caseId}`
  // ANN stub: scan + cosine; replace with pgvector <->
  const scored = rows.map((r:any)=>({ id:r.id, score: cosineSim(qVec, r.embedding), sourceId:r.source_id, page:r.page, offsets:r.offsets }))
  return scored.sort((a:any,b:any)=>b.score-a.score).slice(0, k)
}
```

### 4.5 NL→Cypher Plan Cache
```ts
// server/src/qax/plan-cache.ts
const cache = new Map<string,{ cypher:string, ts:number }>()
export function cacheKey(prompt:string, schemaHash:string, role:string){ return `${schemaHash}:${role}:${prompt}` }
export function getPlan(key:string){ const v = cache.get(key); return v && Date.now()-v.ts< 1000*60*30 ? v : null }
export function setPlan(key:string, cypher:string){ cache.set(key, { cypher, ts: Date.now() }) }
```

### 4.6 Grounding Guard (OPA)
```rego
package intelgraph.rag

default allow = false

allow {
  input.citations_count >= input.min_citations
  not license_violation
}

license_violation {
  some i
  input.citations[i].license == "Prohibited"
}
```

### 4.7 Report Studio API (GraphQL + REST)
```graphql
# server/src/graphql/report.api.graphql
input ExportInput { caseId:ID!, sections:[String!]!, exhibits:[ID!], format:String! }
 type ExportResult { id:ID!, status:String!, url:String, signature:String }
 extend type Mutation { reportExport(input: ExportInput!): ExportResult! }
```

```ts
// server/src/report/api.ts
import express from 'express'
export const reportApi = express.Router()
reportApi.post('/export', async (req,res)=>{ /* validate, compose, sign, enqueue render */ res.json({ id: 'exp_'+Date.now(), status:'queued' }) })
```

### 4.8 jQuery — RAG Console & Search UI
```js
// apps/web/src/features/rag/jquery-console.js
$(function(){
  $('#rag-test').on('click', function(){
    const q = $('#q').val(), caseId = $('#case').val()
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`{ ragSearch(q:"${q}", caseId:"${caseId}"){ text score citation{ sourceId page } } }` }) })
  })
  $('#hybrid-toggle').on('change', function(){ localStorage.setItem('hybrid', this.checked) })
})
```

### 4.9 Grafana Panels (YAML)
```yaml
panels:
  - title: Embed throughput (chunks/min)
    query: sum(rate(embed_chunks_total[1m]))
  - title: ANN recall@10
    query: sum(rate(ann_recall10_pass_total[5m])) / sum(rate(ann_recall10_total[5m]))
  - title: Plan cache hit
    query: sum(rate(plan_cache_hit_total[5m])) / sum(rate(plan_cache_req_total[5m]))
  - title: Grounded answer rate
    query: sum(rate(answers_grounded_total[5m])) / sum(rate(answers_total[5m]))
```

### 4.10 k6 — Embed + Retrieve Mix
```js
import http from 'k6/http'
export const options = { vus: 60, duration: '4m' }
export default function(){
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'mutation{ embedChunks(caseId:"c1", sourceId:"s1") }' }), { headers:{ 'Content-Type':'application/json' } })
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'{ ragSearch(q:"payments to acme last year", caseId:"c1"){ score } }' }), { headers:{ 'Content-Type':'application/json' } })
}
```

---
## 5) Delivery Timeline
- **D1–D2:** Chunkers + metadata; pgvector schema & indexes; embed service wiring.  
- **D3–D4:** Retriever (ANN + filters); hybrid ranker; grounding guard; RAG console.  
- **D5–D6:** Plan cache + materialized overlays; invalidation hooks; dashboards.  
- **D7:** Report Studio APIs + signer/verifier update; API explorer.  
- **D8–D10:** Golden Q&A, recall/latency tuning, docs, demo polish.

---
## 6) Risks & Mitigations
- **Retrieval drift** → drift monitors, periodic reindex, golden set gates.  
- **Costs** → batch embeds, caching, quotas, kill switches.  
- **Ungrounded answers** → OPA guard, min‑citations, UI warnings, deny by default.  
- **Cache staleness** → invalidation on writes and schema hash; TTLs; freshness badges.

---
## 7) Metrics
- Embed throughput; ANN recall@k; retrieval p95; plan cache hit; grounded rate; export success; SLO compliance.

---
## 8) Release Artifacts
- **ADR‑044:** GraphRAG architecture & grounding.  
- **ADR‑045:** Vector index selection (HNSW vs IVF) & hybrid ranking.  
- **RFC‑037:** Report Studio APIs & signatures.  
- **Runbooks:** Reindex drift; ANN latency spikes; cache purge; export failures.  
- **Docs:** RAG setup; API cookbook; grounding guidelines.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Ingest PDF & web page → chunk/embed → show index status & throughput.  
2) Ask Copilot question → see sub‑second grounded answer with citations; toggle hybrid on/off to compare ranking.  
3) Repeat query → observe plan cache hit & faster NL→Cypher; overlay view comes from materialized cache.  
4) Call Report Studio API from a script → download signed export → run verifier.

---
## 11) Out‑of‑Scope (backlog)
- Cross‑modal retrieval (image/audio); RAG‑as‑a‑feature store for plugins; long‑context re‑rankers; streaming RAG.
```

