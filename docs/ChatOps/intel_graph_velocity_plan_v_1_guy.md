# IntelGraph — Highest‑Impact Velocity Plan (v1)

**Owner:** Guy (IntelGraph Platform Engineer)\
**Repo:** `github.com/BrianCLong/summit`\
**Focus:** deliver fast, durable wins across core graph CRUD, AI insights (GraphRAG), real‑time collaboration, security, and productionization.

---

## 0) Executive Summary

IntelGraph already ships a strong foundation: React + MUI + Cytoscape, GraphQL API on Node/Express + Apollo, Neo4j primary graph, Postgres (audit/embeddings), Redis (queues/cache), BullMQ workers, OPA/Rego, k6/Playwright, Docker/Helm/Terraform.

**First swing:** lock the Golden Path (Investigation → Entities → Relationships → Copilot → Results) behind _gated CI_ and add an **explainable GraphRAG** that returns AI insights with path‑of‑proof. While doing that, harden auth (OPA/ABAC), persist GraphQL queries, and add observability (Prometheus + OpenTelemetry).

**Outcome:** demo‑ready end‑to‑end with AI “wow” that’s secure, observable, and repeatable.

---

## 1) Current State Assessment (from repo)

- **Frontend** (`client/`): React 18 (Vite), MUI v5, Redux Toolkit, Cytoscape (+ layouts), Leaflet, jQuery (available), Apollo Client, socket.io. Multiple `App.*.jsx` entry flavors; graph components are rich (context menus, layouts, perf mode). Tests: Jest, Playwright. Persisted queries infra present (`persist:queries`).
- **Backend** (`server/`): Apollo Server (GraphQL), Express, WebSockets, BullMQ, Redis, Postgres, Neo4j. GraphQL schema/resolvers for core CRUD + AI hooks. `config/database.ts` provisions constraints/indexes and creates Postgres tables. `services/` includes AI/GNN/GraphAnalytics/Embeddings/Reporting/etc. OPA policies in `policies/*.rego`. Prometheus metrics and Winston logs present. Migration hooks exist.
- **Data/AI**: pgvector scripts (`server/scripts/sql/pgvector.sql`), embedding worker, AI orchestration scaffolding, GraphRAG doc, GNN hooks.
- **Ops**: Docker Compose (dev/prod), CI workflows for lint/test/build/security, Helm/Terraform skeletons, smoke tests and k6 perf tests. SOPS present.

**Gaps/Opps**

- Mixed TS/JS in server; resolver layer partially TS, partially JS → type safety holes.
- OPA/ABAC not consistently enforced across resolvers; some queries/mutations trust `user` blindly.
- Persisted query allowlist present but not enforced by default in API gateway.
- GraphRAG pipeline is documented and scaffolded but not wired as a crisp, explainable endpoint.
- Realtime collab present; needs conflict resolution guards + presence/state audits.
- Observability: metrics exist; tracing coverage across GraphQL/resolvers/workers can be deeper.
- CI gates likely allow merges even if the **Golden Path** fails (smoke present; gate might be optional).

---

## 2) High‑Velocity Priorities (Now → Next → Later)

### NOW (make demo‑ready, secure, explainable)

1. **Golden Path Gate**: a) deterministic seed; b) Playwright E2E that runs the full flow; c) required CI status.
2. **GraphRAG v1 (Explainable)**: subgraph retrieval (k‑hop + motif), packing → prompt, result with `why_paths` + citations (entity/rel ids).
3. **OPA/ABAC Enforcement**: resolver guard + policy for entity/rel/investigation scope checks.
4. **Persisted Queries Only**: disable ad‑hoc GraphQL in production; generate/ship allowlist.
5. **Observability Slice**: GraphQL plugin metrics + traces; worker/job metrics; RED/Saturation dashboards.

### NEXT (multi‑user robustness, speed)

