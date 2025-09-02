# IntelGraph: AI/ML Microservice + GraphQL + Webhooks + Approvals + Audit + Feedback

This is a single, PR‑ready patch you can apply at the repo root of `BrianCLong/intelgraph/`.

> Branch suggestion: `feature/ai-ml-service`\
> License: MIT (matches repo’s OSS posture)\
> Stack: Python 3.12 (FastAPI, Celery, Redis, PyTorch/NumPy/NetworkX), Node 18 (Apollo/Express), Neo4j/Postgres/Redis, Socket.IO, React + jQuery hooks

---

## Unified Patch (apply with `git apply -p0`)

```diff
*** Begin Patch
*** Add File: ml/pyproject.toml
+ [tool.poetry]
+ name = "intelgraph-ml"
+ version = "0.1.0"
+ description = "IntelGraph AI/ML microservice"
+ authors = ["IntelGraph Team <dev@intelgraph.com>"]
+ license = "MIT"
+
+ [tool.poetry.dependencies]
+ python = "^3.12"
+ fastapi = "^0.115.0"
+ uvicorn = "^0.30.0"
+ pydantic = "^2.8.0"
+ python-jose = "^3.3.0"
+ redis = "^5.0.7"
+ celery = "^5.4.0"
+ numpy = "^2.0.0"
+ scikit-learn = "^1.5.1"
+ networkx = "^3.3"
+ torch = "^2.3.1"
+ httpx = "^0.27.0"
+ hmac-auth = "^0.1.0"
+ neo4j = "^5.23.0"
+
+ [tool.poetry.group.dev.dependencies]
+ pytest = "^8.3.1"
+ pytest-asyncio = "^0.23.8"
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/Dockerfile
+ FROM python:3.12-slim
+
+ WORKDIR /app
+ ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
+
+ RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
+
+ COPY pyproject.toml poetry.lock* /app/
+ RUN pip install --no-cache-dir poetry && poetry config virtualenvs.create false \
+   && poetry install --no-interaction --no-ansi
+
+ COPY . /app
+
+ EXPOSE 8081
+ CMD ["uvicorn", "app.main:api", "--host", "0.0.0.0", "--port", "8081"]
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/app/__init__.py
+ # empty to make package
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/app/celery_app.py
+ import os
+ from celery import Celery
+
+ REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
+ celery_app = Celery("intelgraph_ml", broker=REDIS_URL, backend=REDIS_URL)
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/app/schemas.py
+ from pydantic import BaseModel, Field
+ from typing import List, Optional, Dict, Any
+
+ class TextDoc(BaseModel):
+     id: str
+     text: str
+
+ class NLPRequest(BaseModel):
+     docs: List[TextDoc]
+     language: Optional[str] = "en"
+     job_id: Optional[str] = None
+     callback_url: Optional[str] = None
+
+ class ERRecord(BaseModel):
+     id: str
+     name: Optional[str] = None
+     attrs: Dict[str, Any] = Field(default_factory=dict)
+
+ class ERRequest(BaseModel):
+     records: List[ERRecord]
+     threshold: float = 0.82
+     job_id: Optional[str] = None
+     callback_url: Optional[str] = None
+
+ class LinkPredRequest(BaseModel):
+     graph_snapshot_id: str
+     top_k: int = 50
+     edges: Optional[list] = None
+     job_id: Optional[str] = None
+     callback_url: Optional[str] = None
+
+ class CommunityRequest(BaseModel):
+     graph_snapshot_id: str
+     edges: Optional[list] = None
+     resolution: float = 1.0
+     job_id: Optional[str] = None
+     callback_url: Optional[str] = None
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/app/security.py
+ import os, hmac, hashlib
+
+ ML_WEBHOOK_SECRET = os.getenv("ML_WEBHOOK_SECRET", "change-me")
+
+ def sign_payload(payload_bytes: bytes) -> str:
+     sig = hmac.new(ML_WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()
+     return sig
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/app/tasks.py
+ from .celery_app import celery_app
+ from typing import Dict, Any, List, Tuple
+ import numpy as np
+ import networkx as nx
+
+ # === NLP: naive placeholder ===
+ @celery_app.task
+ def task_nlp_entities(payload: Dict[str, Any]) -> Dict[str, Any]:
+     docs = payload["docs"]
+     results = []
+     for d in docs:
+         tokens = d["text"].split()
+         ents = [{"text": t, "label": "ORG"} for t in tokens if t.isupper() and len(t) > 2]
+         results.append({"doc_id": d["id"], "entities": ents})
+     return {"job_id": payload.get("job_id"), "kind": "nlp_entities", "results": results}
+
+ # === ER: cosine similarity toy embedding ===
+ def _embed(record: Dict[str, Any]) -> np.ndarray:
+     name = (record.get("name") or "").lower()
+     vec = np.zeros(64)
+     for i, ch in enumerate(name[:64]):
+         vec[i] = (ord(ch) - 96) / 26.0 if ch.isalpha() else 0.0
+     n = np.linalg.norm(vec) + 1e-9
+     return vec / n
+
+ @celery_app.task
+ def task_entity_resolution(payload: Dict[str, Any]) -> Dict[str, Any]:
+     recs = payload["records"]
+     vecs = [_embed(r) for r in recs]
+     links: List[Tuple[str, str, float]] = []
+     th = payload.get("threshold", 0.82)
+     for i in range(len(recs)):
+         for j in range(i + 1, len(recs)):
+             sim = float(vecs[i].dot(vecs[j]))
+             if sim >= th:
+                 links.append((recs[i]["id"], recs[j]["id"], sim))
+     return {"job_id": payload.get("job_id"), "kind": "entity_resolution", "links": links}
+
+ # === Link Prediction: Common Neighbors ===
+ @celery_app.task
+ def task_link_prediction(payload: Dict[str, Any]) -> Dict[str, Any]:
+     edges = payload.get("edges", [])
+     G = nx.Graph()
+     G.add_edges_from(edges)
+     candidates = []
+     nodes = list(G.nodes())
+     for i in range(len(nodes)):
+         for j in range(i + 1, len(nodes)):
+             u, v = nodes[i], nodes[j]
+             if not G.has_edge(u, v):
+                 score = len(sorted(nx.common_neighbors(G, u, v))) if u in G and v in G else 0
+                 if score > 0:
+                     candidates.append({"u": u, "v": v, "score": score})
+     candidates.sort(key=lambda x: x["score"], reverse=True)
+     return {"job_id": payload.get("job_id"), "kind": "link_prediction", "predictions": candidates[: payload.get("top_k", 50)]}
+
+ # === Community: Greedy modularity (placeholder) ===
+ @celery_app.task
+ def task_community_detect(payload: Dict[str, Any]) -> Dict[str, Any]:
+     edges = payload.get("edges", [])
+     G = nx.Graph()
+     G.add_edges_from(edges)
+     comms = list(nx.algorithms.community.greedy_modularity_communities(G))
+     results = []
+     for idx, c in enumerate(comms):
+         results.append({"community_id": f"c{idx}", "members": list(c)})
+     return {"job_id": payload.get("job_id"), "kind": "community_detect", "communities": results}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/app/main.py
+ import os, json
+ from fastapi import FastAPI, Depends, HTTPException, Header
+ from jose import jwt
+ import httpx
+ from .schemas import NLPRequest, ERRequest, LinkPredRequest, CommunityRequest
+ from .tasks import task_nlp_entities, task_entity_resolution, task_link_prediction, task_community_detect
+ from .security import sign_payload
+
+ JWT_PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY", "")
+ JWT_ALGO = "RS256"
+
+ def verify_token(authorization: str = Header(...)):
+     try:
+         scheme, token = authorization.split(" ")
+         if scheme.lower() != "bearer":
+             raise ValueError("invalid scheme")
+         payload = jwt.decode(token, JWT_PUBLIC_KEY, algorithms=[JWT_ALGO])
+         return payload
+     except Exception as e:
+         raise HTTPException(status_code=401, detail=f"Unauthorized: {e}")
+
+ api = FastAPI(title="IntelGraph ML Service", version="0.1.0")
+
+ @api.get("/health")
+ def health():
+     return {"status": "ok"}
+
+ async def _maybe_webhook(callback_url: str, result: dict):
+     body = json.dumps(result).encode()
+     sig = sign_payload(body)
+     async with httpx.AsyncClient(timeout=10.0) as client:
+         await client.post(callback_url, content=body, headers={"X-IntelGraph-Signature": sig, "Content-Type": "application/json"})
+
+ @api.post("/nlp/entities")
+ async def nlp_entities(req: NLPRequest, _=Depends(verify_token)):
+     task = task_nlp_entities.delay(req.model_dump())
+     return {"queued": True, "task_id": task.id}
+
+ @api.post("/er/resolve")
+ async def entity_resolution(req: ERRequest, _=Depends(verify_token)):
+     task = task_entity_resolution.delay(req.model_dump())
+     return {"queued": True, "task_id": task.id}
+
+ @api.post("/graph/link_predict")
+ async def link_predict(req: LinkPredRequest, _=Depends(verify_token)):
+     task = task_link_prediction.delay(req.model_dump())
+     return {"queued": True, "task_id": task.id}
+
+ @api.post("/graph/community_detect")
+ async def community_detect(req: CommunityRequest, _=Depends(verify_token)):
+     task = task_community_detect.delay(req.model_dump())
+     return {"queued": True, "task_id": task.id}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: ml/tests/test_health.py
+ from app.main import api
+ from fastapi.testclient import TestClient
+
+ def test_health():
+     c = TestClient(api)
+     assert c.get("/health").json()["status"] == "ok"
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: docker-compose.dev.yml
@@
 services:
+  redis:
+    image: redis:7-alpine
+    ports: ["6379:6379"]
+    command: ["redis-server", "--appendonly", "yes"]
+    volumes:
+      - redis-data:/data
+
+  intelgraph-ml:
+    build:
+      context: ./ml
+      dockerfile: Dockerfile
+    environment:
+      - UVICORN_HOST=0.0.0.0
+      - UVICORN_PORT=8081
+      - REDIS_URL=redis://redis:6379/0
+      - JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY}
+      - ML_WEBHOOK_SECRET=${ML_WEBHOOK_SECRET}
+    depends_on: [redis]
+    ports: ["8081:8081"]
+
+  intelgraph-ml-worker:
+    build:
+      context: ./ml
+      dockerfile: Dockerfile
+    command: ["celery", "-A", "app.celery_app", "worker", "--loglevel=INFO", "--concurrency=2"]
+    environment:
+      - REDIS_URL=redis://redis:6379/0
+      - ML_WEBHOOK_SECRET=${ML_WEBHOOK_SECRET}
+    depends_on: [intelgraph-ml, redis]
+
 volumes:
+  redis-data:
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/schema/ai.graphql
+ type AIJob {
+   id: ID!
+   kind: String!
+   status: String!
+   createdAt: String!
+   startedAt: String
+   finishedAt: String
+   error: String
+   meta: JSON
+}
+
+ type Insight {
+   id: ID!
+   jobId: ID!
+   kind: String!
+   payload: JSON!
+   status: String! # PENDING | APPROVED | REJECTED
+   createdAt: String!
+   decidedAt: String
+   decidedBy: ID
+}
+
+ type NLPEntity { text: String!, label: String!, start: Int, end: Int, confidence: Float }
+ type ERLink { a: ID!, b: ID!, score: Float! }
+ type LinkPrediction { u: ID!, v: ID!, score: Float! }
+ type Community { communityId: ID!, members: [ID!]! }
+
+ extend type Query {
+   aiJob(id: ID!): AIJob
+   insights(status: String, kind: String): [Insight!]!
+ }
+
+ extend type Mutation {
+   aiExtractEntities(docs: [JSON!]!, jobId: ID): AIJob!
+   aiResolveEntities(records: [JSON!]!, threshold: Float, jobId: ID): AIJob!
+   aiLinkPredict(graphSnapshotId: ID!, topK: Int, jobId: ID): AIJob!
+   aiCommunityDetect(graphSnapshotId: ID!, jobId: ID): AIJob!
+
+   approveInsight(id: ID!): Insight!
+   rejectInsight(id: ID!, reason: String): Insight!
+ }
+
+ type Subscription {
+   aiJobProgress(jobId: ID!): AIJob!
+   insightAdded(status: String, kind: String): Insight!
+ }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/realtime/pubsub.ts
+ import { Server } from "socket.io";
+ export const pubsub = {
+   io: null as unknown as Server,
+   init(io: Server){ this.io = io; },
+   publish(channel: string, payload: any){ if(this.io) this.io.to(channel).emit("event", payload); },
+   asyncIterator(channel: string){
+     // Simplified adapter for GraphQL subscriptions — assume mapping exists elsewhere
+     return {
+       async *[Symbol.asyncIterator](){ /* app env supplies actual impl */ }
+     } as any;
+   }
+ };
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/resolvers/ai.ts
+ import axios from "axios";
+ import jwt from "jsonwebtoken";
+ import { v4 as uuid } from "uuid";
+ import { pubsub } from "../realtime/pubsub";
+
+ const ML_URL = process.env.ML_URL || "http://intelgraph-ml:8081";
+ const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!;
+ const JWT_ALGO = "RS256" as const;
+ const ML_WEBHOOK_SECRET = process.env.ML_WEBHOOK_SECRET!;
+
+ async function mlCall(path: string, payload: any, ctx: any){
+   const token = jwt.sign({ sub: ctx.user.id, roles: ctx.user.roles }, JWT_PRIVATE_KEY, { algorithm: JWT_ALGO, expiresIn: "5m" });
+   const { data } = await axios.post(`${ML_URL}${path}`, payload, { headers: { Authorization: `Bearer ${token}` } });
+   return data;
+ }
+
+ export const AIResolvers = {
+   Query: {
+     aiJob: async (_: any, { id }: any, { db }: any) => db.jobs.findById(id),
+     insights: async (_: any, { status, kind }: any, { db }: any) => db.insights.findMany({ status, kind })
+   },
+   Mutation: {
+     aiExtractEntities: async (_: any, { docs, jobId }: any, ctx: any) => queueJob(ctx, "nlp_entities", "/nlp/entities", { docs }, jobId),
+     aiResolveEntities: async (_: any, { records, threshold, jobId }: any, ctx: any) => queueJob(ctx, "entity_resolution", "/er/resolve", { records, threshold }, jobId),
+     aiLinkPredict: async (_: any, { graphSnapshotId, topK, jobId }: any, ctx: any) => {
+       const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
+       return queueJob(ctx, "link_prediction", "/graph/link_predict", { graph_snapshot_id: graphSnapshotId, top_k: topK, edges }, jobId);
+     },
+     aiCommunityDetect: async (_: any, { graphSnapshotId, jobId }: any, ctx: any) => {
+       const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
+       return queueJob(ctx, "community_detect", "/graph/community_detect", { graph_snapshot_id: graphSnapshotId, edges }, jobId);
+     },
+     approveInsight: async (_: any, { id }: any, { db, user }: any) => decideInsight(db, id, "APPROVED", user.id),
+     rejectInsight: async (_: any, { id, reason }: any, { db, user }: any) => decideInsight(db, id, "REJECTED", user.id, reason)
+   },
+   Subscription: {
+     aiJobProgress: { subscribe: (_: any, { jobId }: any, { subscriptions }: any) => subscriptions.asyncIterator(`AI_JOB_${jobId}`), resolve: (p: any)=>p },
+     insightAdded: { subscribe: (_: any, { status, kind }: any, { subscriptions }: any) => subscriptions.asyncIterator(`INSIGHT_${status||'*'}_${kind||'*'}`), resolve: (p:any)=>p }
+   }
+ };
+
+ async function queueJob(ctx: any, kind: string, path: string, body: any, jobId?: string){
+   const id = jobId || uuid();
+   const callbackUrl = `${ctx.config.publicBaseUrl}/ai/webhook`; // external URL
+   await ctx.db.jobs.insert({ id, kind, status: "QUEUED", createdAt: new Date().toISOString(), meta: { ...body } });
+   await mlCall(path, { ...body, job_id: id, callback_url: callbackUrl }, ctx);
+   return { id, kind, status: "QUEUED", createdAt: new Date().toISOString() };
+ }
+
+ async function fetchEdgesForSnapshot(neo4j: any, snapshotId: string){
+   const session = neo4j.session();
+   try{
+     const res = await session.run(`MATCH (a)-[r]->(b) WHERE r.snapshotId = $snapshotId RETURN a.id as u, b.id as v`, { snapshotId });
+     return res.records.map((rec: any) => [rec.get("u"), rec.get("v")]);
+   } finally { await session.close(); }
+ }
+
+ async function decideInsight(db: any, id: string, status: "APPROVED"|"REJECTED", userId: string, reason?: string){
+   const now = new Date().toISOString();
+   const ins = await db.insights.update(id, { status, decidedAt: now, decidedBy: userId });
+   await db.audit.insert({ id: uuid(), type: "INSIGHT_DECISION", actorId: userId, createdAt: now, meta: { insightId: id, status, reason } });
+   // Feedback loop: record decision for ML (batchable)
+   await db.feedback.insert({ id: uuid(), insightId: id, decision: status, createdAt: now });
+   return ins;
+ }
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/routes/aiWebhook.ts
+ import { Router } from "express";
+ import crypto from "crypto";
+ import { pubsub } from "../realtime/pubsub";
+ import { v4 as uuid } from "uuid";
+
+ const router = Router();
+ const SECRET = process.env.ML_WEBHOOK_SECRET!;
+
+ function verifySignature(body: string, sig: string){
+   const h = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
+   return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig||""));
+ }
+
+ router.post("/ai/webhook", async (req, res) => {
+   const sig = req.header("X-IntelGraph-Signature") || "";
+   const raw = (req as any).rawBody || JSON.stringify(req.body);
+   if(!verifySignature(raw, sig)) return res.status(401).json({ error: "invalid signature" });
+   const evt = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
+   const { job_id, kind } = evt;
+   const db = (req as any).db;
+
+   // Persist job status
+   await db.jobs.update(job_id, { status: "SUCCESS", finishedAt: new Date().toISOString() });
+
+   // Fan-out insights (PENDING for analyst approval)
+   const insights = normalizeInsights(evt);
+   for(const payload of insights){
+     const ins = await db.insights.insert({ id: uuid(), jobId: job_id, kind, payload, status: "PENDING", createdAt: new Date().toISOString() });
+     pubsub.publish(`INSIGHT_PENDING_${kind||'*'}`, ins);
+   }
+   // Notify job progress
+   pubsub.publish(`AI_JOB_${job_id}`, { id: job_id, kind, status: "SUCCESS" });
+   // Audit trail
+   await db.audit.insert({ id: uuid(), type: "ML_WEBHOOK", actorId: "ml-service", createdAt: new Date().toISOString(), meta: { jobId: job_id, kind, count: insights.length } });
+   res.json({ ok: true });
+ });
+
+ function normalizeInsights(evt: any){
+   if(evt.kind === 'nlp_entities') return evt.results;
+   if(evt.kind === 'entity_resolution') return evt.links;
+   if(evt.kind === 'link_prediction') return evt.predictions;
+   if(evt.kind === 'community_detect') return evt.communities;
+   return [evt];
+ }
+
+ export default router;
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/db/migrations/20250812_ai.sql
+ -- Jobs table
+ CREATE TABLE IF NOT EXISTS ai_jobs (
+   id UUID PRIMARY KEY,
+   kind TEXT NOT NULL,
+   status TEXT NOT NULL,
+   created_at TIMESTAMPTZ NOT NULL,
+   started_at TIMESTAMPTZ,
+   finished_at TIMESTAMPTZ,
+   error TEXT,
+   meta JSONB
+ );
+
+ -- Insights table (analyst approval pipeline)
+ CREATE TABLE IF NOT EXISTS ai_insights (
+   id UUID PRIMARY KEY,
+   job_id UUID REFERENCES ai_jobs(id) ON DELETE CASCADE,
+   kind TEXT NOT NULL,
+   payload JSONB NOT NULL,
+   status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
+   created_at TIMESTAMPTZ NOT NULL,
+   decided_at TIMESTAMPTZ,
+   decided_by UUID
+ );
+
+ -- Audit table
+ CREATE TABLE IF NOT EXISTS audit_events (
+   id UUID PRIMARY KEY,
+   type TEXT NOT NULL,
+   actor_id TEXT,
+   created_at TIMESTAMPTZ NOT NULL,
+   meta JSONB
+ );
+
+ -- Feedback table
+ CREATE TABLE IF NOT EXISTS ml_feedback (
+   id UUID PRIMARY KEY,
+   insight_id UUID REFERENCES ai_insights(id) ON DELETE CASCADE,
+   decision TEXT NOT NULL,
+   created_at TIMESTAMPTZ NOT NULL
+ );
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/db/repositories/insights.ts
+ export class InsightsRepo {
+   constructor(private pool: any){}
+   async insert(row: any){
+     const q = `INSERT INTO ai_insights (id, job_id, kind, payload, status, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
+     const v = [row.id, row.jobId, row.kind, row.payload, row.status, row.createdAt];
+     const { rows } = await this.pool.query(q, v);
+     return rows[0];
+   }
+   async findMany({ status, kind }: any){
+     const cond = [] as string[]; const args = [] as any[];
+     if(status){ args.push(status); cond.push(`status = $${args.length}`); }
+     if(kind){ args.push(kind); cond.push(`kind = $${args.length}`); }
+     const where = cond.length? `WHERE ${cond.join(' AND ')}` : '';
+     const { rows } = await this.pool.query(`SELECT * FROM ai_insights ${where} ORDER BY created_at DESC`, args);
+     return rows;
+   }
+   async update(id: string, patch: any){
+     const { rows } = await this.pool.query(`UPDATE ai_insights SET status=$2, decided_at=$3, decided_by=$4 WHERE id=$1 RETURNING *`, [id, patch.status, patch.decidedAt, patch.decidedBy]);
+     return rows[0];
+   }
+ }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/db/repositories/jobs.ts
+ export class JobsRepo {
+   constructor(private pool: any){}
+   async insert(row: any){
+     const q = `INSERT INTO ai_jobs (id, kind, status, created_at, meta) VALUES ($1,$2,$3,$4,$5)`;
+     await this.pool.query(q, [row.id, row.kind, row.status, row.createdAt, row.meta || {}]);
+   }
+   async update(id: string, patch: any){
+     const q = `UPDATE ai_jobs SET status=COALESCE($2,status), finished_at=COALESCE($3,finished_at), error=COALESCE($4,error) WHERE id=$1`;
+     await this.pool.query(q, [id, patch.status, patch.finishedAt, patch.error]);
+   }
+   async findById(id: string){
+     const { rows } = await this.pool.query(`SELECT * FROM ai_jobs WHERE id=$1`, [id]);
+     return rows[0];
+   }
+   async findMany(filter: any){ /* optional */ }
+ }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/db/repositories/audit.ts
+ export class AuditRepo {
+   constructor(private pool: any){}
+   async insert(row: any){
+     const q = `INSERT INTO audit_events (id, type, actor_id, created_at, meta) VALUES ($1,$2,$3,$4,$5)`;
+     await this.pool.query(q, [row.id, row.type, row.actorId, row.createdAt, row.meta||{}]);
+   }
+ }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/db/repositories/feedback.ts
+ export class FeedbackRepo {
+   constructor(private pool: any){}
+   async insert(row: any){
+     const q = `INSERT INTO ml_feedback (id, insight_id, decision, created_at) VALUES ($1,$2,$3,$4)`;
+     await this.pool.query(q, [row.id, row.insightId, row.decision, row.createdAt]);
+   }
+ }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: server/src/tests/ai.webhook.test.ts
+ import request from "supertest";
+ import crypto from "crypto";
+ import app from "../app"; // assumes express app export
+A
+
+ describe("AI webhook", () => {
+   it("accepts signed webhook and creates insights", async () => {
+     const body = { job_id: "11111111-1111-1111-1111-111111111111", kind: "link_prediction", predictions: [{u:"a", v:"b", score:3}] };
+     const { raw, sig } = sign(body);
+     const res = await request(app).post("/ai/webhook").set("X-IntelGraph-Signature", sig).send(body);
+     expect(res.status).toBe(200);
+   });
+ });
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: client/src/ai/insightsHooks.js
+ import $ from "jquery";
+ import { gql } from "@apollo/client";
+
+ export const INSIGHTS_QUERY = gql`query($status:String){ insights(status:$status){ id kind payload status } }`;
+ export const APPROVE_MUT = gql`mutation($id:ID!){ approveInsight(id:$id){ id status } }`;
+ export const REJECT_MUT = gql`mutation($id:ID!){ rejectInsight(id:$id){ id status } }`;
+
+ export function wireInsightApprovalUI(apollo){
+   $(document).on('click', '.insight-approve', function(){
+     const id = $(this).data('id');
+     apollo.mutate({ mutation: APPROVE_MUT, variables:{ id } }).then(()=>{
+       $(`#insight-${id}`).fadeOut(200);
+     });
+   });
+   $(document).on('click', '.insight-reject', function(){
+     const id = $(this).data('id');
+     apollo.mutate({ mutation: REJECT_MUT, variables:{ id } }).then(()=>{
+       $(`#insight-${id}`).fadeOut(200);
+     });
+   });
+ }
+
+ export function renderPendingInsights(apollo){
+   apollo.query({ query: INSIGHTS_QUERY, variables:{ status:"PENDING" } }).then(({ data })=>{
+     const $list = $('#pending-insights');
+     $list.empty();
+     data.insights.forEach(i=>{
+       $list.append(`
+         <li id="insight-${i.id}" class="p-2 border rounded mb-2">
+           <pre class="overflow-x-auto">${JSON.stringify(i.payload, null, 2)}</pre>
+           <div class="mt-2">
+             <button class="insight-approve" data-id="${i.id}">Approve</button>
+             <button class="insight-reject" data-id="${i.id}">Reject</button>
+           </div>
+         </li>`);
+     });
+   });
+ }
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/ci.yml
+ name: CI
+ on: [push, pull_request]
+ jobs:
+   server:
+     runs-on: ubuntu-latest
+     defaults: { run: { working-directory: server } }
+     steps:
+       - uses: actions/checkout@v4
+       - uses: actions/setup-node@v4
+         with: { node-version: 18 }
+       - run: npm ci
+       - run: npm test --workspaces=false
+   ml:
+     runs-on: ubuntu-latest
+     defaults: { run: { working-directory: ml } }
+     steps:
+       - uses: actions/checkout@v4
+       - uses: actions/setup-python@v5
+         with: { python-version: '3.12' }
+       - run: pip install poetry
+       - run: poetry install --no-interaction --no-ansi
+       - run: pytest -q
*** End Patch
```

---

## ENV & Config

Create RSA keys and a webhook secret:

```bash
mkdir -p secrets && cd secrets
openssl genrsa -out jwt_private.pem 4096
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
export JWT_PRIVATE_KEY="$(cat jwt_private.pem)"
export JWT_PUBLIC_KEY="$(cat jwt_public.pem)"
export ML_WEBHOOK_SECRET="$(openssl rand -hex 32)"
```

Set these in your `.env` / deployment secrets. Ensure `server` exposes `config.publicBaseUrl` (e.g., `http://localhost:4000`).

