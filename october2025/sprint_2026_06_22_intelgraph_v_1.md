```markdown
# IntelGraph — Hyperscale Graph & Streaming Ingest Sprint (v1.14.0)
**Slug:** `sprint-2026-06-22-intelgraph-v1-14`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-06-22 → 2026-07-03 (10 business days)  
**Theme:** **100M+ edges, real‑time ingest, & cheap long‑term storage** — partitioned graphs behind a router, Kafka/CDC streaming ingest with idempotency, overlay compute at scale, and Parquet snapshots with tiered retention.

---
## 0) North Stars & DoD
- **Hyperscale:** Sustain **100M+ edges / 5k qps read / 500 cps write** on demo cluster with p95 < **900ms** for heavy NL→Cypher and < **250ms** for cached queries.
- **Streaming First:** Kafka/CDC pipelines land updates with **exactly‑once** semantics (idempotent merges) and < **5s** end‑to‑end lag.
- **Cost Smart:** Cold data auto‑snapshots to **Parquet on object storage**; online footprint shrinks ≥ **35%** with zero analyst regressions.
- **DoD Gate:**
  1) Live demo: Debezium CDC + Kafka events → Router → correct shard → idempotent merge; overlay refresh publishes InsightCards in < 60s.
  2) Run PageRank/Louvain over a **Parquet snapshot** (Spark/PyArrow), push top‑K back to hot graph; analysts see faster overlays (p95 < 500ms).
  3) Retention policy moves cold subgraphs to Parquet; queries over cold ranges transparently federate to snapshot reader; audit proves no policy violations.

---
## 1) Epics → Objectives
1. **Partitioned Graph Router (PAR‑E1)** — Consistent hashing by `tenantId/caseId`, shard registry, health/lag aware routing, multi‑shard fan‑out for cross‑case queries.
2. **Streaming & CDC (ING‑E2)** — Kafka topics, Debezium for Postgres sources, idempotent merge/upserts to shards, backpressure & DLQ.
3. **Overlay @ Scale (OLY‑E3)** — Batch overlays on Spark/PyArrow over Parquet snapshots; materialize hot results back to shards with freshness metadata.
4. **Snapshots & Retention (SNP‑E4)** — Periodic Parquet snapshots, tiered retention (hot/warm/cold), transparent federation to snapshot reader, verifier.
5. **Ops/QA/Docs (OPS‑E5)** — Throughput/latency/lag dashboards, chaos on brokers/shards, perf harness, operator playbooks & cost models.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- **Shard Admin:** registry table, shard health, rebalancer, move‑case wizard.
- **Ingest Console:** topic lag, DLQ viewer, replay button, idempotency hit/miss chart.
- **Snapshot Browser:** list Parquet snapshots, freshness badges, query test console.

### Backend (Node/Express + Apollo + Neo4j shards + Postgres + Kafka + Redis)
- Router lib & GraphQL gateway integration; shard health; fan‑out & merge; retry with circuit breakers.
- Kafka consumers (kafkajs) for ingest & CDC; Redis idempotency keys; DLQ pipeline.
- Snapshot writer (PyArrow) & reader; Spark job submitter; overlay materializer.

### Ops/SRE & Security
- Terraform modules for Kafka/S3‑compatible storage; backup of topics; quotas; OPA retention gates.

### QA/Docs
- Perf & correctness harness; CDC golden corpus; snapshot diff verifier; playbooks & tuning guide.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **94 pts**

### Partitioned Router (30 pts)
1. Shard registry & consistent hashing.  
   **AC:** Registry with shard URI/role; `hash(tenantId|caseId) → shard`; rehash cost < 1/N. (**L**)
2. GraphQL gateway integration.  
   **AC:** Per‑request context picks shard; cross‑case queries fan‑out + merge; timeouts, retries, circuit breaker. (**L**)
3. Move‑case wizard.  
   **AC:** Drain writes, copy subgraph, swap pointer, verify counts/hashes; RTO < 5 min. (**M**)

### Streaming & CDC (28 pts)
4. Debezium + topics + schemas.  
   **AC:** Source connectors for `entities, relationships, claims`; Avro/JSON schema registry; CI validation. (**L**)
5. Idempotent merge/upsert.  
   **AC:** Dedup via Redis keys; Cypher uses `MERGE` with deterministic IDs; replays are no‑ops; DLQ on poison. (**XL**)
6. Ingest Console + lag/DLQ.  
   **AC:** Lag < 5s steady; DLQ viewer + replay; alerts. (**M**)

### Overlays @ Scale (22 pts)
7. Snapshot compute (PageRank/Louvain).  
   **AC:** Run on Parquet snapshot; write back top‑K to hot shards with freshness tag. (**L**)
8. Freshness‑aware resolvers.  
   **AC:** Overlay resolvers surface `asOf`; UI badge indicates staleness > 24h. (**M**)

### Snapshots & Retention (10 pts)
9. Parquet snapshots + federation.  
   **AC:** Nightly snapshot to S3; cold queries can hit snapshot reader; verifier passes. (**M**)

### QA/Docs (4 pts)
10. Harness + guides.  
    **AC:** Perf harness reproducible; tuning & ops guides published. (**S**)

---
## 4) Scaffolds & Code

### 4.1 Shard Registry & Router
```ts
// server/src/partition/router.ts
import murmur from 'imurmurhash'
export type Shard = { id:string, uri:string, role:'primary'|'replica', region:string, healthy:boolean }
const registry: Shard[] = []
export function register(sh:Shard){ registry.push(sh) }
export function pick(key:string){
  const healthy = registry.filter(s=>s.healthy && s.role==='primary')
  const h = murmur(key).result()
  return healthy[h % healthy.length]
}
```

### 4.2 GraphQL Gateway Hook
```ts
// server/src/graphql/context.ts
import { pick } from '../partition/router'
export async function makeContext(req:any){
  const tenant = req.headers['x-tenant']||'default'
  const caseId = req.headers['x-case']||''
  const shard = pick(`${tenant}|${caseId}`)
  return { tenant, caseId, shard }
}
```

### 4.3 Kafka CDC Consumer (kafkajs)
```ts
// server/src/ingest/cdc.ts
import { Kafka } from 'kafkajs'
import Redis from 'ioredis'
import { upsertEntity } from './merge'
const r = new Redis(process.env.REDIS_URL!)
export async function startCDC(){
  const kafka = new Kafka({ clientId:'ig-cdc', brokers: process.env.KAFKA_BROKERS!.split(',') })
  const consumer = kafka.consumer({ groupId:'ig-cdc-g1' })
  await consumer.subscribe({ topic:'db.entities', fromBeginning:false })
  await consumer.run({ eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value!.toString())
    const key = `idem:${evt.id}:${evt.ts}`
    if (await r.setnx(key, '1')){ await upsertEntity(evt); await r.expire(key, 86400) }
  }})
}
```

### 4.4 Idempotent MERGE (Cypher)
```cypher
// server/src/ingest/merge.cypher
MERGE (e:Entity { id: $id })
ON CREATE SET e += $props, e.createdAt = datetime()
ON MATCH  SET e += $props, e.updatedAt = datetime()
```

### 4.5 DLQ & Replay
```ts
// server/src/ingest/dlq.ts
const dlq:any[] = []
export function toDLQ(msg:any, err:any){ dlq.push({ msg, err, ts:Date.now() }) }
export function replayDLQ(handler:(m:any)=>Promise<void>){ return Promise.all(dlq.splice(0).map(handler)) }
```

### 4.6 Snapshot Writer (Python + PyArrow)
```python
# services/snapshot/write.py
import pyarrow as pa, pyarrow.parquet as pq

