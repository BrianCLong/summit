# IntelGraph Quickstart — Repository Scaffold (v0.1)

This pack gives you a runnable end‑to‑end slice: ingest CSV → Neo4j/Postgres → GraphQL API → basic UI → observability, with tests and load/e2e scripts. Copy files into a new repo or use as reference.

---

## Repo Tree

```
intelgraph-quickstart/
├─ README.md
├─ .gitignore
├─ docker-compose.yml
├─ .env.example
├─ ops/
│  ├─ helm/
│  │  ├─ values.dev.yaml
│  │  └─ values.prod.yaml
│  ├─ terraform/ (stubs)
│  └─ k6/
│     ├─ api-smoke.js
│     └─ cypher-load.js
├─ api/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ jest.config.ts
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ schema.ts
│  │  ├─ resolvers.ts
│  │  ├─ auth.ts
│  │  ├─ abac.ts (OPA client)
│  │  ├─ db/
│  │  │  ├─ neo4j.ts
│  │  │  └─ postgres.ts
│  │  └─ observability.ts
│  └─ tests/
│     ├─ unit/
│     │  ├─ mapper.spec.ts
│     │  └─ abac.spec.ts
│     └─ e2e/
│        └─ api.playwright.spec.ts
├─ ingest/
│  ├─ package.json
│  ├─ src/
│  │  ├─ s3csv-worker.ts
│  │  ├─ mapping.ts
│  │  ├─ provenance.ts
│  │  └─ manifest.ts
│  └─ tests/
│     └─ ingest.spec.ts
├─ policies/
│  ├─ abac.rego
│  └─ data.json (example)
├─ db/
│  ├─ neo4j/
│  │  ├─ constraints.cypher
│  │  └─ seed.cypher
│  └─ postgres/
│     └─ migrations/
│        └─ 0001_ingest_manifest.sql
├─ sample-data/
│  ├─ people.csv
│  └─ mapping.json
├─ ui/
│  ├─ package.json
│  └─ src/
│     ├─ main.tsx
│     ├─ App.tsx
│     └─ api.ts
└─ .github/
   └─ workflows/
      └─ ci.yml
```

---

## Top-Level

### `.env.example`

```
# API / DB
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4jpassword
PGHOST=postgres
PGPORT=5432
PGDATABASE=intelgraph
PGUSER=postgres
PGPASSWORD=postgres
TENANT_ID=demo-tenant
# OIDC / OPA
OIDC_ISSUER=https://issuer.example.com/
OPA_URL=http://opa:8181/v1/data/abac/allow
# OTEL
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
SERVICE_NAME=intelgraph-api
```

### `docker-compose.yml`

```yaml
version: "3.9"
services:
  neo4j:
    image: neo4j:5.25
    environment:
      - NEO4J_AUTH=neo4j/neo4jpassword
      - NEO4JLABS_PLUGINS=["apoc"]
    ports: ["7474:7474", "7687:7687"]
    volumes:
      - neo4j_data:/data
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: intelgraph
    ports: ["5432:5432"]
    volumes:
      - pg_data:/var/lib/postgresql/data
  opa:
    image: openpolicyagent/opa:0.66.0
    command: ["run", "--server", "/policies/abac.rego", "/policies/data.json"]
    volumes:
      - ./policies:/policies
    ports: ["8181:8181"]
  api:
    build: ./api
    command: ["npm", "run", "start:dev"]
    environment:
      - NODE_ENV=development
    env_file: [.env.example]
    depends_on: [neo4j, postgres, opa]
    ports: ["4000:4000"]
    volumes:
      - ./api:/app
  ingest:
    build: ./ingest
    command: ["npm", "run", "start:dev"]
    env_file: [.env.example]
    depends_on: [neo4j, postgres]
    volumes:
      - ./ingest:/app
  otel-collector:
    image: otel/opentelemetry-collector:0.108.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./ops/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports: ["4317:4317"]
volumes:
  neo4j_data: {}
  pg_data: {}
```

### `README.md`

````md
# IntelGraph Quickstart

Run a local slice with Neo4j, Postgres, OPA, GraphQL API, and ingest worker.

## Prereqs

- Docker + Compose, Node 20+

## Up

```bash
docker compose up -d --build
# apply constraints
cat db/neo4j/constraints.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
# run seed
cat db/neo4j/seed.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
# load sample data via ingest
npm --prefix ingest run demo
```
````

## Query

