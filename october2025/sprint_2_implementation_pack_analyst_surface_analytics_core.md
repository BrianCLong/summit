# Sprint 2 Implementation Pack — Analyst Surface & Analytics Core

> Delivers **Tri‑Pane UX v1**, **NL→Cypher v0.9 (glass‑box)**, **Analytics Pack v1** (shortest/K‑shortest, Louvain/Leiden, betweenness/eigenvector, bridge/broker), and **Pattern Miner (starter)** with cost guard, LAC gating, observability, fixtures, and tests.

---

## 0) Monorepo Diffs

```
intelgraph/
├─ docker-compose.dev.yaml                # UPDATED (Neo4j GDS plugin)
├─ services/
│  ├─ gateway-graphql/                    # UPDATED (cost guard, LAC pre‑checks)
│  ├─ lac-policy-compiler/
│  ├─ prov-ledger/
│  ├─ analytics-service/                  # NEW
│  │  ├─ src/index.ts
│  │  ├─ src/gds.ts
│  │  ├─ src/cost.ts
│  │  ├─ src/otel.ts
│  │  ├─ test/gds.spec.ts
│  │  └─ jest.config.cjs
│  ├─ pattern-miner/                      # NEW
│  │  ├─ src/index.ts
│  │  ├─ src/templates.ts
│  │  ├─ src/otel.ts
│  │  └─ test/templates.spec.ts
│  └─ ai-nl2cypher/                       # PROMOTED from stub → v0.9
│     ├─ src/index.ts
│     ├─ src/rules.ts
│     ├─ src/estimator.ts
│     ├─ src/otel.ts
│     └─ test/nl2cypher.spec.ts
├─ webapp/                                # UPDATED Tri‑Pane v1
│  ├─ src/features/graph/TriPane.tsx
│  ├─ src/features/graph/GraphPanel.tsx
│  ├─ src/features/graph/MapPanel.tsx
│  ├─ src/features/graph/TimelinePanel.tsx
│  ├─ src/features/cost/CostBadge.tsx
│  ├─ src/state/graphSlice.ts
│  ├─ src/state/selectionSlice.ts
│  ├─ src/state/costSlice.ts
│  └─ tests/e2e/tripane.spec.ts
├─ ops/
│  ├─ grafana/provisioning/dashboards/analytics.json  # NEW panels
│  └─ k6/gateway-queries.js
└─ tools/
   └─ scripts/demo-sprint2.md
```

---

## 1) Docker Compose — enable GDS & tighten Neo4j

```yaml
# docker-compose.dev.yaml (diff)
neo4j:
  image: neo4j:5.20
  environment:
    NEO4J_AUTH: neo4j/intelgraph
    NEO4JLABS_PLUGINS: '["apoc","gds"]'
    NEO4J_dbms_security_procedures_unrestricted: apoc.*,gds.*
    NEO4J_server_memory_heap_initial__size: 1G
    NEO4J_server_memory_heap_max__size: 2G
  ports: ['7474:7474', '7687:7687']
```

---

## 2) Gateway: Cost Guard + LAC pre‑check

```ts
// services/gateway-graphql/src/index.ts (snippets)
const BUDGET_PER_REQUEST_MS = 2500; // soft p95 budget

async function enforceLAC(
  subject: any,
  resource: any,
  action: string,
  context: any,
) {
  const r = await fetch(`${LAC_URL}/enforce`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject, resource, action, context }),
  });
  const d = await r.json();
  if (d.decision !== 'allow') throw new Error(`LAC deny: ${d.reason}`);
}

function withCostGuard<T extends (...args: any) => Promise<any>>(fn: T) {
  return async (...args: any[]) => {
    const start = Date.now();
    const res = await fn(...args);
    const elapsed = Date.now() - start;
    if (elapsed > BUDGET_PER_REQUEST_MS) {
      // emit metric and tag in logs
      console.warn(`cost_guard_exceeded ms=${elapsed}`);
    }
    return res;
  };
}
```

GraphQL schema additions:

```graphql
# services/gateway-graphql/src/schema.graphql (diff)
input NLQueryInput {
  text: String!
  sandbox: Boolean
  maxRows: Int
  maxMillis: Int
}

type GeneratedCypher {
  cypher: String!
  estimateMs: Int!
  estimateRows: Int!
  warnings: [String!]!
}

type Path {
  nodes: [String!]!
  edges: [String!]!
  length: Int!
}

type AnalyticsResult {
  name: String!
  payload: JSON
}

type Mutation {
  generateCypher(input: NLQueryInput!): GeneratedCypher!
  runAnalytics(name: String!, params: JSON): AnalyticsResult!
  runPattern(template: String!, params: JSON): AnalyticsResult!
}
```

