# Guy • IntelGraph Platform Workstream — **Federated Scale & Entity Resolution v1** (Sprint 04)
**Slug:** `guy-intelgraph-platform-federated-scale-er-2025-11-17-sprint-04`  
**Window:** Nov 17–Nov 28, 2025 (10 biz days)  
**Cadence alignment:** Company Sprint 21 (Q4’25). Builds on S01 Auditable Core, S02 Analyst Assist, S03 Explainable Assist.  
**Repo base:** `summit-main/` (apps/web, server, prov-ledger, graph-xai, helm, terraform).  

---

## 0) Continuity & Strategic Delta
**Shipped up to S03:** Tri‑pane + policy, NL→Cypher (schema/templated), provenance exports, redaction lineage, Graph‑XAI overlays, Case Spaces, resolver SLOs.  
**New focus:** scale, data federation, and first‑class **Entity Resolution (ER)** with explainable link claims. Target 1M+ nodes, 10M+ edges demo‑scale with green SLOs and predictable cost.

---

## 1) Sprint Goal
Deliver **Federated Scale & ER v1**: pluggable data connectors with contracts, a streaming ingest path, ER microservice (PyTorch) producing explainable candidate merges, and ops hardening (HPA/quotas, cache tuning) — all wired to provenance and policy.

**Victory Conditions**
- Ingest from at least **3 connectors** (CSV, OSINT API, DB dump) via a unified contract; streaming path sustains **1k events/sec burst** with backpressure.
- ER v1 links duplicate persons/orgs with **≥0.92 precision / ≥0.85 recall** on demo corpus; each suggestion includes **why** (features, weights).
- End‑to‑end provenance for every ER decision (accepted/declined) captured in bundle; OPA policies enforce merge permissions & audit.
- SLOs green at **p95 graph query < 1.3s** on 1M/10M demo; ingest lag < 30s under burst.

---

## 2) Backlog (Stories → Acceptance)
### A. Federation & Streaming
1. **Connector Contract v1** (`server/src/connectors/contracts/*.json`)  
   *AC:* JSON Schema for dataset types (person/org/event/geo), required fields, license & DPIA hooks.
2. **Connectors (CSV, REST, Postgres)** (`server/src/connectors/{csv,rest,pg}/`)  
   *AC:* Normalizes to contract; emits events to queue; retries & rate‑limits; license recorded.
3. **Streaming Ingest Path** (`server/src/ingest/stream/`)  
   *AC:* Redis Streams (default) with optional Kafka; idempotent consumers; dead‑letter queue; backpressure metrics.

### B. Entity Resolution (ER)
4. **ER Service v1 (PyTorch)** (`er-service/`)  
   *AC:* REST/Grpc endpoint scoring record pairs; feature generator; thresholding; explain‑why payloads; batch & real‑time.
5. **Merge Workflow & UI** (`apps/web/src/features/er-queue/`)  
   *AC:* Analyst queue shows candidates with explanations; accept/decline; merges are policy‑checked, provenance‑logged.
6. **Graph Merge SafeOps** (`server/src/graph/merge.ts`)  
   *AC:* Writes are transactional; rollback on policy denial; audit trail to prov‑ledger with claim ids.

### C. Ops & SLO
7. **HPA & Quotas** (`helm/*/values.sprint21.yaml`)  
   *AC:* CPU/mem autoscale for server, er‑service; per‑namespace resource quotas; rate‑limit defaults.
8. **Cache & Query Tuning** (`server/src/graph/caching.ts`)  
   *AC:* Hot subgraph cache (TTL+LRU), parameterized Cypher patterns, index checks on startup.
9. **Dashboards & Alerts** (`helm/observability/dashboards/er.json`)  
   *AC:* ER precision/recall, ingest lag, stream DLQ, cache hit ratio, Neo4j ops wait, error budget burn.

---

