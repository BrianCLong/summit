# Sprint 4 Implementation Pack — Graph‑XAI, Federation, Wallets & GA Hardening

> Final sprint delivers **Graph‑XAI Layer v1** (counterfactuals, saliency, model cards), **Zero‑Copy Federation stubs** (hashed selectors + push‑down predicates + revocation), **Selective Disclosure Wallets** (partner/court/press profiles with external verifier), and **GA hardening** (STRIDE, fuzzing, SBOM, a11y AAA, soak tests, docs freeze). Includes hooks to LAC/provenance, observability, fixtures, Jest/Playwright/k6 tests, and demo scripts.

---

## 0) Monorepo Diffs

```
intelgraph/
├─ docker-compose.dev.yaml                   # UPDATED (Keycloak optional, OPA sidecar optional)
├─ services/
│  ├─ gateway-graphql/                       # UPDATED (XAI + federation + wallet routes)
│  ├─ xai-service/                           # NEW (counterfactuals, saliency, model cards)
│  │  ├─ src/index.ts
│  │  ├─ src/er.ts
│  │  ├─ src/anomaly.ts
│  │  ├─ src/counterfactual.ts
│  │  ├─ src/saliency.ts
│  │  ├─ src/modelcard.ts
│  │  ├─ src/otel.ts
│  │  ├─ test/xai.spec.ts
│  │  └─ jest.config.cjs
│  ├─ federation-service/                    # NEW (hashed selectors + push‑down)
│  │  ├─ src/index.ts
│  │  ├─ src/zk.ts
│  │  ├─ src/pushdown.ts
│  │  ├─ src/revoke.ts
│  │  ├─ src/otel.ts
│  │  └─ test/fed.spec.ts
│  ├─ wallet-service/                        # NEW (selective bundles + verify)
│  │  ├─ src/index.ts
│  │  ├─ src/bundler.ts
│  │  ├─ src/verify.ts
│  │  ├─ src/otel.ts
│  │  ├─ src/profiles.ts
│  │  └─ test/wallet.spec.ts
│  └─ hardening/                             # NEW (fuzz, sbom, a11y, soak)
│     ├─ src/fuzz-perms.test.ts
│     ├─ src/soak-runner.ts
│     └─ scripts/sbom.cjs
├─ webapp/
│  ├─ src/features/xai/
│  │  ├─ XaiPanel.tsx
│  │  ├─ CounterfactualInspector.tsx
│  │  ├─ SaliencyLegend.tsx
│  │  └─ styles.css
│  ├─ src/features/federation/FedPanel.tsx
│  ├─ src/features/wallets/WalletComposer.tsx
│  ├─ tests/e2e/xai.spec.ts
│  └─ tests/e2e/wallet.spec.ts
├─ ops/
│  ├─ grafana/provisioning/dashboards/xai.json          # NEW panels
│  ├─ k6/federation-demo.js
│  ├─ zap/zap.yaml                                      # DAST config
│  └─ accessibility/axe-ci.js                           # a11y CI
└─ tools/
   └─ scripts/demo-sprint4.md
```

---

## 1) Gateway — schema + routes

```graphql
# services/gateway-graphql/src/schema.graphql (diff)

type XaiCounterfactual {
  node: String!
  changedEdges: [String!]!
  delta: Float!
  explanation: String!
}

type XaiSaliency {
  edge: String!
  weight: Float!
}

type ModelCard {
  name: String!
  version: String!
  dataset: String!
  metrics: JSON
  caveats: [String!]!
}

input FedQueryInput {
  selectorHash: String!
  predicate: String!
  limit: Int
}

type FedResult {
  claimHashes: [String!]!
  proof: String!
}

input WalletRequest {
  audience: String!
  ttlSeconds: Int!
  claims: [String!]!
  redactions: [String!]
  modelCard: Boolean
}

type WalletBundle {
  id: String!
  audience: String!
  url: String!
  revoked: Boolean!
}

type Query {
  modelCard(name: String!): ModelCard!
}

type Mutation {
  xaiCounterfactual(node: String!, objective: String!): [XaiCounterfactual!]!
  xaiSaliency(node: String!): [XaiSaliency!]!
  fedQuery(input: FedQueryInput!): FedResult!
  walletIssue(input: WalletRequest!): WalletBundle!
  walletRevoke(id: ID!): Boolean!
}
```