6. **Realtime Consistency**: CRDT/last‑write‑wins policy, optimistic UI with rollback, per‑investigation rooms, backpressure.
7. **Embeddings Index Online**: background embedding upserts on entity changes; ANN similarity endpoint backed by pgvector HNSW.
8. **Performance Tuning**: Neo4j profile on hot queries; additional schema indexes; cache for expand‑neighborhood; LOD server hints for Cytoscape.
9. **Security Hardening**: token rotation + refresh, secrets via SOPS/age, rate limits per auth level, audit log coverage.

### LATER (enterprise and moat)

10. **Federated Search** adapters (OSINT/SIEM/OTel) with provenance ledger.
11. **Predictive Graph AI** (GNN + temporal models) with model registry and evaluation harness.
12. **War Room** (collab + conference metadata sync) and reporting workflows.

---

## 3) Workstreams & Deliverables

### A) Backend/API

- **A1. GraphRAGService** (`src/services/GraphRAGService.ts`): retrieval (Cypher), pack facts, call LLM, return `{answer, confidence, why_paths, citations}`.
- **A2. Resolver Guard**: `withAuthAndPolicy(action, resourceFactory)(resolver)` wrapper; Zod input validation; OPA check.
- **A3. Persisted Queries**: Apollo `APQ` + server allowlist middleware; disable Playground in prod.
- **A4. Metrics/Tracing**: Apollo plugin for resolver timings; OpenTelemetry exporter; Prometheus counters/histograms.

### B) Workers/AI

- **B1. Embedding Upserter**: BullMQ queue on `entity.created|updated`; compute embeddings; upsert into `entity_embeddings`; HNSW ready.
- **B2. Similarity Search Endpoint**: REST/GraphQL field `similarEntities(entityId|text, topK)`.

### C) Frontend (React + Cytoscape + jQuery for interactions)

- **C1. Copilot Panel**: ask questions in natural language → calls GraphRAG; renders answer and `why_paths` overlay on graph.
- **C2. Persisted Queries**: run `persist:queries` in CI and ship manifest; client only uses persisted ids over `graphql-ws`/HTTP.
- **C3. Realtime UX**: presence indicators, conflict toasts, stale data banners; jQuery‑assisted hit‑target tweaks.

### D) Security & Compliance

- **D1. End‑to‑end ABAC**: role + investigation membership + sensitivity tags; Rego policies shipped; audit all denies.
- **D2. Secrets posture**: SOPS for `.env` in CI/CD; no default dev passwords when `REQUIRE_REAL_DBS=true`.

### E) Observability & Ops

- **E1. Dashboards**: GraphQL p95, queue latency, worker failures, Neo4j slow queries, socket throughput.
- **E2. Golden Path Smoke**: required GitHub status; rollback workflow wired.

---

## 4) Concrete Tasks (branches, AC)

| ID  | Task                                                           | Branch                       | Acceptance Criteria                                                                                                                                |
| --- | -------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Implement `GraphRAGService.ts` + resolver + tests              | `feature/graphrag-v1`        | Query returns `answer`, `why_paths` (edge ids), `citations` (entity ids), <800ms on 10k‑edge dataset for 1‑hop motifs; unit+integration tests pass |
| A2  | Add `withAuthAndPolicy` wrapper and apply to mutations/queries | `chore/policy-guard`         | Unauthorized access blocked by Rego; 100% coverage on policy paths; audit logs written                                                             |
| A3  | Enforce persisted queries in prod                              | `security/persisted-queries` | Non‑allowlisted operations 403 in prod; CI generates manifest; client uses ids                                                                     |
| A4  | Apollo metrics plugin + OTel traces                            | `obs/apollo-instrumentation` | Grafana shows resolver histograms; traces link API ↔ worker jobs                                                                                  |
| B1  | BullMQ embedding upserter                                      | `ai/embeddings-upsert`       | On entity change, pgvector row exists; ANN search returns neighbors                                                                                |
| C1  | Copilot UI                                                     | `ui/copilot-panel`           | NL question → response + overlay; clicking path focuses Cytoscape edges                                                                            |
| E2  | Golden Path E2E gate                                           | `ci/golden-path-gate`        | Playwright test marks PR required status; rollback workflow proven                                                                                 |

---

## 5) Code — Key Snippets