## 3) Jira Subtasks CSV (import‑ready)
```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Connector Contract,"JSON Schemas + validation for incoming datasets.",High,federation,server,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-18,IG-<parent>
Sub-task,IG,CSV Connector,"Stream CSV via contract to queue.",High,ingest,server,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-18,IG-<parent>
Sub-task,IG,REST Connector,"Paginated REST pull with rate limits + retries.",High,ingest,server,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-19,IG-<parent>
Sub-task,IG,Postgres Connector,"CDC/offset pulls to contract events.",Medium,ingest,server,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-20,IG-<parent>
Sub-task,IG,Stream Path,"Redis Streams default + Kafka optional, DLQ, backpressure metrics.",High,stream,server;ops,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-19,IG-<parent>
Sub-task,IG,ER Service,"PyTorch pair scorer + explain-why.",High,er,er-service,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-22,IG-<parent>
Sub-task,IG,ER UI,"Analyst queue with accept/decline, provenance.",High,er,web,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-24,IG-<parent>
Sub-task,IG,Merge SafeOps,"Transactional merges + rollback + audit.",High,graph,server,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-25,IG-<parent>
Sub-task,IG,HPA & Quotas,"Autoscaling, quotas, limits in Helm.",Medium,ops,helm,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-21,IG-<parent>
Sub-task,IG,Dashboards & Alerts,"ER metrics, ingest lag, DLQ, cache hit ratio.",Medium,telemetry,ops,,guy@intelgraph.dev,2025.11.r2,"Sprint 21 (Nov 17–28, 2025)",2025-11-21,IG-<parent>
```

---

## 4) Branching Plan
- Branch: `feature/federated-scale-er-v1`
- Integration branches: `feat/connector-contracts`, `feat/connector-csv`, `feat/connector-rest`, `feat/connector-pg`, `feat/stream-path`, `feat/er-service`, `feat/er-ui`, `feat/merge-safeops`, `feat/hpa-quotas`, `feat/er-dashboards`.

---

## 5) Architecture (ASCII)
```text
Connectors (CSV | REST | PG)
  → Contract Validator → Stream (RedisX | Kafka)
      → Ingest Consumers → Graph Writes (SafeOps)
                                │
                                ▼
                         ER Service (PyTorch)
                                │
                                ▼
                          ER Queue (UI)
                                │
                                ▼
                          Merge/Decline (policy+prov)

Observability: OTEL traces, Prom metrics → Grafana (ER, ingest, cache, Neo4j)
Control: OPA ABAC on merges; provenance bundle records ER decisions.
```

---

## 6) Code Scaffolding (drop‑in files)
### 6.1 Connector Contract (JSON Schema)
```json
// server/src/connectors/contracts/person.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PersonContractV1",
  "type": "object",
  "required": ["id", "name"],
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "email": {"type": ["string","null"]},
    "dob": {"type": ["string","null"], "format": "date"},
    "country": {"type": ["string","null"]},
    "_license": {"type": "string"},
    "_dpia": {"type": "object"}
  }
}
```

### 6.2 CSV Connector (Node/TS)
```ts
// server/src/connectors/csv/index.ts
import fs from 'fs';
import { parse } from 'csv-parse';
import Ajv from 'ajv';
import * as schema from '../contracts/person.json';
import { XAdd } from '../../ingest/stream/redisx';
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema as any);
export async function ingestCsv(path: string, stream = process.env.INGEST_STREAM || 'ig:ingest:person') {
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(path).pipe(parse({ columns: true }))
      .on('data', async (row) => {
        if (!validate(row)) return; // drop invalid; TODO: send to DLQ with reasons
        await XAdd(stream, '*', row);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}
```

### 6.3 Redis Streams Helpers
```ts
// server/src/ingest/stream/redisx.ts
import { createClient } from 'redis';
const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
export async function XAdd(stream: string, id: string, obj: any) { return client.xAdd(stream, id, Object.fromEntries(Object.entries(obj).map(([k,v])=>[k, JSON.stringify(v??null)]))); }
export async function XGroupCreate(stream: string, group: string) {
  try { await client.xGroupCreate(stream, group, '0', { MKSTREAM: true }); } catch {}
}
export async function XReadGroup(stream: string, group: string, consumer: string, count=100) {
  const res = await client.xReadGroup(group, consumer, { key: stream, id: '>' }, { COUNT: count, BLOCK: 1000 });
  return res || [];
}
```