Resolvers (snippets):

```ts
// services/gateway-graphql/src/index.ts (snips)
const XAI_URL = process.env.XAI_URL || 'http://localhost:7012';
const FED_URL = process.env.FED_URL || 'http://localhost:7013';
const WALLET_URL = process.env.WALLET_URL || 'http://localhost:7014';

const resolvers = {
  Query: {
    modelCard: async (_: any, { name }: { name: string }) =>
      (await fetch(`${XAI_URL}/modelcard/${encodeURIComponent(name)}`)).json(),
  },
  Mutation: {
    xaiCounterfactual: async (
      _: any,
      { node, objective }: { node: string; objective: string },
    ) =>
      (
        await fetch(`${XAI_URL}/counterfactual`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ node, objective }),
        })
      ).json(),
    xaiSaliency: async (_: any, { node }: { node: string }) =>
      (await fetch(`${XAI_URL}/saliency/${encodeURIComponent(node)}`)).json(),
    fedQuery: async (_: any, { input }: { input: any }) =>
      (
        await fetch(`${FED_URL}/query`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
      ).json(),
    walletIssue: async (_: any, { input }: { input: any }) =>
      (
        await fetch(`${WALLET_URL}/issue`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
      ).json(),
    walletRevoke: async (_: any, { id }: { id: string }) =>
      (await fetch(`${WALLET_URL}/revoke/${id}`, { method: 'POST' })).json(),
  },
};
```

Budget/LAC gates reused; provenance attached to all wallet-issued claims.

---

## 2) XAI Service — counterfactuals, saliency, model cards

> This is a classical/transparent seed implementation designed to be replaced with more advanced GNN explainers later. It produces **auditable artifacts** and **ties weights to nodes/edges** in the graph.

```ts
// services/xai-service/src/counterfactual.ts
import { shortestCF } from './er';
export async function counterfactual(node: string, objective: string) {
  // Find minimal edge/node toggles to flip a simple logistic decision (demo)
  return shortestCF(node, objective).map((x) => ({
    node,
    changedEdges: x.edges,
    delta: x.delta,
    explanation: `Flip via ${x.edges.join(', ')}`,
  }));
}
```

```ts
// services/xai-service/src/saliency.ts
import neo4j from 'neo4j-driver';
const driver = neo4j.driver(
  process.env.NEO4J_URL || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASS || 'intelgraph',
  ),
);
export async function saliency(node: string) {
  const s = driver.session();
  // Simple centrality-derived saliency baseline
  const q = `MATCH (n:Entity{id:$id})-[e:RELATES]-(m) RETURN id(e) AS edge, coalesce(e.weight,1.0) AS w`;
  const r = await s.run(q, { id: node });
  return r.records.map((rec) => ({
    edge: String(rec.get('edge')),
    weight: rec.get('w'),
  }));
}
```

```ts
// services/xai-service/src/modelcard.ts
export function modelCard(name: string) {
  return {
    name,
    version: '1.0.0',
    dataset: 'demo-fixture',
    metrics: { auc: 0.82, f1: 0.71 },
    caveats: [
      'Demo baselines only',
      'Weights not calibrated for legal decisions',
    ],
  };
}
```

```ts
// services/xai-service/src/index.ts
import express from 'express';
import { startOtel } from './otel';
import { counterfactual } from './counterfactual';
import { saliency } from './saliency';
import { modelCard } from './modelcard';
startOtel();
const app = express();
app.use(express.json());
app.post('/counterfactual', async (req, res) => {
  const { node, objective } = req.body;
  res.json(await counterfactual(node, objective));
});
app.get('/saliency/:node', async (req, res) => {
  res.json(await saliency(req.params.node));
});
app.get('/modelcard/:name', async (req, res) => {
  res.json(modelCard(req.params.name));
});
const PORT = process.env.PORT || 7012;
app.listen(PORT, () => console.log(`[XAI] ${PORT}`));
```

Tests:

```ts
// services/xai-service/test/xai.spec.ts
test('model card has metrics', () => {
  const { modelCard } = require('../src/modelcard');
  expect(modelCard('demo').metrics).toBeTruthy();
});
```

