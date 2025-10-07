Alright—read your repo and Guy’s velocity plan end-to-end, then crawled the codebase to ground this in what’s actually there (mixed TS/JS, custom tracing, OPA middleware, GraphRAG service in JS, no persisted-ops manifest in client, etc.). Below is a **tight v2 plan** that keeps Guy’s strategy and only changes where it measurably boosts velocity, quality, or safety.

---

# **IntelGraph Velocity Plan — v2 (builds on Guy’s v1)**

## **What stays the same (it’s already right)**

- **Golden Path as the gate** for every change; demo-ready end-to-end with explainable GraphRAG; enforce ABAC; persisted queries; baseline observability.

- **Now → Next → Later** prioritization and the same core workstreams (Backend/API, Workers/AI, Frontend, Security, Observability).

## **What I’m changing (to go faster & safer)**

1. **Golden Path “Red Line”** (hard gate \+ deterministic demo data)

- Add a **seeded, deterministic fixture** used by both server and client E2E; ship it as `seed/demo-v1.json` and load via a `make seed-demo` target.

- Extend the existing **Playwright** setup to script the full “Investigation → Entities → Relationships → Copilot → Results” and assert explainability overlays (edge ids) are rendered. Make this a **required PR status**. (The v1 gate is right—this doubles down and wires seeding for flake-free runs.)

2. **GraphRAG v1.5 (explainable, typed, cacheable)**

- **Unify to TypeScript**: replace `server/src/services/GraphRAGService.js` with `GraphRAGService.ts`, export strict types, and remove the mixed JS/TS in resolvers. (Repo: GraphRAG service is currently JS; resolvers are mixed.)

- Add a **subgraph-hash cache** (Redis) keyed on `(investigationId, anchors, maxHops)` to stabilize latency and LLM costs.

- Enforce **JSON-schema output** for `{answer, confidence, citations.entityIds, why_paths[]}` and reject non-conforming LLM responses (0-retry, T=0).

- Keep the v1 proof shape (`why_paths` \+ citations), but add **“support score”** per path to help UI ordering.

3. **Persisted Queries: “no id, no service” in prod**

- The repo has a `persistedQueries` plugin that’s gated by an env var and lacks a client manifest. Replace with:
  - **Client**: generate `client/persisted-operations.json` in CI (Apollo codegen), checked into the built artifact.

  - **Server**: Express middleware loads the manifest at boot and **injects query text by id**, rejecting any ad-hoc query when `NODE_ENV=production`.

- Make the allowlist **the only path** in prod (no GraphQL Playground, no introspection). (This completes the intent in v1.)

4. **ABAC everywhere (OPA guard as a wrapper)**

- Introduce a single `withAuthAndPolicy(action, resourceFactory)` higher-order resolver and **wrap every query/mutation**.

- Add policy tests that assert **deny-by-default** and log every deny.

- Thread user, tenant, and sensitivity tags through GraphQL context so OPA has the full picture. (This tightens the v1 “resolver guard” into a mandatory wrapper.)

5. **Observability: from custom tracing → OTel-compatible**

- Keep Prometheus metrics, but replace the homegrown tracing with **OpenTelemetry SDK** wrappers in Apollo, Neo4j calls, and BullMQ workers.

- Propagate `traceparent` from the client via Apollo links.

- Ship a minimal **Grafana** dashboard JSON (p95 per resolver, queue latency, slow Cypher). (This deepens the v1 “observability slice”.)

6. **Realtime consistency that won’t bite**

- Start simple: server arbitration \+ idempotent mutations \+ **LWW** per attribute, not CRDT everywhere.

- Add room-scoped backpressure and presence indicators; instrument conflict metrics. (v1 called for CRDT or LWW—this picks the fastest safe path first, keeping CRDT for a later opt-in.)

7. **Embeddings & similarity that actually return in \<100ms**

- Use pgvector **HNSW** for `entity_embeddings` and upsert on entity create/update via BullMQ.

- Add `similarEntities(entityId|text, topK)` and cache by text-embedding. (This refines v1’s “Embeddings Online”.)

8. **Performance: query hygiene \+ client LOD**