### 5.1 `GraphRAGService.ts` (backend)

```ts
// server/src/services/GraphRAGService.ts
import neo4j from 'neo4j-driver';
import { getNeo4jDriver, getPostgresPool } from '../config/database.js';
import pino from 'pino';
import { z } from 'zod';

const log = pino({ name: 'GraphRAGService' });

export type GraphRAGRequest = {
  investigationId: string;
  question: string;
  focusEntityIds?: string[]; // optional anchors
  maxHops?: number; // 1..3
};

export type GraphRAGResponse = {
  answer: string;
  confidence: number; // 0..1
  citations: { entityIds: string[] };
  why_paths: Array<{ from: string; to: string; relId: string; type: string }>; // minimal proof edges
};

const Input = z.object({
  investigationId: z.string().min(1),
  question: z.string().min(3),
  focusEntityIds: z.array(z.string()).optional(),
  maxHops: z.number().int().min(1).max(3).optional(),
});

export class GraphRAGService {
  async retrieveSubgraph(req: GraphRAGRequest) {
    const { investigationId, focusEntityIds = [], maxHops = 2 } = Input.parse(req);
    const driver = getNeo4jDriver();
    const session = driver.session();

    // Motif retrieval: neighborhood around anchors or top central entities in investigation
    const cypher = focusEntityIds.length
      ? `
        MATCH (a:Entity) WHERE a.id IN $ids AND a.investigationId = $inv
        CALL apoc.path.subgraphAll(a, {maxLevel: $maxHops, relationshipFilter:'RELATIONSHIP>'}) YIELD nodes, relationships
        WITH nodes, relationships
        RETURN nodes, relationships
      `
      : `
        MATCH (e:Entity {investigationId:$inv})
        WITH e ORDER BY e.createdAt DESC LIMIT 20 // seed nodes if no anchors
        CALL apoc.path.subgraphAll(e, {maxLevel: $maxHops, relationshipFilter:'RELATIONSHIP>'}) YIELD nodes, relationships
        WITH collect(DISTINCT nodes) AS nss, collect(DISTINCT relationships) AS rss
        RETURN apoc.coll.toSet(apoc.coll.flatten(nss)) AS nodes, apoc.coll.toSet(apoc.coll.flatten(rss)) AS relationships
      `;

    const res = await session.run(cypher, { ids: focusEntityIds, inv: investigationId, maxHops });
    await session.close();
    if (!res.records.length) return { nodes: [], rels: [] };
    const rec = res.records[0];
    const nodes = rec.get('nodes').map((n: any) => n.properties);
    const rels = rec.get('relationships').map((r: any) => r.properties);
    return { nodes, rels };
  }

  packFacts(nodes: any[], rels: any[]) {
    // Reduce to compact, explainable tuples
    return {
      entities: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        props: n.properties || {},
      })),
      relations: rels.map((r) => ({
        id: r.id,
        type: r.type,
        from: r.fromEntityId,
        to: r.toEntityId,
        props: r.properties || {},
      })),
    };
  }

  async askLLM(question: string, facts: any) {
    // Placeholder: call your LLM provider via safe server‑side API.
    // Return synthetic structure with why_paths inferred from top‑central edges.
    // In prod, include tool‑calling to fetch extra facts and enforce JSON schema output.
    const why = facts.relations
      .slice(0, 5)
      .map((r: any) => ({ from: r.from, to: r.to, relId: r.id, type: r.type }));
    return {
      answer: `Hypothesis: ${question}`,
      confidence: 0.72,
      citations: { entityIds: facts.entities.slice(0, 5).map((e: any) => e.id) },
      why_paths: why,
    };
  }

  async answer(req: GraphRAGRequest): Promise<GraphRAGResponse> {
    const { question } = Input.parse(req);
    const { nodes, rels } = await this.retrieveSubgraph(req);
    const facts = this.packFacts(nodes, rels);
    const out = await this.askLLM(question, facts);
    log.info(
      { inv: req.investigationId, nodes: nodes.length, rels: rels.length },
      'GraphRAG answered',
    );
    return out;
  }
}
```