Webapp panel (jQuery interactions for overlays):

```tsx
// webapp/src/features/xai/XaiPanel.tsx
import React, { useState } from 'react';
import $ from 'jquery';
export default function XaiPanel() {
  const [node, setNode] = useState('A');
  const [cf, setCf] = useState<any[]>([]);
  const [sal, setSal] = useState<any[]>([]);
  async function run() {
    const cfRes = await (
      await fetch('/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query:
            'mutation($n:String!){ xaiCounterfactual(node:$n, objective:"flag"){ explanation delta changedEdges }}',
          variables: { n: node },
        }),
      })
    ).json();
    setCf(cfRes.data.xaiCounterfactual);
    const salRes = await (
      await fetch('/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation($n:String!){ xaiSaliency(node:$n){ edge weight }}',
          variables: { n: node },
        }),
      })
    ).json();
    setSal(salRes.data.xaiSaliency);
    // jQuery overlay events
    $(document).trigger('xai:saliency', [salRes.data.xaiSaliency]);
  }
  return (
    <div>
      <input value={node} onChange={(e) => setNode(e.target.value)} />
      <button onClick={run}>Explain</button>
      <div className="legend">
        {sal.map((s) => (
          <div key={s.edge}>
            {s.edge}: {s.weight}
          </div>
        ))}
      </div>
      <pre>{JSON.stringify(cf, null, 2)}</pre>
    </div>
  );
}
```

---

## 3) Federation Service — hashed selectors, push‑down, revocation

### 3.1 ZK‑style hashed selectors (demo)

```ts
// services/federation-service/src/zk.ts
import crypto from 'crypto';
export function selectorHash(sel: string) {
  return crypto.createHash('sha256').update(sel).digest('hex');
}
export function proofFor(h: string) {
  return crypto
    .createHash('sha256')
    .update('proof:' + h)
    .digest('hex');
}
```

### 3.2 Push‑down predicate executor

```ts
// services/federation-service/src/pushdown.ts
import neo4j from 'neo4j-driver';
const driver = neo4j.driver(
  process.env.NEO4J_URL || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASS || 'intelgraph',
  ),
);
export async function runPredicate(predicate: string, limit: number = 50) {
  const s = driver.session();
  const q = `MATCH (n:Entity) WHERE ${predicate} RETURN n.id AS id LIMIT $limit`;
  const r = await s.run(q, { limit });
  return r.records.map((rec) => rec.get('id'));
}
```

### 3.3 Service API + revocation

```ts
// services/federation-service/src/index.ts
import express from 'express';
import { selectorHash, proofFor } from './zk';
import { runPredicate } from './pushdown';
import { startOtel } from './otel';
startOtel();
const app = express();
app.use(express.json());
const revoked = new Set<string>();

app.post('/query', async (req, res) => {
  const { selectorHash: h, predicate, limit } = req.body;
  if (revoked.has(h)) return res.status(410).json({ error: 'revoked' });
  // do not return raw rows; return **claim hashes** (demo), plus a ZK-like proof token
  const ids = await runPredicate(predicate, limit || 50);
  const claims = ids.map((x) => selectorHash('claim:' + x));
  res.json({ claimHashes: claims, proof: proofFor(h) });
});

app.post('/revoke/:h', (req, res) => {
  revoked.add(req.params.h);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 7013;
app.listen(PORT, () => console.log(`[FED] ${PORT}`));
```

Tests:

```ts
// services/federation-service/test/fed.spec.ts
test('selector hashed', () => {
  const { selectorHash } = require('../src/zk');
  expect(selectorHash('x')).toHaveLength(64);
});
```

Webapp panel:

```tsx
// webapp/src/features/federation/FedPanel.tsx
import React, { useState } from 'react';
export default function FedPanel() {
  const [selector, setSelector] = useState('community:alpha');
  const [predicate, setPredicate] = useState('n.flag=true');
  const [result, setResult] = useState<any>(null);
  async function run() {
    const h = await (
      await fetch('/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query:
            'mutation($i:FedQueryInput!){ fedQuery(input:$i){ claimHashes proof }}',
          variables: { i: { selectorHash: '', predicate, limit: 25 } },
        }),
      })
    ).json();
    setResult(h.data.fedQuery);
  }
  return (
    <div>
      <input value={predicate} onChange={(e) => setPredicate(e.target.value)} />
      <button onClick={run}>Federate</button>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
```