- Add explicit Neo4j indexes & hints on hot paths and **profile** the GraphRAG motifs.

- On the client, ship LOD rules to limit edges/nodes at scale and progressively reveal neighborhoods. (Matches v1’s tuning goals, specifies concrete steps.)

---

## **The execution map (2 sprints → demo; 6 weeks → strong pilot)**

### **Sprint 1 (Week 1–2): “Green-bar Golden Path”**

**Goal:** every PR must pass the seeded Golden Path; basic explainable GraphRAG online.

- **GP-01** Golden Path seeding & E2E hard-gate
  - **AC:** `make seed-demo` loads the same dataset for CI & local; Playwright asserts answer text \+ `why_paths` overlay and entity id citations. Gate is **required**.

- **GR-01** Convert GraphRAG service to **TS**; enforce schema’d JSON output
  - **AC:** TS types across service \+ resolver; invalid LLM output \== 400; Redis cache hit path (\<10ms) on repeat queries.

- **PQ-01** Persisted-ops end-to-end
  - **AC:** CI produces `persisted-operations.json`; prod rejects non-allowlisted ops; Playground & introspection disabled.

- **AB-01** Policy wrapper everywhere
  - **AC:** 100% of resolvers wrapped; deny-by-default; policy tests pass for read/write across roles.

### **Sprint 2 (Week 3–4): “Fast, safe, observable”**

**Goal:** On-by-default security \+ traceable ops \+ usable similarity.

- **OT-02** OTel-compatible tracing & Prom histograms
  - **AC:** traces connect GraphQL→Neo4j→BullMQ; Grafana dashboard shows p95 latency per resolver; slow Cypher table.

- **EM-02** Embedding upserts \+ similarity endpoint
  - **AC:** upserts on create/update; HNSW index present; `similarEntities(..., k=10)` p95 \<100ms on demo dataset.

- **RT-02** Realtime LWW & presence
  - **AC:** presence UI; conflict logs; idempotency keys stop dup writes.

### **Weeks 5–6: “Tunable performance, enterprise posture”**

**Goal:** predictable performance envelopes; ops you can trust.

- **PF-03** Neo4j query hygiene & indexes
  - **AC:** add `USING INDEX` where applicable; top 3 queries p95 improved ≥30%.

- **SEC-03** Rate limits \+ token rotation \+ SOPS enforced
  - **AC:** per-role rate limiters; refresh tokens; CI blocks on unencrypted `.env`.

- **OBS-03** RED dashboards & alerting
  - **AC:** error rate, saturation, queue depth alerts with sane thresholds.

---

## **Concrete PRs (branch → AC) — aligned with Guy’s table**

I’m preserving Guy’s IDs where applicable and adding the missing “glue” PRs.

| ID      | Branch                       | What you do                                    | Acceptance criteria                                                                    |
| ------- | ---------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| **E2**  | `ci/golden-path-gate`        | Golden Path seed \+ Playwright required        | Seed loads deterministically; PRs blocked if GP fails; overlay proves `why_paths`.     |
| **A1**  | `feature/graphrag-v1`        | TS GraphRAG service \+ JSON schema \+ cache    | `{answer, why_paths, citations}` typed; cache hit \<10ms; unit+integration tests pass. |
| **A3**  | `security/persisted-queries` | Enforce persisted queries in prod              | Non-allowlisted ops → 403; manifest generated in CI; client uses ids.                  |
| **A2**  | `chore/policy-guard`         | `withAuthAndPolicy` wrapper                    | All resolvers wrapped; deny logs and tests green.                                      |
| **A4**  | `obs/apollo-instrumentation` | Apollo metrics \+ OTel traces                  | Grafana histograms \+ trace linkage API↔worker.                                       |
| **B1**  | `ai/embeddings-upsert`       | BullMQ upsert \+ pgvector HNSW                 | Upserts on entity changes; ANN returns neighbors.                                      |
| **C1**  | `ui/copilot-panel`           | Copilot calls GraphRAG, highlights `why_paths` | Clicking a path focuses edges; NL→answer flow.                                         |
| **RT1** | `realtime/lww-presence`      | LWW policy \+ presence                         | Conflict metrics; idempotent mutations; presence UI.                                   |
| **PF1** | `perf/neo4j-index-hints`     | Add indexes & hints; profile                   | p95 improvement ≥30% across 3 hot queries.                                             |