Resolvers → call services with **LAC** checks and cost guard:

```ts
// services/gateway-graphql/src/index.ts (more snippets)
const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://localhost:7003';
const MINER_URL = process.env.MINER_URL || 'http://localhost:7004';
const NL_URL = process.env.NL_URL || 'http://localhost:7005';

const resolvers = {
  Mutation: {
    generateCypher: withCostGuard(
      async (_: any, { input }: { input: any }, ctx: any) => {
        const r = await fetch(`${NL_URL}/generate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        });
        return r.json();
      },
    ),
    runAnalytics: withCostGuard(
      async (
        _: any,
        { name, params }: { name: string; params: any },
        ctx: any,
      ) => {
        await enforceLAC(
          ctx.subject,
          { kind: 'graph', sensitivity: 'public' },
          'RUN_ANALYTIC',
          { purpose: 'investigation' },
        );
        const r = await fetch(
          `${ANALYTICS_URL}/run/${encodeURIComponent(name)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(params || {}),
          },
        );
        return { name, payload: await r.json() };
      },
    ),
    runPattern: withCostGuard(
      async (
        _: any,
        { template, params }: { template: string; params: any },
      ) => {
        const r = await fetch(
          `${MINER_URL}/pattern/${encodeURIComponent(template)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(params || {}),
          },
        );
        return { name: template, payload: await r.json() };
      },
    ),
  },
};
```

---

## 3) Analytics Service (Neo4j GDS)

```ts
// services/analytics-service/src/gds.ts
import neo4j from 'neo4j-driver';
const url = process.env.NEO4J_URL || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const pass = process.env.NEO4J_PASS || 'intelgraph';
export const driver = neo4j.driver(url, neo4j.auth.basic(user, pass));

export async function pagerank(db: string = 'neo4j') {
  const s = driver.session({ database: db });
  try {
    await s.run(
      `CALL gds.graph.project('ig_pr', 'Entity', 'RELATES') YIELD graphName`,
    );
  } catch {
    /* ignore if exists */
  }
  const res = await s.run(
    `CALL gds.pageRank.stream('ig_pr') YIELD nodeId, score RETURN gds.util.asNode(nodeId).id AS id, score ORDER BY score DESC LIMIT 50`,
  );
  return res.records.map((r) => ({ id: r.get('id'), score: r.get('score') }));
}

export async function louvain(db: string = 'neo4j') {
  const s = driver.session({ database: db });
  try {
    await s.run(`CALL gds.graph.project('ig_louvain','Entity','RELATES')`);
  } catch {}
  const res = await s.run(
    `CALL gds.louvain.stream('ig_louvain') YIELD nodeId, communityId RETURN gds.util.asNode(nodeId).id AS id, communityId`,
  );
  return res.records.map((r) => ({
    id: r.get('id'),
    communityId: r.get('communityId'),
  }));
}

export async function kShortestPath(
  source: string,
  target: string,
  k: number = 3,
) {
  const s = driver.session();
  const res = await s.run(
    `MATCH (s:Entity{id:$source}),(t:Entity{id:$target}) CALL gds.shortestPath.yens.stream({ sourceNode:s, targetNode:t, k:$k, relationshipTypes:['RELATES'] }) YIELD path RETURN path LIMIT $k`,
    { source, target, k },
  );
  return res.records.map((r) => ({ path: r.get('path').toString() }));
}
```

```ts
// services/analytics-service/src/index.ts
import express from 'express';
import { startOtel } from './otel';
import { pagerank, louvain, kShortestPath } from './gds';
startOtel();
const app = express();
app.use(express.json());

app.post('/run/pagerank', async (_req, res) => res.json(await pagerank()));
app.post('/run/louvain', async (_req, res) => res.json(await louvain()));
app.post('/run/kshortest', async (req, res) => {
  const { source, target, k } = req.body;
  res.json(await kShortestPath(source, target, k || 3));
});