### 5.2 Resolver + Policy Guard

```ts
// server/src/graphql/resolvers/aiAnalysis.ts
import { GraphRAGService } from '../../services/GraphRAGService.js';
import { withAuthAndPolicy } from '../../middleware/withAuthAndPolicy.js';

const rag = new GraphRAGService();

export const aiAnalysisResolvers = {
  Query: {
    graphRagAnswer: withAuthAndPolicy('read:analysis', (args, ctx) => ({
      type: 'investigation',
      id: args.investigationId,
    }))(async (_: any, args: any, ctx: any) => {
      return rag.answer({
        investigationId: args.investigationId,
        question: args.question,
        focusEntityIds: args.focusEntityIds,
        maxHops: args.maxHops,
      });
    }),
  },
};
```

```ts
// server/src/middleware/withAuthAndPolicy.ts
import { evaluate } from '../services/PolicyService.js'; // wraps OPA http or wasm
import pino from 'pino';
const log = pino({ name: 'policy' });

export const withAuthAndPolicy =
  (action: string, resourceFactory: (args: any, ctx: any) => any) =>
  (resolver: Function) =>
  async (parent: any, args: any, ctx: any, info: any) => {
    if (!ctx.user) throw new Error('Not authenticated');
    const resource = resourceFactory(args, ctx);
    const allow = await evaluate({ action, user: ctx.user, resource });
    if (!allow) {
      log.warn({ user: ctx.user.id, action, resource }, 'policy deny');
      throw new Error('Not authorized');
    }
    return resolver(parent, args, ctx, info);
  };
```

### 5.3 Persisted Queries (server hard‑enforcement)

```ts
// server/src/middleware/persistedQueries.ts
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';

const manifest = JSON.parse(
  fs.readFileSync(process.env.PQ_MANIFEST || 'persisted-queries.json', 'utf8'),
);

export function requirePersistedQueries(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    const body = req.body || {};
    // Accept APQ protocol: body may include queryId or hashed query
    const id = body.extensions?.persistedQuery?.sha256Hash || body.id;
    if (!id || !manifest[id]) return res.status(403).json({ error: 'Persisted query required' });
    req.body.query = manifest[id]; // inject server‑side
  }
  next();
}
```

### 5.4 Embedding Upsert Worker

```ts
// server/src/workers/embeddingUpsert.ts
import { Worker, Job } from 'bullmq';
import { getPostgresPool } from '../config/database.js';

export const startEmbeddingUpserter = (connection: any) =>
  new Worker('entity-events', async (job: Job) => {
    const { entity } = job.data;
    // TODO: call embedding model provider
    const embedding = await computeEmbedding(`${entity.type} ${entity.label}`); // float[]
    const pool = getPostgresPool();
    await pool.query(
      'INSERT INTO entity_embeddings (entity_id, embedding, model) VALUES ($1, $2::vector, $3)\n' +
        'ON CONFLICT (entity_id) DO UPDATE SET embedding=$2::vector, model=$3, updated_at=NOW()',
      [entity.id, `[${embedding.join(',')}]`, 'text-embedding-3-small'],
    );
  });
```

### 5.5 Apollo Plugin Metrics

```ts
// server/src/monitoring/apolloPlugin.ts
import { PluginDefinition } from '@apollo/server';
import client from 'prom-client';

const hist = new client.Histogram({
  name: 'graphql_resolver_ms',
  help: 'Resolver latency',
  labelNames: ['type', 'field'],
});

export const apolloMetricsPlugin = (): PluginDefinition => ({
  requestDidStart() {
    return {
      executionDidStart() {
        return {
          willResolveField({ info }) {
            const end = hist.startTimer({ type: info.parentType.name, field: info.fieldName });
            return () => end();
          },
        };
      },
    };
  },
});
```

### 5.6 Frontend: Copilot Panel + Cytoscape overlay

```jsx
// client/src/components/graph/AIInsightsPanel.jsx
import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { Box, Paper, Typography, Button } from '@mui/material';
import $ from 'jquery';

const Q = gql`
  query ($investigationId: ID!, $q: String!) {
    graphRagAnswer(investigationId: $investigationId, question: $q) {
      answer
      confidence
      citations {
        entityIds
      }
      why_paths {
        from
        to
        relId
        type
      }
    }
  }