---

## **Repo-specific callouts found while reading the code**

- **Mixed TS/JS** in `server/src/graphql` and `services/` → prioritize a “resolver wall” where the **outermost layer is TS** (types \+ Zod), then call any legacy JS under the hood until migrated.

- **GraphRAG** is implemented in **JS**; move it to TS alongside a typed `graphragResolvers` export.

- **Persisted-ops** plugin exists but uses an **empty allowlist** gated by env var and the client has **no manifest file**—wire end-to-end or turn it off in dev and hard-on in prod.

- **Tracing** is custom; OTel stubs are present—**replace** to get cross-service correlation.

- **OPA middleware** exists—**standardize** its use via the wrapper so no resolver can bypass checks.

---

## **Definition of Done (per feature)**

- **Tests:** unit \+ integration, and Golden Path E2E must pass.

- **Security:** all GraphQL operations are persisted in prod; **no ad-hoc queries**.

- **Policy:** every resolver is behind ABAC; denies audited.

- **Perf:** p95 budgets: GraphQL resolver \<300ms (non-LLM), GraphRAG end-to-end \<1200ms cached / \<2500ms cold on demo data.

- **Obs:** resolver histograms visible; trace spans link API→Neo4j→worker.

---

## **Risks & mitigations (fastest path)**

- **LLM variability** → JSON-schema enforcement \+ cache \+ retries=0.

- **Realtime races** → start with LWW \+ idempotency, **defer CRDT** until concurrency hotspots warrant it.

- **Security drift** → required persisted queries \+ policy tests in CI; gitleaks/codeql already present in workflows (keep them required).

- **Type debt** → enforce `tsc --noEmit` in CI and migrate the resolver boundary first.

---

## **Why this is the fastest safe route**

It preserves Guy’s backbone (Golden Path, explainable GraphRAG, ABAC, persisted queries, observability), but **makes the guardrails non-optional** and removes the two biggest drag sources: **mixed typing** and **incomplete enforcement**. That yields a demo-tight experience in \~2 sprints and a pilot-ready surface by week 6, without boiling the ocean.

# IntelGraph — Highest‑Impact Velocity Plan (v1)

**Owner:** Guy (IntelGraph Platform Engineer)  
**Repo:** github.com/BrianCLong/summit  
**Focus:** deliver fast, durable wins across core graph CRUD, AI insights (GraphRAG), real‑time collaboration, security, and productionization.

---

## 0\) Executive Summary

IntelGraph already ships a strong foundation: React \+ MUI \+ Cytoscape, GraphQL API on Node/Express \+ Apollo, Neo4j primary graph, Postgres (audit/embeddings), Redis (queues/cache), BullMQ workers, OPA/Rego, k6/Playwright, Docker/Helm/Terraform.

**First swing:** lock the Golden Path (Investigation → Entities → Relationships → Copilot → Results) behind _gated CI_ and add an **explainable GraphRAG** that returns AI insights with path‑of‑proof. While doing that, harden auth (OPA/ABAC), persist GraphQL queries, and add observability (Prometheus \+ OpenTelemetry).

**Outcome:** demo‑ready end‑to‑end with AI “wow” that’s secure, observable, and repeatable.

---

## 1\) Current State Assessment (from repo)

- **Frontend** (client/): React 18 (Vite), MUI v5, Redux Toolkit, Cytoscape (+ layouts), Leaflet, jQuery (available), Apollo Client, socket.io. Multiple App.\*.jsx entry flavors; graph components are rich (context menus, layouts, perf mode). Tests: Jest, Playwright. Persisted queries infra present (persist:queries).

- **Backend** (server/): Apollo Server (GraphQL), Express, WebSockets, BullMQ, Redis, Postgres, Neo4j. GraphQL schema/resolvers for core CRUD \+ AI hooks. config/database.ts provisions constraints/indexes and creates Postgres tables. services/ includes AI/GNN/GraphAnalytics/Embeddings/Reporting/etc. OPA policies in policies/\*.rego. Prometheus metrics and Winston logs present. Migration hooks exist.