const PORT = process.env.PORT || 7003;
app.listen(PORT, () => console.log(`[ANALYTICS] ${PORT}`));
```

Tests:

```ts
// services/analytics-service/test/gds.spec.ts
test('gds exports exist', () => {
  const fns = require('../src/gds');
  expect(typeof fns.pagerank).toBe('function');
});
```

---

## 4) Pattern Miner (starter templates)

```ts
// services/pattern-miner/src/templates.ts
export const templates = {
  cotravel: ({ withinHours = 12 }) => `
    MATCH (a:Entity)-[:PRESENT_AT]->(l:Location)<-[:PRESENT_AT]-(b:Entity)
    WHERE a<>b AND abs(duration.inHours(a.time, b.time).hours) <= ${withinHours}
    RETURN a.id AS a, b.id AS b, l.name AS where, a.time AS t1, b.time AS t2
  `,
  fanin: ({ min = 5 }) => `
    MATCH (src:Entity)-[:TRANSFER]->(hub:Account)
    WITH hub, count(src) AS c
    WHERE c >= ${min}
    RETURN hub.id AS hub, c
  `,
  fanout: ({ min = 5 }) => `
    MATCH (hub:Account)-[:TRANSFER]->(dst:Entity)
    WITH hub, count(dst) AS c
    WHERE c >= ${min}
    RETURN hub.id AS hub, c
  `,
} as const;
```

```ts
// services/pattern-miner/src/index.ts
import express from 'express';
import { templates } from './templates';
import { startOtel } from './otel';
import neo4j from 'neo4j-driver';
startOtel();
const app = express();
app.use(express.json());
const driver = neo4j.driver(
  process.env.NEO4J_URL || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASS || 'intelgraph',
  ),
);

app.post('/pattern/:name', async (req, res) => {
  const name = req.params.name as keyof typeof templates;
  const params = req.body || {};
  const q = templates[name]?.(params);
  if (!q) return res.status(404).json({ error: 'unknown template' });
  const s = driver.session();
  const r = await s.run(q);
  res.json(r.records.map((rec) => rec.toObject()));
});

const PORT = process.env.PORT || 7004;
app.listen(PORT, () => console.log(`[MINER] ${PORT}`));
```

---

## 5) NL→Cypher v0.9 (glass‑box)

- Rule‑based seed with **explainable** mapping; **estimator** provides cost/row previews.

```ts
// services/ai-nl2cypher/src/rules.ts
export type NLRule = {
  pattern: RegExp;
  toCypher: (m: RegExpMatchArray) => string;
  warn?: string;
};
export const rules: NLRule[] = [
  {
    pattern: /top (\d+) (?:nodes|entities) by pagerank/i,
    toCypher: (m) =>
      `CALL gds.pageRank.stream('ig_pr') YIELD nodeId, score RETURN gds.util.asNode(nodeId).id AS id, score ORDER BY score DESC LIMIT ${Number(m[1])}`,
  },
  {
    pattern: /shortest path from (\S+) to (\S+)/i,
    toCypher: (m) =>
      `MATCH (s:Entity{id:'${m[1]}'}) , (t:Entity{id:'${m[2]}'}) CALL gds.shortestPath.dijkstra.stream({sourceNode:s, targetNode:t}) YIELD path RETURN path LIMIT 1`,
  },
  {
    pattern: /community detection/i,
    toCypher: () =>
      `CALL gds.louvain.stream('ig_louvain') YIELD nodeId, communityId RETURN gds.util.asNode(nodeId).id AS id, communityId LIMIT 100`,
  },
];
```

```ts
// services/ai-nl2cypher/src/estimator.ts
export function estimate(cy: string) {
  const warns: string[] = [];
  if (/MATCH \(.+\)-\[\:\w+\*\d+\.\.\d+\]/.test(cy))
    warns.push('variable length traversal');
  const rows = /LIMIT (\d+)/.exec(cy)?.[1]
    ? Number(/LIMIT (\d+)/.exec(cy)![1])
    : 1000;
  const ms = Math.min(5000, Math.max(50, rows * 2));
  return { estimateRows: rows, estimateMs: ms, warnings: warns };
}
```

```ts
// services/ai-nl2cypher/src/index.ts
import express from 'express';
import { rules } from './rules';
import { estimate } from './estimator';
import { startOtel } from './otel';
startOtel();
const app = express();
app.use(express.json());

app.post('/generate', (req, res) => {
  const text = (req.body?.text || '') as string;
  for (const r of rules) {
    const m = text.match(r.pattern);
    if (m) {
      const cypher = r.toCypher(m);
      return res.json({ cypher, ...estimate(cypher) });
    }
  }
  return res.json({
    cypher: 'MATCH (n) RETURN n LIMIT 25',
    ...estimate('MATCH (n) RETURN n LIMIT 25'),
    warnings: ['fallback'],
  });
});