def write_edges(rows, path):
    table = pa.Table.from_pylist(rows)
    pq.write_table(table, path, compression='zstd')
```

### 4.7 Spark Overlay (PySpark)
```python
# jobs/overlay/pagerank.py
from pyspark.sql import SparkSession
spark = SparkSession.builder.appName('ig-pagerank').getOrCreate()
edges = spark.read.parquet('s3://ig/snapshots/edges/date=2026-06-22/')
from graphframes import GraphFrame
verts = edges.selectExpr('src as id').union(edges.selectExpr('dst as id')).distinct()
g = GraphFrame(verts, edges)
pr = g.pageRank(resetProbability=0.15, maxIter=10)
pr.select('id','pagerank').write.mode('overwrite').parquet('s3://ig/overlays/pagerank/date=2026-06-22/')
```

### 4.8 Snapshot Reader (Node)
```ts
// server/src/snapshot/reader.ts
import duckdb from 'duckdb'
export async function querySnapshot(sqlText:string, files:string[]){
  const db = new duckdb.Database(':memory:')
  const c = db.connect()
  await new Promise(r=>c.all(`INSTALL httpfs; LOAD httpfs; SET s3_region='auto'`, ()=>r(null)))
  const rows = await new Promise<any[]>((resolve,reject)=> c.all(sqlText, (e,rows)=> e?reject(e):resolve(rows)))
  c.close(); return rows
}
```

### 4.9 Retention Policy (OPA)
```rego
package intelgraph.retention