- **Data/AI**: pgvector scripts (server/scripts/sql/pgvector.sql), embedding worker, AI orchestration scaffolding, GraphRAG doc, GNN hooks.

- **Ops**: Docker Compose (dev/prod), CI workflows for lint/test/build/security, Helm/Terraform skeletons, smoke tests and k6 perf tests. SOPS present.

**Gaps/Opps**

- Mixed TS/JS in server; resolver layer partially TS, partially JS → type safety holes.

- OPA/ABAC not consistently enforced across resolvers; some queries/mutations trust user blindly.

- Persisted query allowlist present but not enforced by default in API gateway.

- GraphRAG pipeline is documented and scaffolded but not wired as a crisp, explainable endpoint.

- Realtime collab present; needs conflict resolution guards \+ presence/state audits.

- Observability: metrics exist; tracing coverage across GraphQL/resolvers/workers can be deeper.

- CI gates likely allow merges even if the **Golden Path** fails (smoke present; gate might be optional).

---

## 2\) High‑Velocity Priorities (Now → Next → Later)

### NOW (make demo‑ready, secure, explainable)

1. **Golden Path Gate**: a) deterministic seed; b) Playwright E2E that runs the full flow; c) required CI status.

2. **GraphRAG v1 (Explainable)**: subgraph retrieval (k‑hop \+ motif), packing → prompt, result with why_paths \+ citations (entity/rel ids).

3. **OPA/ABAC Enforcement**: resolver guard \+ policy for entity/rel/investigation scope checks.

4. **Persisted Queries Only**: disable ad‑hoc GraphQL in production; generate/ship allowlist.

5. **Observability Slice**: GraphQL plugin metrics \+ traces; worker/job metrics; RED/Saturation dashboards.

### NEXT (multi‑user robustness, speed)

6. **Realtime Consistency**: CRDT/last‑write‑wins policy, optimistic UI with rollback, per‑investigation rooms, backpressure.

7. **Embeddings Index Online**: background embedding upserts on entity changes; ANN similarity endpoint backed by pgvector HNSW.

8. **Performance Tuning**: Neo4j profile on hot queries; additional schema indexes; cache for expand‑neighborhood; LOD server hints for Cytoscape.

9. **Security Hardening**: token rotation \+ refresh, secrets via SOPS/age, rate limits per auth level, audit log coverage.

### LATER (enterprise and moat)

10. **Federated Search** adapters (OSINT/SIEM/OTel) with provenance ledger.

11. **Predictive Graph AI** (GNN \+ temporal models) with model registry and evaluation harness.

12. **War Room** (collab \+ conference metadata sync) and reporting workflows.

---

## 3\) Workstreams & Deliverables

### A) Backend/API

- **A1. GraphRAGService** (src/services/GraphRAGService.ts): retrieval (Cypher), pack facts, call LLM, return {answer, confidence, why_paths, citations}.

- **A2. Resolver Guard**: withAuthAndPolicy(action, resourceFactory)(resolver) wrapper; Zod input validation; OPA check.

- **A3. Persisted Queries**: Apollo APQ \+ server allowlist middleware; disable Playground in prod.

- **A4. Metrics/Tracing**: Apollo plugin for resolver timings; OpenTelemetry exporter; Prometheus counters/histograms.

### B) Workers/AI

- **B1. Embedding Upserter**: BullMQ queue on entity.created|updated; compute embeddings; upsert into entity_embeddings; HNSW ready.

- **B2. Similarity Search Endpoint**: REST/GraphQL field similarEntities(entityId|text, topK).

### C) Frontend (React \+ Cytoscape \+ jQuery for interactions)

- **C1. Copilot Panel**: ask questions in natural language → calls GraphRAG; renders answer and why_paths overlay on graph.

- **C2. Persisted Queries**: run persist:queries in CI and ship manifest; client only uses persisted ids over graphql-ws/HTTP.