`;

export default function AIInsightsPanel({ cy, investigationId }) {
  const [q, setQ] = React.useState('What connects A to B?');
  const [run, { data, loading }] = useQuery(Q, { variables: { investigationId, q }, skip: true });

  React.useEffect(() => {
    if (!cy || !data?.graphRagAnswer) return;
    // jQuery‑assisted hit‑target styling for highlighted edges
    const ids = data.graphRagAnswer.why_paths.map((w) => w.relId);
    cy.batch(() => {
      cy.elements('edge').removeClass('why');
      ids.forEach((id) => cy.$(`edge[id = "${id}"]`).addClass('why'));
    });
    $(cy.container()).trigger('intelgraph:why_paths_applied', [ids]);
  }, [cy, data]);

  return (
    <Paper className="p-3">
      <Typography variant="subtitle2">Copilot</Typography>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} />
      <Button disabled={loading} onClick={() => run()}>
        Ask
      </Button>
      {data && (
        <Box mt={2}>
          <Typography>{data.graphRagAnswer.answer}</Typography>
        </Box>
      )}
    </Paper>
  );
}
```

---

## 6) Observability

- **Metrics**: GraphQL resolver hist, worker queue depth, job latency, Neo4j query time, socket.io rooms.
- **Tracing**: API request → resolver → Cypher → BullMQ job; propagate `x‑request‑id`.
- **Dashboards**: RED (Rate/Errors/Duration), graph ops throughput, embeddings per minute, ANN p95.

---

## 7) Security Hardening

- **ABAC** via OPA: enforce investigation membership/role/sensitivity; deny‑by‑default.
- **Persisted Queries** in prod; `PLAYGROUND=false`.
- **Secrets**: SOPS‑encrypted envs; `REQUIRE_REAL_DBS=true` in prod to block dev defaults.
- **Audit**: log policy denies, admin mutations, AI requests/responses (hash, not raw PII).

---

## 8) CI/CD gates

- Required checks: lint, typecheck, unit, **Golden Path E2E**, smoke compose up, image scan, OPA tests.
- Preview envs per PR (`cd-preview.yml` exists) with ephemeral DBs and seeded data.

---

## 9) Risks & Mitigations

- **Mixed TS/JS** → migrate resolvers/services to TS; enable `strict` in `tsconfig`.
- **LLM variability** → JSON schema tool calls, retries with temperature 0, cache answers in Redis keyed by subgraph hash.
- **Realtime race conditions** → server arbitration for conflicting writes + idempotent mutations.

---

## 10) Next Steps (immediate)

1. Create branches listed in §4 and open draft PRs with checklists.
2. Wire `apolloMetricsPlugin` + `requirePersistedQueries` in `app.ts`.
3. Implement `GraphRAGService` + resolver and add Playwright **Golden Path** test.
4. Turn on CI required status for Golden Path and smoke compose.

---

## Appendix A — Golden Path Playwright outline

```ts
import { test, expect } from '@playwright/test';

test('golden path', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.getByRole('button', { name: 'New Investigation' }).click();
  await page.getByLabel('Title').fill('Demo Inv');
  await page.getByRole('button', { name: 'Create' }).click();
  // Add two entities and a relationship
  await page.getByRole('button', { name: 'Add Entity' }).click();
  await page.getByLabel('Label').fill('Alice');
  await page.getByRole('button', { name: 'Save' }).click();
  // ... repeat for Bob ...
  // Connect Alice → Bob
  await page.getByRole('button', { name: 'Add Relationship' }).click();
  // Run Copilot
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Hypothesis')).toBeVisible();
});
```

---

## Appendix B — Neo4j query hygiene

- Use explicit labels + `USING INDEX` hints where applicable.
- Keep relationship type `RELATIONSHIP` + `type` property (already modeled) to allow polymorphism + indexing.

---

**End of Plan (v1)**