default allow_cold = false

allow_cold {
  input.case.closed == true
  time.now_ns() - input.case.closed_at_ns > 90 * 24 * 60 * 60 * 1e9  # 90 days
}
```

### 4.10 jQuery — Admin Consoles
```js
// apps/web/src/features/ingest/jquery-admin.js
$(function(){
  $('#replay-dlq').on('click', function(){ $.post('/api/dlq/replay') })
  $('#move-case').on('click', function(){
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ moveCase(caseId:"${$('#cid').val()}", toShard:"${$('#shard').val()}"){ ok } }` }) })
  })
})
```

---
## 5) Delivery Timeline
- **D1–D2:** Shard registry/router + GraphQL hook; Debezium/Kafka topics; idempotency cache.  
- **D3–D4:** Ingest Console (lag/DLQ), MERGE upserts, replay; snapshot writer/reader; Spark job skeleton.  
- **D5–D6:** Overlay materializer + freshness tags; snapshot federation in resolvers; retention OPA gates.  
- **D7:** Perf harness runs; rebalancer & move‑case wizard; chaos on brokers/shards.  
- **D8–D10:** Tuning & dashboards; docs/runbooks; demo polish.

---
## 6) Risks & Mitigations
- **Hot‑spot shards** → better hash seeds, weighted routing, online rebalance.  
- **CDC schema drift** → schema registry + CI checks; versioned handlers.  
- **Spark resource cost** → batch windows, adaptive partitions, push down filters.  
- **Cold data correctness** → snapshot verifier, dual‑read compare during canary.

---
## 7) Metrics
- QPS/CPS; p95/p99 latencies; Kafka lag; idempotency hit rate; DLQ size; snapshot size & duration; overlay freshness; shard balance; cost per day.

---
## 8) Release Artifacts
- **ADR‑048:** Partitioning & Router design.  
- **ADR‑049:** Streaming ingest & idempotency strategy.  
- **RFC‑039:** Parquet snapshot architecture & federation.  
- **Runbooks:** Broker outage; shard hot‑spot; DLQ replay; snapshot failure; move‑case.  
- **Docs:** Admin consoles; ingest setup; overlay at scale; retention policy.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Produce CDC events → watch ingest console (lag < 5s) → router picks shard → merged nodes/edges appear.  
2) Kick nightly snapshot; run Spark PageRank; write back top‑K; overlay badge shows freshness + speedup.  
3) Close case → retention gate moves to cold; query federates to snapshot reader; verifier passes.  
4) Move‑case wizard rebalance; counts/hashes match; traffic continues with p95 < SLO.

---
## 11) Out‑of‑Scope (backlog)
- True cross‑shard transactional writes; distributed Cypher joins; auto‑partitioning by community; lakehouse ACID (Delta/Iceberg) for snapshots.
```