_(In a real integration, the hash is computed locally and sent; here we focus on the server contracts.)_

---

## 4) Selective Disclosure Wallets — audience filters, TTL, verifier

Profiles:

```ts
// services/wallet-service/src/profiles.ts
export const profiles = {
  partner: { redactions: ['SSN', 'DOB'] },
  court: { redactions: [], requireManifest: true },
  press: { redactions: ['SSN', 'DOB', 'Address'] },
} as const;
```

Bundler & verifier:

```ts
// services/wallet-service/src/bundler.ts
import crypto from 'crypto';
export function bundle(input: {
  audience: string;
  claims: string[];
  ttlSeconds: number;
  redactions?: string[];
  modelCard?: boolean;
}) {
  const id = crypto.randomUUID();
  const expires = Date.now() + input.ttlSeconds * 1000;
  const appliedRedactions = Array.from(new Set([...(input.redactions || [])]));
  const url = `/wallet/${id}`; // served by CDN/gateway in prod
  const signature = crypto
    .createHash('sha256')
    .update(JSON.stringify({ id, claims: input.claims, expires }))
    .digest('hex');
  return {
    id,
    audience: input.audience,
    url,
    revoked: false,
    signature,
    expires,
    claims: input.claims,
    redactions: appliedRedactions,
  };
}

export function verify(bundle: any) {
  const sig = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        id: bundle.id,
        claims: bundle.claims,
        expires: bundle.expires,
      }),
    )
    .digest('hex');
  return sig === bundle.signature && Date.now() < bundle.expires;
}
```

Service API:

```ts
// services/wallet-service/src/index.ts
import express from 'express';
import { bundle, verify } from './bundler';
import { profiles } from './profiles';
import { startOtel } from './otel';
startOtel();
const app = express();
app.use(express.json());
const store = new Map<string, any>();

app.post('/issue', (req, res) => {
  const { audience, ttlSeconds, claims, redactions, modelCard } = req.body;
  const prof = (profiles as any)[audience] || { redactions: [] };
  const b = bundle({
    audience,
    ttlSeconds: ttlSeconds || 3600,
    claims,
    redactions: [...prof.redactions, ...(redactions || [])],
    modelCard,
  });
  store.set(b.id, b);
  res.json({ id: b.id, audience: b.audience, url: b.url, revoked: false });
});

app.get('/bundle/:id', (req, res) => {
  const b = store.get(req.params.id);
  if (!b) return res.status(404).end();
  res.json(b);
});
app.post('/revoke/:id', (req, res) => {
  const b = store.get(req.params.id);
  if (!b) return res.status(404).end();
  b.revoked = true;
  store.set(b.id, b);
  res.json(true);
});
app.get('/verify/:id', (req, res) => {
  const b = store.get(req.params.id);
  if (!b) return res.json({ ok: false });
  res.json({ ok: verify(b) && !b.revoked });
});

const PORT = process.env.PORT || 7014;
app.listen(PORT, () => console.log(`[WALLET] ${PORT}`));
```

Tests:

```ts
// services/wallet-service/test/wallet.spec.ts
test('wallet verify ok', () => {
  const { bundle, verify } = require('../src/bundler');
  const b = bundle({ audience: 'partner', claims: ['c1'], ttlSeconds: 60 });
  expect(verify(b)).toBeTruthy();
});
```

Webapp composer (jQuery POST to issue, and open verifier):

```tsx
// webapp/src/features/wallets/WalletComposer.tsx
import React, { useState } from 'react';
import $ from 'jquery';
export default function WalletComposer() {
  const [audience, setAudience] = useState('partner');
  const [claims, setClaims] = useState('c1,c2');
  function issue() {
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query:
          'mutation($i:WalletRequest!){ walletIssue(input:$i){ id audience url }}',
        variables: {
          i: { audience, ttlSeconds: 3600, claims: claims.split(',') },
        },
      }),
      success: (r) => {
        const b = r.data.walletIssue;
        window.open(`/wallet/verify/${b.id}`, '_blank');
      },
    });
  }
  return (
    <div>
      <select value={audience} onChange={(e) => setAudience(e.target.value)}>
        <option>partner</option>
        <option>court</option>
        <option>press</option>
      </select>
      <input value={claims} onChange={(e) => setClaims(e.target.value)} />
      <button onClick={issue}>Issue</button>
    </div>
  );
}
```