### 6.4 Ingest Consumer → ER
```ts
// server/src/ingest/stream/consumer.ts
import fetch from 'node-fetch';
import { XGroupCreate, XReadGroup } from './redisx';
import { writeToGraph } from '../writers/graph';
const STREAM = process.env.INGEST_STREAM || 'ig:ingest:person';
const GROUP = 'ingesters';
export async function runConsumer() {
  await XGroupCreate(STREAM, GROUP);
  for(;;) {
    const batches = await XReadGroup(STREAM, GROUP, `c-${process.pid}`);
    for (const b of batches) for (const m of b.messages) {
      const row = Object.fromEntries(Object.entries(m.message).map(([k,v]:any)=>[k, JSON.parse(v)]));
      const erResp = await fetch(process.env.ER_URL + '/score', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ record: row })});
      const { candidates } = await erResp.json();
      await writeToGraph(row, candidates);
    }
  }
}
```

### 6.5 Graph Writes (SafeOps)
```ts
// server/src/graph/merge.ts
import neo4j from 'neo4j-driver';
export async function mergePerson(session: neo4j.Session, person: any) {
  return session.writeTransaction(async tx => {
    await tx.run('MERGE (p:Person {id:$id}) SET p += $props RETURN p', { id: person.id, props: person });
  });
}
export async function applyMergeDecision(session: neo4j.Session, aId: string, bId: string) {
  return session.writeTransaction(async tx => {
    // simple consolidate example; real impl must move relationships safely
    await tx.run('MATCH (a:Person {id:$aId}),(b:Person {id:$bId}) CALL apoc.refactor.mergeNodes([a,b],{properties:"combine"}) YIELD node RETURN node', { aId, bId });
  });
}
```

### 6.6 ER Service (FastAPI + PyTorch skeleton)
```python
# er-service/app.py
from fastapi import FastAPI
from pydantic import BaseModel
import torch
import torch.nn as nn

app = FastAPI()

class Record(BaseModel):
    id: str
    name: str | None = None
    email: str | None = None
    dob: str | None = None
    country: str | None = None

class ScoreReq(BaseModel):
    record: dict

class PairScorer(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Sequential(nn.Linear(6, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid())
    def forward(self, x):
        return self.fc(x)

model = PairScorer()

@app.post('/score')
async def score(req: ScoreReq):
    # placeholder: compare to recent window or cache
    feats = torch.tensor([[0.1,0.2,0.0,0.5,0.0,0.1]])
    prob = float(model(feats).detach().numpy()[0][0])
    explanation = {"features": ["name_jw","email_exact","dob_match","country_match","alias_overlap","phone_jw"], "weights": [0.3,0.4,0.1,0.1,0.05,0.05]}
    return {"candidates": [{"existing_id": "p-123", "prob": prob, "explain": explanation}]}
```

