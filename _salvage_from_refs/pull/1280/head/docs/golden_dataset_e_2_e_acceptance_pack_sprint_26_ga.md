# Golden Dataset & E2E Acceptance Pack — Sprint 26 GA

**Purpose:** Provide deterministic fixtures and executable tests to validate GA guardrails, performance, security, and policy behavior across Gateway, NL→Cypher, ER, and CD/provenance.

---

## 0) Package Layout
```
acceptance/
  data/
    golden/
      entities.csv
      relationships.csv
      datasets.csv            # license/purpose/retention metadata
      er_candidates.csv       # HIGH/MID/LOW mixes
      README.md
  scripts/
    load_golden.ts           # loads CSV → Postgres/Neo4j
    warm_pq.ts               # registers top‑10 persisted queries
    verify_bundle.sh         # runs verify‑bundle over artifacts
  e2e/
    playwright.config.ts
    web/
      er.adjudication.spec.ts
      stepup.sensitive.spec.ts
    gateway/
      graphql.reads.spec.ts  # p95 < 350ms threshold gate (soft)
    policy/
      export_license.spec.ts
  perf/
    k6.s26.pq.js             # alias of tools/k6/s26-pq.js
    k6.s26.writes.js         # alias of tools/k6/s26-writes.js
    k6.s26.graph.js          # alias of tools/k6/s26-graph.js
  sql/
    20251006_er_queue.sql    # mirror of migration
  cypher/
    paths.cypher             # 1‑hop & 3‑hop queries
  evidence/
    .keep
```

---

## 1) Golden Dataset — Entities & Relationships

### entities.csv
```
id,type,name,tags,license,purpose,retention
G100,Company,ACME Corp,"core;vendor","Open-Data-OK","investigation","standard-365d"
G200,Person,Jane Smith,"pii;employee","Restricted-TOS","investigation","short-30d"
G300,Person,John Doe,"pii;contractor","MIT-OK","t&s","short-30d"
G400,Company,Beta LLC,"partner","Proprietary-Client","fraud-risk","standard-365d"
```

### relationships.csv
```
from,to,rel,weight
G100,G200,EMPLOYS,1
G400,G300,CONTRACTS,1
G100,G400,PARTNERS_WITH,0.7
```

### datasets.csv
```
id,name,license,purpose,retention
D001,HR-PII,Restricted-TOS,investigation,short-30d
D002,OpenPartnerships,Open-Data-OK,benchmarking,standard-365d
```

### er_candidates.csv
```
idempotencyKey,externalId,candidateName,confidence
k-1,ext-100,Acme Corporation,HIGH
k-2,ext-101,Jane S.,MID
k-3,ext-102,John D.,LOW
```

---

## 2) Loader Scripts

### `acceptance/scripts/load_golden.ts`
```ts
import fs from 'fs';
import csv from 'csv-parse/sync';
import neo4j from 'neo4j-driver';
import { Client } from 'pg';

(async function main(){
  const neo = neo4j.driver(process.env.NEO4J_URL!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!));
  const pg = new Client({ connectionString: process.env.PG_URL! });
  await pg.connect();

  const ents = csv.parse(fs.readFileSync('acceptance/data/golden/entities.csv'),{columns:true});
  const rels = csv.parse(fs.readFileSync('acceptance/data/golden/relationships.csv'),{columns:true});
  const erc  = csv.parse(fs.readFileSync('acceptance/data/golden/er_candidates.csv'),{columns:true});

  const s = neo.session();
  for (const e of ents){
    await s.run('MERGE (n:Entity {id:$id}) SET n+= $props', { id: e.id, props: { type:e.type, name:e.name, tags:e.tags, license:e.license, purpose:e.purpose, retention:e.retention }});
  }
  for (const r of rels){
    await s.run('MATCH (a:Entity {id:$from}),(b:Entity {id:$to}) MERGE (a)-[x:'+r.rel+']->(b) SET x.weight = toFloat($w)', { from:r.from, to:r.to, w:r.weight });
  }
  await s.close();

  // ER candidates → queue table
  await pg.query('BEGIN');
  for (const c of erc){
    await pg.query('insert into er_queue(idempotency_key, external_id, name, confidence) values($1,$2,$3,$4) on conflict do nothing', [c.idempotencyKey, c.externalId, c.candidateName, c.confidence]);
  }
  await pg.query('COMMIT');

  await neo.close();
  await pg.end();
  console.log('Golden dataset loaded.');
})();
```