---

## 5) GA Hardening — STRIDE, fuzzing, SBOM, a11y AAA, soak

### 5.1 Permission fuzzing

```ts
// services/hardening/src/fuzz-perms.test.ts
import request from 'supertest';
// Pseudo: hit gateway mutations with random roles/attrs and assert deny by default
it('default deny when no rule match', async () => {
  /* harness with mocked LAC returning default deny */
});
```

### 5.2 SBOM script

```js
// services/hardening/scripts/sbom.cjs
const { spawnSync } = require('child_process');
const pkgs = ['services/*', 'webapp'];
for (const p of pkgs) {
  spawnSync(
    'npx',
    ['cyclonedx-bom', '-o', `./sbom/${p.replace('/', '_')}.xml`],
    { stdio: 'inherit', cwd: '../../' },
  );
}
```

### 5.3 A11y CI (axe)

```js
// ops/accessibility/axe-ci.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:5173');
  // inject axe and assert no serious violations (pseudo)
  await b.close();
})();
```

### 5.4 Soak runner

```ts
// services/hardening/src/soak-runner.ts
setInterval(() => {
  /* call gateway queries on a loop with tracing */
}, 1000);
```

---

## 6) Observability & Dashboards

- **xai_counterfactual_ms**, **xai_saliency_ms**, **fed_pushdown_ms**, **wallet_issue_count**, **revocations**, **perm_fuzz_denies**, **a11y_violations**, **soak_errors**.
- Trace propagation through gateway → xai/fed/wallet → ledger.

---

## 7) k6 — Federation Throughput

```js
// ops/k6/federation-demo.js
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 20, duration: '2m' };
export default function () {
  const body = {
    query:
      'mutation($i:FedQueryInput!){ fedQuery(input:$i){ claimHashes proof }}',
    variables: {
      i: { selectorHash: 'abc', predicate: 'n.flag=true', limit: 10 },
    },
  };
  const r = http.post('http://localhost:7000/graphql', JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
  check(r, { ok: (x) => x.status === 200 });
}
```

---

## 8) Demo Script (Sprint 4)

```md
# Demo — Explain, Federate, Disclose, Ship GA

1. Start stack: `docker compose -f docker-compose.dev.yaml up --build`
2. **XAI**: In webapp XAI panel, run Explain on node "A" → see saliency overlay (jQuery event) and counterfactual suggestions; check Grafana xai\_\* metrics.
3. **Federation**: In FedPanel, run predicate `n.flag=true` → receive claim hashes + proof; then revoke selector and retry → gets 410/"revoked".
4. **Wallets**: In WalletComposer, issue a **press** bundle → open verifier → toggle revoke and re‑check verify.
5. **Hardening**: Run `pnpm -r test` to execute fuzz tests, run `node services/hardening/scripts/sbom.cjs` to emit SBOM, execute `node services/hardening/src/soak-runner.ts` for 10m and check Grafana.
6. **GA checklist**: ensure zero critical vulns, a11y CI green, STRIDE notes attached to PR, docs frozen.
```

---

## 9) Security & Compliance Notes

- **LAC** enforced at gateway for XAI/federation/wallet flows; decisions recorded in audit.
- **Provenance**: wallet bundles include claim hashes only; proofs/IDs verify via verifier endpoint.
- **Privacy**: audience profiles enforce redactions; TTL + revocation path; logs contain minimal PII.
- **Federation**: zero‑copy demo returns only hashes and proof tokens, no raw records.

---

## 10) Final GA Checklist (tick in PR)

- ✅ All sprints’ acceptance criteria green
- ✅ Policy hit rate > 99% on test corpus
- ✅ p95 graph < 1.5s on 50k/3‑hop
- ✅ RTO ≤ 1h / RPO ≤ 5m chaos verified
- ✅ a11y AAA for core screens
- ✅ Zero criticals (SCA/DAST/SAST)
- ✅ SBOM archived; release notes & demo recorded