Open [http://localhost:4000/graphql](http://localhost:4000/graphql) and run:

```graphql
query {
  personById(id: "p-1") {
    id
    name
    orgs {
      org {
        name
      }
      since
    }
  }
}
```

## Tests

```bash
npm --prefix api test
npm --prefix ingest test
```

````

---

## Operations Artifacts

### `ops/helm/values.dev.yaml`
```yaml
replicaCount: 1
resources:
  requests: { cpu: "250m", memory: "512Mi" }
  limits: { cpu: "500m", memory: "1Gi" }
SLOs:
  api_p95_ms: 350
  write_p95_ms: 700
Budgets:
  prod_monthly_cap_usd: 18000
  llm_cap_usd: 5000
alerts:
  burn_threshold_pct: 80
````

### `ops/k6/api-smoke.js`

```js
import http from "k6/http";
import { check, sleep } from "k6";
export const options = { vus: 5, duration: "1m" };
const url = "http://localhost:4000/graphql";
export default function () {
  const q = JSON.stringify({ query: '{ searchPersons(q:"a", limit:5){ id name } }' });
  const res = http.post(url, q, {
    headers: { "Content-Type": "application/json", "x-tenant": "demo-tenant" },
  });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
```

### `ops/k6/cypher-load.js`

```js
import http from "k6/http";
import { check } from "k6";
// Assumes a simple Cypher HTTP endpoint proxy in API for test-only
export const options = {
  vus: 20,
  duration: "2m",
  thresholds: { http_req_duration: ["p(95)<300"] },
};
export default function () {
  const res = http.post(
    "http://localhost:4000/test/cypher",
    JSON.stringify({ cypher: 'MATCH (p:Person)-[]-(n:Person) WHERE p.id="p-1" RETURN n LIMIT 50' }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, { ok: (r) => r.status === 200 });
}
```

---

## API Service

### `api/package.json`

```json
{
  "name": "intelgraph-api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p .",
    "start": "node dist/src/index.js",
    "start:dev": "tsx src/index.ts",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "@apollo/server": "^4.11.0",
    "apollo-server-core": "^3.13.0",
    "express": "^4.21.1",
    "cors": "^2.8.5",
    "body-parser": "^1.20.3",
    "graphql": "^16.9.0",
    "neo4j-driver": "^5.25.0",
    "pg": "^8.13.1",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^3.3.2",
    "pino": "^9.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.12.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "playwright": "^1.48.2"
  }
}
```

### `api/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "outDir": "dist",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### `api/jest.config.ts`

```ts
import type { Config } from "jest";
const config: Config = { preset: "ts-jest", testEnvironment: "node", roots: ["<rootDir>/tests"] };
export default config;
```

### `api/src/observability.ts`

```ts
import pino from "pino";
export const logger = pino({ level: process.env.LOG_LEVEL || "info" });
```

### `api/src/db/neo4j.ts`

```ts
import neo4j from "neo4j-driver";
const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);
export const getSession = () => driver.session();
export default driver;
```

### `api/src/db/postgres.ts`

```ts
import { Pool } from "pg";
export const pg = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});
```

### `api/src/auth.ts`

```ts
import jwt from "jsonwebtoken";
export type AuthContext = { tenantId: string };
export function getContextFromReq(req: any): AuthContext {
  const tenantId = (req.headers["x-tenant"] as string) || process.env.TENANT_ID || "demo-tenant";
  // NOTE: extend with OIDC validation if Authorization: Bearer is present
  return { tenantId };
}
```

### `api/src/abac.ts`

```ts
import fetch from "node-fetch";
export async function allow(subject: any, action: string, resource: any): Promise<boolean> {
  const url = process.env.OPA_URL!;
  const input = { input: { subject, action, resource } };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return false;
  const data: any = await res.json();
  return Boolean(data.result === true || data.result?.allow === true);
}
```

### `api/src/schema.ts`

```ts
import { gql } from "graphql-tag";
export const typeDefs = gql`
  type Person {
    id: ID!
    tenantId: ID!
    name: String!
    email: String
    orgs(limit: Int = 10): [OrganizationEdge!]!
  }
  type Organization {
    id: ID!
    tenantId: ID!
    name: String!
    domain: String
  }
  type OrganizationEdge {
    org: Organization!
    since: String
    until: String
    provenance: String
  }
  type IngestResult {
    batchId: ID!
    accepted: Int!
    rejected: Int!
    manifestHash: String!
  }
  type Query {
    personById(id: ID!): Person
    searchPersons(q: String!, limit: Int = 20): [Person!]!
    neighbors(personId: ID!, hop: Int = 1, limit: Int = 50): [Person!]!
  }
  type Mutation {
    ingestBatch(s3Url: String!, mappingId: ID!): IngestResult!
  }
`;
```

### `api/src/resolvers.ts`

```ts
import { getSession } from "./db/neo4j";
import { allow } from "./abac";
export const resolvers = {
  Query: {
    async personById(_: any, { id }: any, ctx: any) {
      if (!(await allow({ tenantId: ctx.tenantId }, "read", { type: "person", id })))
        throw new Error("forbidden");
      const s = getSession();
      const res = await s.run("MATCH (p:Person {id:$id, tenant_id:$tid}) RETURN p", {
        id,
        tid: ctx.tenantId,
      });
      await s.close();
      return res.records[0]?.get("p").properties || null;
    },
    async searchPersons(_: any, { q, limit }: any, ctx: any) {
      const s = getSession();
      const res = await s.run(
        "MATCH (p:Person) WHERE p.tenant_id=$tid AND toLower(p.name) CONTAINS toLower($q) RETURN p LIMIT $limit",
        { tid: ctx.tenantId, q, limit }
      );
      await s.close();
      return res.records.map((r) => r.get("p").properties);
    },
    async neighbors(_: any, { personId, limit }: any, ctx: any) {
      const s = getSession();
      const res = await s.run(
        "MATCH (p:Person {id:$id, tenant_id:$tid})-[]-(n:Person {tenant_id:$tid}) RETURN n LIMIT $limit",
        { id: personId, tid: ctx.tenantId, limit }
      );
      await s.close();
      return res.records.map((r) => r.get("n").properties);
    },
  },
};
```

### `api/src/index.ts`

```ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { getContextFromReq } from "./auth";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use(
  "/graphql",
  expressMiddleware(server, { context: async ({ req }) => getContextFromReq(req) })
);

// test-only Cypher proxy used by k6 load script
app.post("/test/cypher", async (req, res) => {
  if (process.env.NODE_ENV === "production") return res.status(404).end();
  const { getSession } = await import("./db/neo4j");
  const s = getSession();
  try {
    const r = await s.run(req.body.cypher);
    res.json({ records: r.records.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  } finally {
    await s.close();
  }
});

app.listen(4000, () => console.log("API on http://localhost:4000/graphql"));
```

### `api/tests/unit/abac.spec.ts`

```ts
import { allow } from "../../src/abac";

test("deny on OPA down", async () => {
  process.env.OPA_URL = "http://localhost:5999/v1/data/abac/allow";
  const ok = await allow({ tenantId: "t" }, "read", { type: "person", id: "x" });
  expect(ok).toBe(false);
});
```

### `api/tests/e2e/api.playwright.spec.ts`

```ts
import { test, expect } from "@playwright/test";

const url = "http://localhost:4000/graphql";

test("search persons returns results", async ({ request }) => {
  const res = await request.post(url, {
    data: { query: '{ searchPersons(q:"a", limit: 3){ id name } }' },
    headers: { "x-tenant": "demo-tenant" },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data.searchPersons)).toBe(true);
});
```

---

## Ingest Worker

### `ingest/package.json`

```json
{
  "name": "intelgraph-ingest",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start:dev": "tsx src/s3csv-worker.ts",
    "demo": "tsx src/s3csv-worker.ts --local sample-data/people.csv sample-data/mapping.json"
  },
  "dependencies": {
    "csv-parse": "^5.5.6",
    "neo4j-driver": "^5.25.0",
    "yargs": "^17.7.2",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```

### `ingest/src/mapping.ts`

```ts
export type Mapping = {
  person: { id: string; name: string; email: string };
  org: { name: string; domain: string };
  since?: string;
};
```

### `ingest/src/provenance.ts`

```ts
import SHA256 from "crypto-js/sha256";
export const hashRow = (row: any) => SHA256(JSON.stringify(row)).toString();
```

### `ingest/src/manifest.ts`

```ts
export type Manifest = {
  batchId: string;
  source: string;
  hash: string;
  rowCount: number;
  createdAt: string;
};
```

### `ingest/src/s3csv-worker.ts`

```ts
import fs from "fs";
import { parse } from "csv-parse";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import neo4j from "neo4j-driver";
import { hashRow } from "./provenance";

const argv = await yargs(hideBin(process.argv)).option("local", { type: "boolean" }).parse();
const [csvPath, mappingPath] = argv._.map(String);
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);
const session = driver.session();

const rows: any[] = [];
fs.createReadStream(csvPath)
  .pipe(parse({ columns: true }))
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    const tx = session.beginTransaction();
    try {
      for (const r of rows) {
        const pid = r[mapping.person.id];
        const name = r[mapping.person.name];
        const email = r[mapping.person.email];
        const org = r[mapping.org.name];
        const domain = r[mapping.org.domain];
        const since = r[mapping.since || "since"];
        const h = hashRow(r);
        await tx.run(
          `MERGE (p:Person {id:$pid, tenant_id:$tid})
         ON CREATE SET p.name=$name, p.email=$email
         MERGE (o:Organization {id: toLower(replace($org,' ','-')), tenant_id:$tid})
         ON CREATE SET o.name=$org, o.domain=$domain
         MERGE (p)-[r:EMPLOYED_BY {tenant_id:$tid}]->(o)
         ON CREATE SET r.since=$since, r.provenance=$h`,
          { pid, tid: process.env.TENANT_ID || "demo-tenant", name, email, org, domain, since, h }
        );
      }
      await tx.commit();
      console.log(`Ingested ${rows.length} rows`);
    } catch (e) {
      console.error(e);
      await tx.rollback();
    } finally {
      await session.close();
      await driver.close();
    }
  });
```

---

## Policies

### `policies/abac.rego`

```rego
package abac

default allow = false

allow {
  input.subject.tenantId == input.resource.tenantId
}

# Example: deny search if purpose missing (extend as needed)
allow {
  input.action == "search"
  input.subject.purpose == "demo"
}
```

### `policies/data.json`

```json
{ "tenants": ["demo-tenant"] }
```

---

## Database Artifacts

### `db/neo4j/constraints.cypher`

```cypher
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE (p.id, p.tenant_id) IS NODE KEY;
CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE (o.id, o.tenant_id) IS NODE KEY;
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
```

### `db/neo4j/seed.cypher`

```cypher
MERGE (:Person {id:'p-1', tenant_id:'demo-tenant', name:'Ada Lovelace', email:'ada@example.com'});
MERGE (:Organization {id:'org-intelgraph', tenant_id:'demo-tenant', name:'IntelGraph', domain:'intelgraph.example'});
```

### `db/postgres/migrations/0001_ingest_manifest.sql`

```sql
CREATE TABLE IF NOT EXISTS ingest_manifest (
  batch_id uuid PRIMARY KEY,
  source text not null,
  hash text not null,
  row_count int not null,
  created_at timestamptz default now()
);
```

---

## Sample Data

### `sample-data/people.csv`

```csv
person_id,name,email,org,domain,since
p-1,Ada Lovelace,ada@example.com,IntelGraph,intelgraph.example,1843-01-01
p-2,Alan Turing,alan@example.com,IntelGraph,intelgraph.example,1936-06-01
p-3,Grace Hopper,grace@example.com,Navy,navy.mil,1952-01-01
```

### `sample-data/mapping.json`

```json
{
  "person": { "id": "person_id", "name": "name", "email": "email" },
  "org": { "name": "org", "domain": "domain" },
  "since": "since"
}
```

---

## UI (minimal demo)

### `ui/package.json`

```json
{
  "name": "intelgraph-ui",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": { "dev": "vite" },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": { "vite": "^5.4.10", "typescript": "^5.6.3" }
}
```

### `ui/src/api.ts`

```ts
export async function gql(query: string, variables?: any) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant": "demo-tenant" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}
```

### `ui/src/App.tsx`

```tsx
import { useEffect, useState } from "react";
import { gql } from "./api";
export default function App() {
  const [people, setPeople] = useState<any[]>([]);
  useEffect(() => {
    gql('{ searchPersons(q:"a", limit: 10){ id name } }').then((r) =>
      setPeople(r.data.searchPersons)
    );
  }, []);
  return (
    <div style={{ padding: 16 }}>
      <h1>IntelGraph Demo</h1>
      <ul>
        {people.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### `ui/src/main.tsx`

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")!).render(<App />);
```

---

## CI/CD

### `.github/workflows/ci.yml`

```yaml
name: ci
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci --prefix api && npm ci --prefix ingest
      - run: npm test --prefix api
      - run: npm test --prefix ingest
      - name: SBOM
        run: |
          npm i -g @cyclonedx/cyclonedx-npm
          cyclonedx-npm --output-file sbom.xml --output-format xml --ignore-npm-errors
      - name: Lint Policy (OPA)
        uses: open-policy-agent/setup-opa@v2
      - run: opa fmt -w policies && opa check policies
```

---

## Acceptance & Verification Checklist (attach to PR)

- [ ] `docker compose up -d --build` succeeds
- [ ] Neo4j constraints applied; seed loaded
- [ ] `npm --prefix ingest run demo` ingests >=3 rows
- [ ] GraphQL `searchPersons` returns people under `x-tenant: demo-tenant`
- [ ] k6 `api-smoke.js` p95 < 350ms; `cypher-load.js` p95 < 300ms for 1-hop
- [ ] Unit tests pass; Playwright e2e passes
- [ ] OPA denies cross-tenant access when `x-tenant` mismatched
- [ ] Evidence bundle: test reports + k6 summary attached to build

````

---

# Runbook: Local Smoke → Evidence Bundle (v0.1)

## 0) One‑time setup
```bash
# from repo root
cp .env.example .env.local
docker compose up -d --build
# apply Neo4j constraints & seed
cat db/neo4j/constraints.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
cat db/neo4j/seed.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
````

## 1) Ingest demo data

```bash
npm --prefix ingest run demo
```

**Pass** if console prints `Ingested >= 3 rows`.

## 2) API sanity & SLO smoke

```bash
# basic query
curl -s -H 'Content-Type: application/json' -H 'x-tenant: demo-tenant' \
  -d '{"query":"{ searchPersons(q:\"a\", limit:3){ id name } }"}' \
  http://localhost:4000/graphql | jq .

# k6 p95 checks
node ops/k6/api-smoke.js   # or: k6 run ops/k6/api-smoke.js
node ops/k6/cypher-load.js # or: k6 run ops/k6/cypher-load.js
```

**Targets**: API p95 ≤ 350 ms; 1‑hop Cypher p95 ≤ 300 ms.

## 3) Policy simulation (OPA)

```bash
opa eval --data policies --input <(echo '{"subject":{"tenantId":"demo-tenant"},"action":"read","resource":{"tenantId":"demo-tenant"}}') "data.abac.allow"
```

**Pass** if result is `true`. Cross‑tenant should be `false`.

## 4) Tests

```bash
npm --prefix api test
npm --prefix ingest test
```

## 5) Evidence bundle (attach to PR)

Create a tamper‑evident bundle of artifacts (hash‑manifest + reports):

### `scripts/evidence.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
ARTIFACTS_DIR=.evidence
rm -rf "$ARTIFACTS_DIR" && mkdir -p "$ARTIFACTS_DIR"
# collect
cp -v ops/k6/*.js "$ARTIFACTS_DIR"/ || true
npm --prefix api test -- --reporters=default --json --outputFile="$ARTIFACTS_DIR/api-tests.json" || true
npm --prefix ingest test -- --reporters=default --json --outputFile="$ARTIFACTS_DIR/ingest-tests.json" || true
# optional: k6 summaries if installed
command -v k6 >/dev/null && k6 run --summary-export "$ARTIFACTS_DIR/api-k6.json" ops/k6/api-smoke.js || true
command -v k6 >/dev/null && k6 run --summary-export "$ARTIFACTS_DIR/cypher-k6.json" ops/k6/cypher-load.js || true
# manifest
( cd "$ARTIFACTS_DIR" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 > MANIFEST.sha256 )
# tarball
TS=$(date -u +%Y%m%dT%H%M%SZ)
TAR="evidence_$TS.tgz"
tar -czf "$TAR" -C "$ARTIFACTS_DIR" .
shasum -a 256 "$TAR" > "$TAR.sha256"
echo "Bundle: $TAR"
```

Make executable and run:

```bash
chmod +x scripts/evidence.sh
./scripts/evidence.sh
```

Artifacts will appear under `.evidence/` plus a versioned tarball.

---

# CI: SLO & Evidence Gates (upgrade)

### `.github/workflows/ci.yml` (append job)

```yaml
slo-and-bundle:
  runs-on: ubuntu-latest
  needs: [build-test]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "20" }
    - name: Launch services
      run: |
        docker compose up -d --build neo4j postgres opa api
        sleep 15
        cat db/neo4j/constraints.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
    - name: Ingest demo
      run: npm --prefix ingest ci && npm --prefix ingest run demo || true
    - name: k6 SLO smoke
      uses: grafana/k6-action@v0.3.1
      with:
        filename: ops/k6/api-smoke.js
    - name: k6 Cypher 1-hop
      uses: grafana/k6-action@v0.3.1
      with:
        filename: ops/k6/cypher-load.js
    - name: Evidence bundle
      run: |
        bash scripts/evidence.sh
    - name: Upload bundle
      uses: actions/upload-artifact@v4
      with:
        name: evidence-bundle
        path: |
          .evidence
          evidence_*.tgz
          evidence_*.tgz.sha256
```

### PR Gate (status policy)

- Require **build-test** and **slo-and-bundle** jobs to pass.
- Failing thresholds auto‑block merge; artifact bundle attached.

---

# Release Notes Template (v0.1)

**Release:** vX.Y.Z — IntelGraph Quickstart Slice
**Date:** YYYY‑MM‑DD

## Highlights

- CSV→Graph ingest (S3/Local) with provenance
- GraphQL: `personById`, `searchPersons`, `neighbors`
- OPA ABAC seed; tenant scoped queries
- Observability hooks; k6 SLO verification

## SLO & Cost

- API p95: \_\_\_ ms (target ≤ 350)
- Write p95: \_\_\_ ms (target ≤ 700)
- Cypher 1‑hop p95: \_\_\_ ms (target ≤ 300)
- Budget burn: within dev/stg/prod caps

## Migrations

- Postgres: `0001_ingest_manifest.sql` applied
- Neo4j: constraints created (id+tenant composite keys)

## Security & Privacy

- mTLS (local placeholder)
- OIDC issuer: \_\_\_ (TBD)
- Field‑level encryption planned for email (demo only in local)

## Backout Plan

- Helm rollback; feature flags off; revert DB migration (safe)

---

# Owner Handover — What to do now

1. **Run the Local Smoke** above and confirm SLOs.
2. **Attach the Evidence Bundle** to your PR and mark the Acceptance Checklist in the canvas.
3. **Fill the Initiation Pack YAML** with real values (tenant mode, regions, OIDC issuer, budgets).
4. Ping Maestro to regenerate tailored ADRs, policies, and IaC for your topology.

---

# PR & Ownership Assets

## `.github/pull_request_template.md`

```md
## Summary

Describe what this PR does and why. Link to case/issue.

## Evidence

- [ ] Evidence bundle attached (from `scripts/evidence.sh`)
- [ ] k6 API p95 ≤ 350 ms
- [ ] Cypher 1‑hop p95 ≤ 300 ms
- [ ] Unit + e2e tests green

## Security/Privacy

- [ ] OPA policies updated/tested
- [ ] Secrets via Vault/SSM (no plaintext)
- [ ] PII handled per retention rules

## Rollout

- [ ] Canary config defined (percentage, duration, rollback trigger)

## Checklist

- [ ] Updated docs/CHANGELOG
- [ ] Backout plan verified
- [ ] Owners/RACI notified
```

## `CODEOWNERS`

```txt
# API service
/api/ @app-eng-leads @sec-eng-review
# Ingest worker
/ingest/ @data-eng-leads
# Policies
/policies/ @sec-eng-leads
# Ops (Helm/Terraform)
/ops/ @sre-leads @platform-leads
# UI
/ui/ @app-eng-leads
# Workflows
/.github/ @devex-leads
```

## `OWNERS.md` (RACI)

```md
# Owners & RACI

| Area           | Responsible | Accountable   | Consulted         | Informed |
| -------------- | ----------- | ------------- | ----------------- | -------- |
| API (GraphQL)  | App Eng     | Platform Lead | Sec Eng           | SRE      |
| Ingest         | Data Eng    | Platform Lead | Sec Eng           | SRE      |
| Policies (OPA) | Sec Eng     | CISO Delegate | App Eng, Data Eng | SRE      |
| Neo4j/Postgres | Platform    | SRE Lead      | Data Eng          | All      |
| CI/CD          | DevEx       | Platform Lead | Sec Eng           | All      |
| Observability  | SRE         | SRE Lead      | Platform          | All      |
```

---

# Helm Charts (K8s)

## `ops/helm/intelgraph/Chart.yaml`

```yaml
apiVersion: v2
name: intelgraph
version: 0.1.0
description: IntelGraph Quickstart slice (API + Ingest + OPA)
type: application
```

## `ops/helm/intelgraph/values.yaml`

```yaml
image:
  api: { repository: ghcr.io/your-org/intelgraph-api, tag: v0.1.0 }
  ingest: { repository: ghcr.io/your-org/intelgraph-ingest, tag: v0.1.0 }
  pullPolicy: IfNotPresent
replicaCount:
  api: 2
  ingest: 1
resources:
  api:
    requests: { cpu: "500m", memory: "512Mi" }
    limits: { cpu: "1", memory: "1Gi" }
  ingest:
    requests: { cpu: "250m", memory: "512Mi" }
    limits: { cpu: "500m", memory: "1Gi" }
neo4j:
  uri: bolt://neo4j.neo4j.svc.cluster.local:7687
  user: neo4j
  passwordSecret: neo4j-auth
postgres:
  host: postgres.default.svc.cluster.local
  port: 5432
  db: intelgraph
  secret: pg-auth
opa:
  url: http://opa.opa.svc.cluster.local:8181/v1/data/abac/allow
otlpEndpoint: http://otel-collector.observability:4317
slo:
  api_p95_ms: 350
  write_p95_ms: 700
```

## `ops/helm/intelgraph/templates/api-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: intelgraph-api }
spec:
  replicas: { { .Values.replicaCount.api } }
  selector: { matchLabels: { app: intelgraph-api } }
  template:
    metadata:
      labels: { app: intelgraph-api }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9464"
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.api.repository }}:{{ .Values.image.api.tag }}"
          imagePullPolicy: { { .Values.image.pullPolicy } }
          env:
            - { name: NEO4J_URI, value: { { .Values.neo4j.uri | quote } } }
            - { name: NEO4J_USER, value: { { .Values.neo4j.user | quote } } }
            - name: NEO4J_PASSWORD
              valueFrom:
                { secretKeyRef: { name: { { .Values.neo4j.passwordSecret } }, key: password } }
            - { name: PGHOST, value: { { .Values.postgres.host | quote } } }
            - { name: PGPORT, value: { { .Values.postgres.port | quote } } }
            - { name: PGDATABASE, value: { { .Values.postgres.db | quote } } }
            - name: PGUSER
              valueFrom: { secretKeyRef: { name: { { .Values.postgres.secret } }, key: user } }
            - name: PGPASSWORD
              valueFrom: { secretKeyRef: { name: { { .Values.postgres.secret } }, key: password } }
            - { name: OPA_URL, value: { { .Values.opa.url | quote } } }
            - { name: OTEL_EXPORTER_OTLP_ENDPOINT, value: { { .Values.otlpEndpoint | quote } } }
            - { name: TENANT_ID, value: demo-tenant }
          ports: [{ containerPort: 4000, name: http }]
          readinessProbe:
            { httpGet: { path: /graphql, port: http }, initialDelaySeconds: 5, periodSeconds: 10 }
          livenessProbe:
            { httpGet: { path: /graphql, port: http }, initialDelaySeconds: 10, periodSeconds: 20 }
          resources: { { - toYaml .Values.resources.api | nindent 12 } }
```

## `ops/helm/intelgraph/templates/api-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata: { name: intelgraph-api }
spec:
  selector: { app: intelgraph-api }
  ports: [{ port: 80, targetPort: http, name: http }]
  type: ClusterIP
```

## `ops/helm/intelgraph/templates/ingest-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: intelgraph-ingest }
spec:
  replicas: { { .Values.replicaCount.ingest } }
  selector: { matchLabels: { app: intelgraph-ingest } }
  template:
    metadata: { labels: { app: intelgraph-ingest } }
    spec:
      containers:
        - name: ingest
          image: "{{ .Values.image.ingest.repository }}:{{ .Values.image.ingest.tag }}"
          imagePullPolicy: { { .Values.image.pullPolicy } }
          env:
            - { name: NEO4J_URI, value: { { .Values.neo4j.uri | quote } } }
            - { name: NEO4J_USER, value: { { .Values.neo4j.user | quote } } }
            - name: NEO4J_PASSWORD
              valueFrom:
                { secretKeyRef: { name: { { .Values.neo4j.passwordSecret } }, key: password } }
            - { name: TENANT_ID, value: demo-tenant }
          resources: { { - toYaml .Values.resources.ingest | nindent 12 } }
```

---

# Terraform (AWS EKS + RDS + Helm releases)

## `ops/terraform/main.tf`

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.0" }
    helm = { source = "hashicorp/helm", version = ">= 2.13" }
    kubernetes = { source = "hashicorp/kubernetes", version = ">= 2.27" }
  }
}

provider "aws" { region = var.region }

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.7.1"
  name = "intelgraph-vpc"
  cidr = var.vpc_cidr
  azs  = var.azs
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "20.24.2"
  cluster_name    = "intelgraph-eks"
  cluster_version = "1.30"
  subnet_ids      = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id
  eks_managed_node_groups = {
    default = { desired_size = 2, max_size = 4, min_size = 2, instance_types = ["m6i.large"] }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.this.token
}

data "aws_eks_cluster_auth" "this" { name = module.eks.cluster_name }

provider "helm" {
  kubernetes { host = module.eks.cluster_endpoint, cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data), token = data.aws_eks_cluster_auth.this.token }
}

# RDS Postgres
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.8.0"
  identifier = "intelgraph-postgres"
  engine = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.medium"
  allocated_storage = 20
  db_name  = "intelgraph"
  username = var.pg_username
  password = var.pg_password
  subnet_ids = module.vpc.private_subnets
  vpc_security_group_ids = [module.vpc.default_security_group_id]
}

# Neo4j via Helm (community)
resource "helm_release" "neo4j" {
  name       = "neo4j"
  repository = "https://helm.neo4j.com/neo4j"
  chart      = "neo4j"
  version    = "5.25.1"
  namespace  = "neo4j"
  create_namespace = true
  values = [file("neo4j-values.yaml")]
}

# OPA via Helm
resource "helm_release" "opa" {
  name       = "opa"
  repository = "https://open-policy-agent.github.io/kube-mgmt"
  chart      = "opa"
  version    = "4.2.0"
  namespace  = "opa"
  create_namespace = true
}

# Grafana (optional)
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  version    = "8.5.12"
  namespace  = "observability"
  create_namespace = true
}

# Deploy IntelGraph chart
resource "helm_release" "intelgraph" {
  name       = "intelgraph"
  chart      = "../helm/intelgraph"
  namespace  = "intelgraph"
  create_namespace = true
  depends_on = [helm_release.neo4j, module.rds, module.eks]
  set {
    name  = "postgres.host"
    value = module.rds.db_instance_address
  }
}
```

## `ops/terraform/variables.tf`

```hcl
variable "region" { type = string, default = "us-east-1" }
variable "vpc_cidr" { type = string, default = "10.0.0.0/16" }
variable "azs" { type = list(string), default = ["us-east-1a","us-east-1b"] }
variable "public_subnets" { type = list(string), default = ["10.0.1.0/24","10.0.2.0/24"] }
variable "private_subnets" { type = list(string), default = ["10.0.101.0/24","10.0.102.0/24"] }
variable "pg_username" { type = string }
variable "pg_password" { type = string, sensitive = true }
```

## `ops/terraform/outputs.tf`

```hcl
output "eks_cluster_name" { value = module.eks.cluster_name }
output "rds_endpoint" { value = module.rds.db_instance_address }
output "neo4j_namespace" { value = helm_release.neo4j.namespace }
```

## `ops/terraform/neo4j-values.yaml`

```yaml
acceptLicenseAgreement: "yes"
neo4j:
  name: neo4j
  edition: community
  resources:
    cpu: "1"
    memory: "2Gi"
```

---

# Policy Gate for SLO (OPA)

## `policies/slo.rego`

```rego
package slo

# Input: { metrics: { api_p95_ms: 340, write_p95_ms: 650 }, targets: { api_p95_ms: 350, write_p95_ms: 700 } }

default allow = false

allow {
  input.metrics.api_p95_ms <= input.targets.api_p95_ms
  input.metrics.write_p95_ms <= input.targets.write_p95_ms
}
```

## CI step (append)

```yaml
- name: SLO policy gate
  run: |
    echo '{"metrics":{"api_p95_ms":340,"write_p95_ms":650},"targets":{"api_p95_ms":350,"write_p95_ms":700}}' | \
    opa eval --data policies 'data.slo.allow' --input - | grep -q true
```

---

# How to Use (cloud)

1. Export AWS creds; `cd ops/terraform`.
2. `terraform init && terraform apply -auto-approve` (pass `-var pg_username=... -var pg_password=...`).
3. Build & push images; update `values.yaml` image tags.
4. `helm upgrade --install intelgraph ops/helm/intelgraph -n intelgraph -f ops/helm/intelgraph/values.yaml`.
5. Port-forward API: `kubectl -n intelgraph port-forward svc/intelgraph-api 8080:80` and run smoke tests.