- **C3. Realtime UX**: presence indicators, conflict toasts, stale data banners; jQuery‑assisted hit‑target tweaks.

### D) Security & Compliance

- **D1. End‑to‑end ABAC**: role \+ investigation membership \+ sensitivity tags; Rego policies shipped; audit all denies.

- **D2. Secrets posture**: SOPS for .env in CI/CD; no default dev passwords when REQUIRE_REAL_DBS=true.

### E) Observability & Ops

- **E1. Dashboards**: GraphQL p95, queue latency, worker failures, Neo4j slow queries, socket throughput.

- **E2. Golden Path Smoke**: required GitHub status; rollback workflow wired.

---

## 4\) Concrete Tasks (branches, AC)

| ID  | Task                                                         | Branch                     | Acceptance Criteria                                                                                                                           |
| :-- | :----------------------------------------------------------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Implement GraphRAGService.ts \+ resolver \+ tests            | feature/graphrag-v1        | Query returns answer, why_paths (edge ids), citations (entity ids), \<800ms on 10k‑edge dataset for 1‑hop motifs; unit+integration tests pass |
| A2  | Add withAuthAndPolicy wrapper and apply to mutations/queries | chore/policy-guard         | Unauthorized access blocked by Rego; 100% coverage on policy paths; audit logs written                                                        |
| A3  | Enforce persisted queries in prod                            | security/persisted-queries | Non‑allowlisted operations 403 in prod; CI generates manifest; client uses ids                                                                |
| A4  | Apollo metrics plugin \+ OTel traces                         | obs/apollo-instrumentation | Grafana shows resolver histograms; traces link API ↔ worker jobs                                                                             |
| B1  | BullMQ embedding upserter                                    | ai/embeddings-upsert       | On entity change, pgvector row exists; ANN search returns neighbors                                                                           |
| C1  | Copilot UI                                                   | ui/copilot-panel           | NL question → response \+ overlay; clicking path focuses Cytoscape edges                                                                      |
| E2  | Golden Path E2E gate                                         | ci/golden-path-gate        | Playwright test marks PR required status; rollback workflow proven                                                                            |

---

## 5\) Code — Key Snippets

### 5.1 GraphRAGService.ts (backend)

_// server/src/services/GraphRAGService.ts_  
**import** neo4j **from** 'neo4j-driver';  
**import** { getNeo4jDriver, getPostgresPool } **from** '../config/database.js';  
**import** pino **from** 'pino';  
**import** { z } **from** 'zod';

**const** log \= pino({ name: 'GraphRAGService' });

**export type** GraphRAGRequest \= {  
 investigationId: string;  
 question: string;  
 focusEntityIds?: string\[\]; _// optional anchors_  
 maxHops?: number; _// 1..3_  
};

**export type** GraphRAGResponse \= {  
 answer: string;  
 confidence: number; _// 0..1_  
 citations: { entityIds: string\[\] };  
 why_paths: Array\<{ from: string; to: string; relId: string; type: string }\>; _// minimal proof edges_  
};

**const** Input \= z.object({  
 investigationId: z.string().min(1),  
 question: z.string().min(3),  
 focusEntityIds: z.array(z.string()).optional(),  
 maxHops: z.number().int().min(1).max(3).optional(),  
});