### 6.7 ER UI (Analyst Queue with jQuery)
```tsx
// apps/web/src/features/er-queue/Queue.tsx
import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function ErQueue(){
  const [items,setItems] = useState<any[]>([]);
  useEffect(()=>{ $.ajax({ url:'/api/er/queue'}).done((r)=>setItems(r.items||[])); },[]);
  function act(id:string, decision:'accept'|'decline'){ $.ajax({ url:'/api/er/decision', method:'POST', contentType:'application/json', data: JSON.stringify({ id, decision })}).done(()=> setItems(items.filter(i=>i.id!==id))); }
  return (
    <div className="p-3">
      {items.map(it=>(
        <div key={it.id} className="rounded-2xl shadow p-3 mb-2">
          <div className="font-semibold">{it.record.name} ⇄ {it.match.name} ({Math.round(it.prob*100)}%)</div>
          <div className="text-xs opacity-70">why: {it.explain?.features?.join(', ')}</div>
          <div className="mt-2">
            <button className="mr-2" onClick={()=>act(it.id,'accept')}>Accept</button>
            <button onClick={()=>act(it.id,'decline')}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 7) Tests & Quality Gates
- **Unit/Contract**: connector JSON Schema validation; Redis stream helpers; ER scorer I/O; merge safety (relationship preservation mock).
- **E2E**: CSV→stream→ER→queue→accept→merged node; provenance shows decision + explanation.
- **Perf (k6)**: 1k events/sec burst for 5 min; ingest lag <30s; p95 query <1.3s on demo graph.
- **Security**: OPA merge permission enforced; decision tamper‑proof via prov‑ledger; PII in features masked in logs.

---

## 8) CI/CD Deltas
```yaml
# .github/workflows/er-ci.yml
name: er-ci
on: [push, pull_request]
jobs:
  server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run -w server test
  er_service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r er-service/requirements.txt
      - run: pytest -q er-service
```

---

## 9) Helm Values (S21)
```yaml
# helm/server/values.sprint21.yaml
stream:
  broker: "redis"
  redisUrl: "redis://redis-headless:6379"
resources:
  limits:
    cpu: "1"
    memory: "1Gi"
  requests:
    cpu: "250m"
    memory: "512Mi"
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 8
  targetCPUUtilizationPercentage: 65
```

```yaml
# helm/er-service/values.sprint21.yaml
resources:
  limits:
    cpu: "2"
    memory: "2Gi"
  requests:
    cpu: "500m"
    memory: "1Gi"
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 6
```

---

## 10) Grafana Dashboard (ER & Ingest)
```json
{
  "title": "IntelGraph — ER & Ingest",
  "panels": [
    {"type":"graph","title":"Ingest Lag (s)","targets":[{"expr":"max(ingest_lag_seconds)"}]},
    {"type":"stat","title":"ER Precision","targets":[{"expr":"er_true_positive_total/(er_true_positive_total+er_false_positive_total)"}]},
    {"type":"stat","title":"ER Recall","targets":[{"expr":"er_true_positive_total/(er_true_positive_total+er_false_negative_total)"}]},
    {"type":"stat","title":"Cache Hit Ratio","targets":[{"expr":"sum(rate(graph_cache_hits_total[5m]))/sum(rate(graph_cache_requests_total[5m]))"}]}
  ]
}
```

---

## 11) OPA Policy — Merge Permissions (rego skeleton)
```rego
# SECURITY/policy/opa/merge.rego
package merge
import future.keywords.in

default allow = false

allow if {
  input.user.role in {"Admin","DataSteward"}
  input.action == "MergePerson"
  input.resource.explain.confidence >= 0.9
}
```

---

## 12) Provenance Extensions
- Record **connector id**, **license**, **DPIA key**, **ER model version**, **features used**, **threshold**, **analyst decision**, and **merge result hash** in bundle.

---

## 13) Risks & Mitigations
- **Model drift** → versioned ER models; capture features + decisions; nightly eval on labeled set.
- **Ingest bursts** → DLQ + backpressure; HPA + quotas; sampling UI for backlogs.
- **Merge mistakes** → high threshold + human‑in‑the‑loop defaults; easy unmerge tooling queued for S05.
- **License violations** → enforce license gates at connector; block export on incompatible sources.

---

## 14) Demo Script (2 min)
1) Configure CSV + REST connectors → data streams in; ingest lag panel shows healthy.  
2) ER queue surfaces duplicates with explanations; accept one → graph merges, provenance updated.  
3) Run query on merged entity; p95 stays green; show ER precision/recall panels.

---

## 15) Seeds for Sprint 05
- Unmerge tooling + lineage rewind; 
- Active‑learning loop for ER (analyst feedback → retraining set); 
- Connector marketplace & sandbox runners; 
- Multi‑graph federation (read‑through to external Neo4j/PG sourc