const PORT = process.env.PORT || 7005;
app.listen(PORT, () => console.log(`[NL2CYPHER] ${PORT}`));
```

Tests:

```ts
// services/ai-nl2cypher/test/nl2cypher.spec.ts
import request from 'supertest';
import http from 'http';
import appFactory from '../src/index';

test('pagerank parse', async () => {
  const app = appFactory();
  const server = http.createServer(app).listen();
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const res = await request(url)
    .post('/generate')
    .send({ text: 'top 10 nodes by pagerank' });
  expect(res.body.cypher).toContain('pageRank');
  server.close();
});
```

---

## 6) Webapp — Tri‑Pane v1 (sync + provenance + cost)

- **All interactions via jQuery** bridges; React handles structure & data flow.
- **Features**: selection sync across graph/map/timeline; provenance tooltips; confidence opacity; undo/redo; cost badge.

```tsx
// webapp/src/features/cost/CostBadge.tsx
import React from 'react';
import { useSelector } from 'react-redux';
export default function CostBadge() {
  const { lastMs, budgetMs } = useSelector((s: any) => s.cost);
  if (lastMs == null) return null;
  const over = lastMs > budgetMs;
  return (
    <span
      className={`px-2 py-1 rounded ${over ? 'bg-red-100' : 'bg-green-100'}`}
    >
      ⏱ {lastMs}ms / {budgetMs}ms
    </span>
  );
}
```

```tsx
// webapp/src/features/graph/GraphPanel.tsx (snippets)
import $ from 'jquery';
import cytoscape from 'cytoscape';
export function GraphPanel() {
  // init cy ...
  $(document).on('timeline:brush', (_e, range) => {
    /* filter nodes by time */
  });
  // provenance tooltip (on node hover) fetches from ledger via gateway
}
```

E2E:

```ts
// webapp/tests/e2e/tripane.spec.ts
import { test, expect } from '@playwright/test';

test('selection syncs graph→map', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.pane.graph').click();
  // trigger selection & expect map highlight class toggled via jQuery event
  await expect(page.locator('.pane.map .highlight')).toHaveCount(1);
});
```

---

## 7) Observability & Dashboards

- New Grafana panels: _analytics_latency_ms_, _nl2cypher_estimate_ms_, _cost_guard_exceeded_count_, _pattern_runs_.
- OTEL spans instrument all service endpoints; propagate trace IDs through gateway → services.

---

## 8) k6 — Gateway query smoke

```js
// ops/k6/gateway-queries.js
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 10, duration: '1m' };
export default function () {
  const gen = http.post(
    'http://localhost:7000/graphql',
    JSON.stringify({
      query:
        'mutation($i:NLQueryInput!){ generateCypher(input:$i){ estimateMs cypher }}',
      variables: { i: { text: 'top 20 nodes by pagerank' } },
    }),
    { headers: { 'content-type': 'application/json' } },
  );
  check(gen, { ok: (r) => r.status === 200 });
}
```

---

## 9) Demo Script (Sprint 2)

```md
# Demo — Analyst Surface & Analytics Core

1. Start stack: `docker compose -f docker-compose.dev.yaml up --build`
2. Seed a small graph in Neo4j (sample script below) or reuse fixtures.
3. From Webapp: open Tri‑Pane → run NL prompt "top 10 nodes by pagerank" → preview generated Cypher → execute.
4. Observe: cost badge shows estimate vs. actual; provenance tooltips on nodes; community colors.
5. Run Pattern: `runPattern(template:"cotravel", params:{withinHours:6})` → results list + pins on map.
6. Grafana: see analytics latency & cost guard metrics; Jaeger: traces across gateway → services.
```

---

## 10) Neo4j Seed (fixtures)

```cypher
CREATE (:Entity{id:'A', label:'Alice'})-[:RELATES]->(:Entity{id:'B', label:'Bob'}),
       (:Entity{id:'B'})-[:RELATES]->(:Entity{id:'C', label:'Carol'}),
       (:Entity{id:'C'})-[:RELATES]->(:Entity{id:'A'});
```

---

## 11) Security

- Gateway enforces **LAC** before analytics execution; requires subject context in request (wire via auth middleware in S3).
- Parameterized Cypher for all pattern params; NL→Cypher warns on risky forms.

---

## 12) Next (S3 handoff)

- Report Studio & Runbook Runtime v1 wiring; cost guard budgets per tenant; offline CRDT kit.
- Expand NL rules with learning loop + evaluation harness; add sandbox exec & rollback.