**export** **class** GraphRAGService {  
 **async** retrieveSubgraph(req: GraphRAGRequest) {  
 **const** { investigationId, focusEntityIds \= \[\], maxHops \= 2 } \= Input.parse(req);  
 **const** driver \= getNeo4jDriver();  
 **const** session \= driver.session();

    *// Motif retrieval: neighborhood around anchors or top central entities in investigation*
    **const** cypher \= focusEntityIds.length
      ? \`
        MATCH (a:Entity) WHERE a.id IN $ids AND a.investigationId \= $inv
        CALL apoc.path.subgraphAll(a, {maxLevel: $maxHops, relationshipFilter:'RELATIONSHIP\>'}) YIELD nodes, relationships
        WITH nodes, relationships
        RETURN nodes, relationships
      \`
      : \`
        MATCH (e:Entity {investigationId:$inv})
        WITH e ORDER BY e.createdAt DESC LIMIT 20 // seed nodes if no anchors
        CALL apoc.path.subgraphAll(e, {maxLevel: $maxHops, relationshipFilter:'RELATIONSHIP\>'}) YIELD nodes, relationships
        WITH collect(DISTINCT nodes) AS nss, collect(DISTINCT relationships) AS rss
        RETURN apoc.coll.toSet(apoc.coll.flatten(nss)) AS nodes, apoc.coll.toSet(apoc.coll.flatten(rss)) AS relationships
      \`;

    **const** res \= **await** session.run(cypher, { ids: focusEntityIds, inv: investigationId, maxHops });
    **await** session.close();
    **if** (\!res.records.length) **return** { nodes: \[\], rels: \[\] };
    **const** rec \= res.records\[0\];
    **const** nodes \= rec.get('nodes').map((n: any) **\=\>** n.properties);
    **const** rels  \= rec.get('relationships').map((r: any) **\=\>** r.properties);
    **return** { nodes, rels };

}

packFacts(nodes: any\[\], rels: any\[\]) {  
 _// Reduce to compact, explainable tuples_  
 **return** {  
 entities: nodes.map(n **\=\>** ({ id: n.id, type: n.type, label: n.label, props: n.properties || {} })),  
 relations: rels.map(r **\=\>** ({ id: r.id, type: r.type, from: r.fromEntityId, to: r.toEntityId, props: r.properties || {} })),  
 };  
 }

**async** askLLM(question: string, facts: any) {  
 _// Placeholder: call your LLM provider via safe server‑side API._  
 _// Return synthetic structure with why_paths inferred from top‑central edges._  
 _// In prod, include tool‑calling to fetch extra facts and enforce JSON schema output._  
 **const** why \= facts.relations.slice(0, 5).map((r: any) **\=\>** ({ from: r.from, to: r.to, relId: r.id, type: r.type }));  
 **return** { answer: \`Hypothesis: ${question}\`, confidence: 0.72, citations: { entityIds: facts.entities.slice(0,5).map((e:any)**\=\>**e.id) }, why_paths: why };  
 }

**async** answer(req: GraphRAGRequest): Promise\<GraphRAGResponse\> {  
 **const** { question } \= Input.parse(req);  
 **const** { nodes, rels } \= **await** **this**.retrieveSubgraph(req);  
 **const** facts \= **this**.packFacts(nodes, rels);  
 **const** out \= **await** **this**.askLLM(question, facts);  
 log.info({ inv: req.investigationId, nodes: nodes.length, rels: rels.length }, 'GraphRAG answered');  
 **return** out;  
 }  
}

### 5.2 Resolver \+ Policy Guard

_// server/src/graphql/resolvers/aiAnalysis.ts_  
**import** { GraphRAGService } **from** '../../services/GraphRAGService.js';  
**import** { withAuthAndPolicy } **from** '../../middleware/withAuthAndPolicy.js';

**const** rag \= **new** GraphRAGService();

**export** **const** aiAnalysisResolvers \= {  
 Query: {  
 graphRagAnswer: withAuthAndPolicy('read:analysis', (args, ctx) **\=\>** ({  
 type: 'investigation', id: args.investigationId  
 }))(**async** (\_: any, args: any, ctx: any) **\=\>** {  
 **return** rag.answer({  
 investigationId: args.investigationId,  
 question: args.question,  
 focusEntityIds: args.focusEntityIds,  
 maxHops: args.maxHops  
 });  
 })  
 }  
};

_// server/src/middleware/withAuthAndPolicy.ts_  
**import** { evaluate } **from** '../services/PolicyService.js'; _// wraps OPA http or wasm_  
**import** pino **from** 'pino';  
**const** log \= pino({ name: 'policy' });

**export** **const** withAuthAndPolicy \= (action: string, resourceFactory: (args: any, ctx: any) **\=\>** any) **\=\>** (resolver: Function) **\=\>** **async** (parent: any, args: any, ctx: any, info: any) **\=\>** {  
 **if** (\!ctx.user) **throw** **new** Error('Not authenticated');  
 **const** resource \= resourceFactory(args, ctx);  
 **const** allow \= **await** evaluate({ action, user: ctx.user, resource });  
 **if** (\!allow) {  
 log.warn({ user: ctx.user.id, action, resource }, 'policy deny');  
 **throw** **new** Error('Not authorized');  
 }  
 **return** resolver(parent, args, ctx, info);  
};

### 5.3 Persisted Queries (server hard‑enforcement)

_// server/src/middleware/persistedQueries.ts_  
**import** **type** { Request, Response, NextFunction } **from** 'express';  
**import** crypto **from** 'crypto';  
**import** fs **from** 'fs';

**const** manifest \= JSON.parse(fs.readFileSync(process.env.PQ_MANIFEST || 'persisted-queries.json','utf8'));

**export** **function** requirePersistedQueries(req: Request, res: Response, next: NextFunction) {  
 **if** (process.env.NODE_ENV \=== 'production') {  
 **const** body \= req.body || {};  
 _// Accept APQ protocol: body may include queryId or hashed query_  
 **const** id \= body.extensions?.persistedQuery?.sha256Hash || body.id;  
 **if** (\!id || \!manifest\[id\]) **return** res.status(403).json({ error: 'Persisted query required' });  
 req.body.query \= manifest\[id\]; _// inject server‑side_  
 }  
 next();  
}

### 5.4 Embedding Upsert Worker

_// server/src/workers/embeddingUpsert.ts_  
**import** { Worker, Job } **from** 'bullmq';  
**import** { getPostgresPool } **from** '../config/database.js';

**export** **const** startEmbeddingUpserter \= (connection: any) **\=\>** **new** Worker('entity-events', **async** (job: Job) **\=\>** {  
 **const** { entity } \= job.data;  
 _//_ **TODO\***: call embedding model provider*  
 **const** embedding \= **await** computeEmbedding(\`${entity.type} ${entity.label}\`); *// float\[\]\*  
 **const** pool \= getPostgresPool();  
 **await** pool.query(  
 'INSERT INTO entity_embeddings (entity_id, embedding, model) VALUES ($1, $2::vector, $3)\\n' \+  
    'ON CONFLICT (entity\_id) DO UPDATE SET embedding=$2::vector, model=$3, updated\_at=NOW()',  
    \[entity.id, \`\[${embedding.join(',')}\]\`, 'text-embedding-3-small'\]  
 );  
});

### 5.5 Apollo Plugin Metrics

_// server/src/monitoring/apolloPlugin.ts_  
**import** { PluginDefinition } **from** '@apollo/server';  
**import** client **from** 'prom-client';

**const** hist \= **new** client.Histogram({ name: 'graphql_resolver_ms', help: 'Resolver latency', labelNames: \['type','field'\]});

**export** **const** apolloMetricsPlugin \= (): PluginDefinition **\=\>** ({  
 requestDidStart() {  
 **return** {  
 executionDidStart() {  
 **return** {  
 willResolveField({ info }) {  
 **const** end \= hist.startTimer({ type: info.parentType.name, field: info.fieldName });  
 **return** () **\=\>** end();  
 }  
 };  
 }  
 };  
 },  
});

### 5.6 Frontend: Copilot Panel \+ Cytoscape overlay

_// client/src/components/graph/AIInsightsPanel.jsx_  
**import** React **from** 'react';  
**import** { useQuery, gql } **from** '@apollo/client';  
**import** { Box, Paper, Typography, Button } **from** '@mui/material';  
**import** $ **from** 'jquery';

**const** Q \= gql\`query($investigationId: ID\!, $q: String\!) {\\n  graphRagAnswer(investigationId:$investigationId, question:$q){\\n answer confidence citations{entityIds} why_paths{from to relId type}\\n }\\n}\`;

**export** **default** **function** AIInsightsPanel({ cy, investigationId }){  
 **const** \[q, setQ\] \= React.useState('What connects A to B?');  
 **const** \[run, { data, loading }\] \= useQuery(Q, { variables: { investigationId, q }, skip: **true** });

React.useEffect(() **\=\>** {  
 **if** (\!cy || \!data?.graphRagAnswer) **return**;  
 _// jQuery‑assisted hit‑target styling for highlighted edges_  
 **const** ids \= data.graphRagAnswer.why_paths.map(w **\=\>** w.relId);  
 cy.batch(() **\=\>** {  
 cy.elements('edge').removeClass('why');  
 ids.forEach(id **\=\>** cy.$(\`edge\[id \= "${id}"\]\`).addClass('why'));  
 });  
 $(cy.container()).trigger('intelgraph:why_paths_applied', \[ids\]);  
 }, \[cy, data\]);

**return** (  
 \<Paper className\="p-3"\>  
 \<Typography variant\="subtitle2"\>Copilot\</Typography\>  
 **\<textarea** value\={q} onChange\={e**\=\>**setQ(e.target.value)} **/\>**  
 \<Button disabled\={loading} onClick\={()**\=\>**run()}\>Ask\</Button\>  
 {data && \<Box mt\={2}\>\<Typography\>{data.graphRagAnswer.answer}\</Typography\>\</Box\>}  
 \</Paper\>  
 );  
}

---

## 6\) Observability

- **Metrics**: GraphQL resolver hist, worker queue depth, job latency, Neo4j query time, socket.io rooms.

- **Tracing**: API request → resolver → Cypher → BullMQ job; propagate x‑request‑id.

- **Dashboards**: RED (Rate/Errors/Duration), graph ops throughput, embeddings per minute, ANN p95.

---

## 7\) Security Hardening

- **ABAC** via OPA: enforce investigation membership/role/sensitivity; deny‑by‑default.

- **Persisted Queries** in prod; PLAYGROUND=false.

- **Secrets**: SOPS‑encrypted envs; REQUIRE_REAL_DBS=true in prod to block dev defaults.

- **Audit**: log policy denies, admin mutations, AI requests/responses (hash, not raw PII).

---

## 8\) CI/CD gates

- Required checks: lint, typecheck, unit, **Golden Path E2E**, smoke compose up, image scan, OPA tests.

- Preview envs per PR (cd-preview.yml exists) with ephemeral DBs and seeded data.

---

## 9\) Risks & Mitigations

- **Mixed TS/JS** → migrate resolvers/services to TS; enable strict in tsconfig.

- **LLM variability** → JSON schema tool calls, retries with temperature 0, cache answers in Redis keyed by subgraph hash.

- **Realtime race conditions** → server arbitration for conflicting writes \+ idempotent mutations.

---

## 10\) Next Steps (immediate)

1. Create branches listed in §4 and open draft PRs with checklists.

2. Wire apolloMetricsPlugin \+ requirePersistedQueries in app.ts.

3. Implement GraphRAGService \+ resolver and add Playwright **Golden Path** test.

4. Turn on CI required status for Golden Path and smoke compose.

---

## Appendix A — Golden Path Playwright outline

**import** { test, expect } **from** '@playwright/test';

test('golden path', **async** ({ page }) **\=\>** {  
 **await** page.goto('http://localhost:3000');  
 **await** page.getByRole('button', { name: 'New Investigation' }).click();  
 **await** page.getByLabel('Title').fill('Demo Inv');  
 **await** page.getByRole('button', { name: 'Create' }).click();  
 _// Add two entities and a relationship_  
 **await** page.getByRole('button', { name: 'Add Entity' }).click();  
 **await** page.getByLabel('Label').fill('Alice');  
 **await** page.getByRole('button', { name: 'Save' }).click();  
 _// ... repeat for Bob ..._  
 _// Connect Alice → Bob_  
 **await** page.getByRole('button', { name: 'Add Relationship' }).click();  
 _// Run Copilot_  
 **await** page.getByRole('button', { name: 'Ask' }).click();  
 **await** expect(page.getByText('Hypothesis')).toBeVisible();  
});

---

## Appendix B — Neo4j query hygiene

- Use explicit labels \+ USING INDEX hints where applicable.

- Keep relationship type RELATIONSHIP \+ type property (already modeled) to allow polymorphism \+ indexing.

---

**End of Plan (v1)**