### `acceptance/scripts/warm_pq.ts`
```ts
import fs from 'fs';
import fetch from 'node-fetch';

const URL = process.env.GQL_URL!;
const TOKEN = process.env.TOKEN!;

const queries = [
  { op:"GetEntity", q:"query($id:ID!){ entity(id:$id){ id name }}", vars:{id:"G100"}},
  { op:"Neighbors1", q:"query($id:ID!){ neighbors(id:$id,depth:1){ id }}", vars:{id:"G100"}},
];

(async ()=>{
  for (const {op,q,vars} of queries){
    const res = await fetch(URL, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${TOKEN}` }, body: JSON.stringify({ operationName: op, query:q, variables: vars })});
    if (!res.ok) throw new Error('PQ register failed');
  }
  console.log('PQ warmup complete');
})();
```

---

## 3) E2E — Playwright (Web)

### `acceptance/e2e/web/er.adjudication.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test('ER queue processes HIGH automatically, MID requires review', async ({ page }) => {
  await page.goto(process.env.WEB_URL!);
  await page.click('text=ER Adjudication');
  await page.waitForSelector('[data-row-id="k-1"][data-status="merged"]');
  await page.click('[data-filter="MID"]');
  await expect(page.locator('[data-row-id="k-2"]').first()).toBeVisible();
});
```

### `acceptance/e2e/web/stepup.sensitive.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test('Sensitive mutation requires WebAuthn step-up', async ({ request }) => {
  const res = await request.post(process.env.GQL_URL!, {
    data: { query: 'mutation($i:MergeInput!){ mergeEntity(input:$i){ id }}', variables: { i: { id:'G999', attrs:{ name:'Temp' } } } },
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${process.env.TOKEN}` }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(JSON.stringify(body)).toContain('Step-up');
});
```

---

## 4) E2E — Gateway GraphQL (Reads p95 Gate)

### `acceptance/e2e/gateway/graphql.reads.spec.ts`
```ts
import { test, expect } from '@playwright/test';

const N = parseInt(process.env.N || '50', 10);

async function req(api:string, op:string, query:string, vars:any){
  const res = await fetch(api, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ operationName:op, query, variables: vars })});
  return res;
}

test('reads within soft p95 threshold', async () => {
  const api = process.env.GQL_URL!;
  const q = 'query($id:ID!){ entity(id:$id){ id name }}';
  const durs:number[] = [];
  for (let i=0;i<N;i++){
    const t0 = performance.now();
    const r = await req(api,'GetEntity',q,{id:'G100'});
    expect(r.status).toBe(200);
    durs.push(performance.now()-t0);
  }
  durs.sort((a,b)=>a-b);
  const p95 = durs[Math.floor(0.95*N)-1];
  console.log('p95(ms)=', p95);
  expect(p95).toBeLessThan(350);
});
```

---

## 5) Policy Acceptance — Export License Gate

### `acceptance/e2e/policy/export_license.spec.ts`
```ts
import { test, expect } from '@playwright/test';

const q = `query($d:ID!){ exportDataset(id:$d){ ok reason } }`;

test('Restricted-TOS dataset export denied with explain', async () => {
  const res = await fetch(process.env.GQL_URL!, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ operationName:'ExportDataset', query:q, variables:{ d:'D001' } })});
  const body = await res.json();
  expect(body.data.exportDataset.ok).toBe(false);
  expect(body.data.exportDataset.reason).toMatch(/license|Restricted-TOS/i);
});
```

---

## 6) Cypher & SQL Snippets

### `acceptance/cypher/paths.cypher`
```cypher
// 1-hop
MATCH (n:Entity {id:$id})-[:EMPLOYS|CONTRACTS|PARTNERS_WITH]->(m)
RETURN m.id LIMIT 25;

// 3-hop
MATCH p=(:Entity {id:$id})-[:EMPLOYS|CONTRACTS|PARTNERS_WITH*..3]->(:Entity)
RETURN nodes(p)[-1].id AS dest LIMIT 25;
```

### `acceptance/sql/20251006_er_queue.sql` (checksum mirror)
> Use the already‑migrated schema; this file serves integrity checks for fixtures.

---

## 7) CI Wiring

### `.github/workflows/acceptance.yml`
```yaml
name: acceptance-s26
on: [workflow_dispatch, pull_request]
jobs:
  load-fixtures:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci --workspace acceptance
      - run: node acceptance/scripts/load_golden.js
        env:
          NEO4J_URL: ${{ secrets.NEO4J_URL }}
          NEO4J_USER: ${{ secrets.NEO4J_USER }}
          NEO4J_PASS: ${{ secrets.NEO4J_PASS }}
          PG_URL: ${{ secrets.PG_URL }}
  e2e-web:
    runs-on: ubuntu-latest
    needs: load-fixtures
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npx playwright install --with-deps
      - run: npx playwright test acceptance/e2e/web
        env:
          WEB_URL: ${{ secrets.WEB_URL }}
          GQL_URL: ${{ secrets.GQL_URL }}
          TOKEN: ${{ secrets.TOKEN }}
  e2e-gateway:
    runs-on: ubuntu-latest
    needs: load-fixtures
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright test acceptance/e2e/gateway
        env:
          GQL_URL: ${{ secrets.GQL_URL }}
  policy:
    runs-on: ubuntu-latest
    needs: load-fixtures
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright test acceptance/e2e/policy
        env:
          GQL_URL: ${{ secrets.GQL_URL }}
```

---

## 8) Make Targets
```make
acceptance.load:
	node acceptance/scripts/load_golden.js

acceptance.pq.warm:
	node acceptance/scripts/warm_pq.js

acceptance.e2e:
	npx playwright test acceptance/e2e

acceptance.perf:
	k6 run acceptance/perf/k6.s26.pq.js
```

---

## 9) Evidence Capture
- Commit Playwright reports, k6 JSON, and Grafana exports to `acceptance/evidence/` and mirror at `/evidence/*` for GA bundle.  
- Record PQ hashes used during tests in `acceptance/evidence/pq-hashes.json`.

---

## 10) Data Governance Notes
- PII rows (`Person` with `pii` tag) fall under **short‑30d** retention. Use the cleanup job in staging to validate policy actions.  
- Dataset `D001` exercises **Restricted‑TOS** denial path with explain output.

---

## 11) Success Criteria (Sprint 26 DoD tie-in)
- E2E tests green across web/gateway/policy suites.  
- Gateway reads p95 < 350 ms in `graphql.reads.spec.ts` soft gate.  
- Policy export denial for `D001` confirmed with explain string captured.  
- ER HIGH auto‑merge visible; MID queued for review.