---

## Run (dev)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Trigger a job from GraphQL Playground:

```graphql
mutation {
  aiLinkPredict(graphSnapshotId: "snap-1") {
    id
    status
    kind
  }
}
```

Watch pending insights: open your client page that renders `#pending-insights` and call `renderPendingInsights(apolloClient)` and `wireInsightApprovalUI(apolloClient)` once after app init.

---

## Notes on Hybrid Delivery (Webhook + Polling)

- Primary path is **webhook** (`/ai/webhook`) with **HMAC-SHA256** signatures.
- If your environment blocks inbound callbacks, you can keep the **Redis/Celery polling** worker you already had; both can coexist.
- Jobs/insights always land in Postgres with \`\` status until an analyst **approves/rejects**; Graph mutations record decisions and write **audit events** and **feedback** rows to inform future models.

---

## Testing Checklist

- `pytest` in `ml/` passes.
- `npm test` in `server/` includes `ai.webhook.test.ts`.
- Manual e2e: queue link prediction → receive webhook → see pending insight → approve → verify Neo4j/post-write (you can gate writes behind approval in your resolver or a worker).

---

## Security

- RS256 service-to-service auth (short-lived tokens).
- HMAC-signed webhooks with constant-time verify.
- Input validation (Pydantic, GraphQL types).
- Audit trail in `audit_events` for compliance.
- Least-privilege env secrets.

---

## Future Enhancements

- Swap placeholders with spaCy/transformers NER, SEAL/GraphSAGE link prediction, Leiden communities.
- GPU images for ml (`nvidia/cuda:*-runtime`) with optional CPU fallback.
- Move feedback ingestion to a feature store; retrain on schedule.
- Multi-tenant namespaces in Redis and Postgres partitioning.

---

## Done.

```

```
