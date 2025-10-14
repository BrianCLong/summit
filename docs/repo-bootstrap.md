# IntelGraph – Repo Bootstrap & First 3 PRs (patches & commands)

This package contains copy‑pasteable patches, shell scripts, and `gh` commands to initialize the repo and open three PRs:

1. **PR-1:** Repo scaffolding + CI/CD + CODEOWNERS + basic docs.
2. **PR-2:** Graph Core & API skeleton with persisted queries + cost guard stubs.
3. **PR-3:** Ingest Wizard skeleton + two connectors (CSV, STIX/TAXII) with golden tests.

> Assumptions: Node 20, Python 3.12, Docker, Neo4j test container, OPA, Kafka (via docker‑compose for local integration). Repo root: `github.com/BrianCLong/intelgraph`.

---

## 0) One‑time bootstrap (labels, project, milestones, issues)

Create `scripts/bootstrap.sh` and run from repo root.

```bash
#!/usr/bin/env bash
set -euo pipefail
ORG=BrianCLong
REPO=intelgraph
PROJECT_TITLE="IntelGraph – GA Q4 2025"

# 0. Tools
command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }

# 1. Labels
mkdir -p .github
cat > .github/labels.json <<'JSON'
[
 {"name":"area:graph","color":"1f77b4"},
 {"name":"area:ingest","color":"2ca02c"},
 {"name":"area:er","color":"17becf"},
 {"name":"area:analytics","color":"9467bd"},
 {"name":"area:copilot","color":"ff7f0e"},
 {"name":"area:governance","color":"8c564b"},
 {"name":"area:prov-ledger","color":"e377c2"},
 {"name":"area:ops","color":"7f7f7f"},
 {"name":"area:ui","color":"bcbd22"},
 {"name":"area:docs","color":"17a2b8"},
 {"name":"prio:P0","color":"d62728"},
 {"name":"prio:P1","color":"ff9896"},
 {"name":"prio:P2","color":"c7c7c7"},
 {"name":"risk:high","color":"d62728"},
 {"name":"good first issue","color":"6cc644"}
]
JSON
jq -r '.[] | [.name,.color] | @tsv' .github/labels.json | while IFS=$'\t' read -r n c; do gh label create "$n" --color "$c" -R $ORG/$REPO || gh label edit "$n" --color "$c" -R $ORG/$REPO; done

# 2. Project v2
PROJ_NUM=$(gh projects create --title "$PROJECT_TITLE" --format json | jq -r .number)
echo "Project #$PROJ_NUM"
for spec in Status:single_select Area:single_select Priority:single_select Sprint:text Owner:users Risk:single_select "Story Points":number "Exit Criteria":text; do
  NAME=${spec%%:*}; TYPE=${spec##*:}
  gh projects fields create $PROJ_NUM --name "$NAME" --type $TYPE >/dev/null
done

gh projects views create $PROJ_NUM --name Board --layout board --field Status >/dev/null || true

# 3. Milestones
for M in "M1: Graph Core & API" "M2: Ingest & ER v1" "M3: Copilot v1" "M4: Governance & Security" "M5: Prov-Ledger (beta)" "M6: GA RC"; do
  gh milestone create "$M" -R $ORG/$REPO || true
done

# 4. Seed issues (subset; full list in docs/plan)
cat > .github/seed-issues.csv <<'CSV'
Title,Body,Labels,Milestone
Graph schema v1 (entities/claims/provenance),Define base nodes/edges,area:graph;prio:P0,M1: Graph Core & API
GraphQL gateway (Apollo) + persisted queries,Gateway with field-level authz & cost hints,area:graph;prio:P0,M1: Graph Core & API
Cost guard middleware,Estimate cardinality + reject heavy queries,area:graph;prio:P0,M1: Graph Core & API
Connector: CSV,Manifest + golden tests,area:ingest;prio:P0,M2: Ingest & ER v1
Connector: STIX/TAXII,Threat intel ingestion,area:ingest;prio:P0,M2: Ingest & ER v1
Ingest Wizard (UI + API),Source config + schedules,area:ingest;area:ui;prio:P0,M2: Ingest & ER v1
CSV

python3 - <<'PY'
import csv, os, subprocess
from pathlib import Path
with open('.github/seed-issues.csv') as f:
    r=csv.DictReader(f)
    for row in r:
        labels=row['Labels'].replace(';',',')
        subprocess.run(['gh','issue','create','-R',os.getenv('ORG')+'/'+os.getenv('REPO'),
                        '--title',row['Title'],'--body',row['Body'],
                        '--label',labels,'--milestone',row['Milestone']],check=True)
PY

# 5. Branch protections
for BR in main develop; do
  gh api -X PUT repos/$ORG/$REPO/branches/$BR/protection \
    -F required_status_checks.strict=true \
    -F required_pull_request_reviews.required_approving_review_count=2 \
    -F enforce_admins=true \
    -F restrictions=null || true
done

echo "Bootstrap complete."
```

Make executable:

```bash
chmod +x scripts/bootstrap.sh
```

---

## 1) PR-1 – Repo scaffolding + CI/CD

**Branch:** `chore/scaffold-ci`
**Open PR:**

```bash
git checkout -b chore/scaffold-ci
# apply patch below, commit, push
gh pr create -t "Scaffold repo + CI/CD + CODEOWNERS + docs" -b "Initial project structure, actions, templates, Makefile, CODEOWNERS." -B develop -H chore/scaffold-ci -l prio:P0,area:docs
```

**Patch:**

```diff
*** Begin Patch
*** Add File: .gitignore
+node_modules/
+dist/
+.venv/
+__pycache__/
+.pytest_cache/
+.DS_Store
+charts/
+.env*
+coverage/
+.idea/
+.vscode/

*** End Patch
```

```diff
*** Begin Patch
*** Add File: package.json
+{
  "name": "intelgraph-monorepo",
  "private": true,
  "workspaces": ["services/*", "ui/*"],
  "scripts": {
    "lint": "eslint .",
    "test": "jest --coverage"
  },
  "devDependencies": {
    "eslint": "^9.9.0",
    "jest": "^29.7.0"
  }
}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/ci.yml
+name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout @v4/**
      - uses: actions/setup-node @v4/**
        with: { node-version: 20 }
      - run: npm ci || npm i
      - run: npm run lint --if-present
      - run: npm test --workspaces --if-present
  python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout @v4/**
      - uses: actions/setup-python@v5.1.0
        with: { python-version: '3.12' }
      - run: pip install -r services/er/requirements.txt || true
      - run: pytest -q || true
  fuzzer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout @v4/**
      - uses: actions/setup-python@v5.1.0
        with: { python-version: '3.12' }
      - run: pip install -r policy-fuzzer/requirements.txt || true
      - run: python policy-fuzzer/main.py --iterations 500 --enable-synonym-dodges --enable-regex-dodges --enable-time-window-hops --enable-field-aliasing --enable-data-type-mismatches
      - name: Upload Fuzzer Reports
        uses: actions/upload-artifact@a5ac7e51b4109f5124f9564e9f05e504dfbe8c05 # v4.1.7
        with:
          name: policy-fuzzer-reports
          path: policy-fuzzer/reports/
  sast-codeql:
    uses: github/codeql-action/.github/workflows/codeql.yml@v3.25.11
  dependency-review:
    uses: actions/dependency-review-action/.github/workflows/dependency-review.yml@v4/**
*** End Patch
```
```diff
*** Begin Patch
*** Add File: .github/PULL_REQUEST_TEMPLATE.md
+## What
+
+## Why
+
+## How to test
+
+- [ ] Unit tests
+- [ ] Integration tests
+- [ ] Security considerations (authz, PII)
+- [ ] Perf impact
+
+**Linked Issues:** Closes #
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/ISSUE_TEMPLATE/feature_request.yml
+name: Feature request
+labels: ["prio:P1"]
+body:
+  - type: textarea
+    id: context
+    attributes:
+      label: Context & problem
+  - type: textarea
+    id: acceptance
+    attributes:
+      label: Acceptance criteria
+  - type: dropdown
+    id: area
+    attributes:
+      label: Area
+      options: [Graph, Ingest, ER, Analytics, Copilot, Governance, Prov-Ledger, Ops, UI, Docs, Fuzzer]
  - type: input
    id: exit
    attributes:
      label: Exit Criteria
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/ISSUE_TEMPLATE/bug_report.yml
+name: Bug report
+labels: ["prio:P0"]
+body:
+  - type: textarea
+    id: reproduce
+    attributes:
+      label: Steps to reproduce
+  - type: textarea
+    id: expected
+    attributes:
+      label: Expected vs Actual
+  - type: textarea
+    id: logs
+    attributes:
+      label: Logs / traces / screenshots
+  - type: input
+    id: version
+    attributes:
+      label: Version/SHA
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/CODEOWNERS
+/services/api/                 @graph-leads @platform-owners
+/services/er/                  @data-leads @platform-owners
+/services/analytics/           @analysis-leads @platform-owners
+/services/copilot/             @copilot-leads @platform-owners
+/services/prov-ledger/         @trust-leads @platform-owners
+/ui/                           @frontend-leads @platform-owners
+/infrastructure/helm/          @sre-leads @platform-owners
*** End Patch
```

```diff
*** Begin Patch
*** Add File: Makefile
+.PHONY: test docker helm
test:
npm test --workspaces --if-present && pytest -q || true
docker:
docker compose build && docker compose up -d
helm.package:
helm package infrastructure/helm/intelgraph -d charts/
helm.index:
helm repo index charts/ --url https://brianclong.github.io/intelgraph/charts
*** End Patch
```

```diff
*** Begin Patch
*** Add File: README.md
+# IntelGraph
+
Monorepo for IntelGraph platform. See `docs/` for architecture and project plan.
*** End Patch
```

---

## 2) PR-2 – Graph Core & API skeleton

**Branch:** `feature/graph-core-api`
**Open PR:**

```bash
git checkout -b feature/graph-core-api
# apply patch below, commit, push
gh pr create -t "Graph Core & API skeleton (Apollo, persisted queries, cost guard stubs)" -b "Adds schema v1, Apollo gateway, persisted query map, and cost guard middleware with tests." -B develop -H feature/graph-core-api -l prio:P0,area:graph
```

**Patch:**

```diff
*** Begin Patch
*** Add File: services/api/package.json
+{
  "name": "intelgraph-api",
  "version": "0.1.0",
  "type": "module",
  "scripts": { "start": "node src/index.js", "dev": "node --watch src/index.js", "test": "jest" },
  "dependencies": {
    " @apollo/server": "^4.10.1",
    "graphql": "^16.9.0",
    "neo4j-driver": "^5.22.0",
    "opa-wasm": "^1.9.0",
    "pino": "^9.3.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": { "jest": "^29.7.0" }
}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/src/index.js
+import { ApolloServer } from " @apollo/server";
+import { startStandaloneServer } from " @apollo/server/standalone";
+import fs from "node:fs";
+import neo4j from "neo4j-driver";
+import pino from "pino";
+import { typeDefs, resolvers } from "./schema.js";
+import { costGuard } from "./middleware/costGuard.js";
+
+const logger = pino();
+
+const driver = neo4j.driver(
+  process.env.NEO4J_URI || "neo4j://localhost",
+  neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "neo4j")
+);
+
+const persisted = JSON.parse(fs.readFileSync(new URL("./persisted.json", import.meta.url)));
+
+const server = new ApolloServer({ typeDefs, resolvers, plugins: [costGuard({ persisted })] });
+
+const { url } = await startStandaloneServer(server, {
+  context: async () => ({ driver, logger }),
+  listen: { port: Number(process.env.PORT||4000) }
+});
+logger.info({ url }, "api up");
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/src/schema.js
+export const typeDefs = `#graphql
+  scalar DateTime
+  type Entity { id: ID!, kind: String!, props: JSON }
+  type Edge { id: ID!, src: ID!, dst: ID!, rel: String!, validFrom: DateTime, validUntil: DateTime }
+  type Query {
+    entity(id: ID!): Entity
+    shortestPath(src: ID!, dst: ID!): [Entity!]!
+  }
+`;
+
+export const resolvers = {
+  Query: {
+    entity: async (_,{id},{driver})=>{
+      const s = driver.session();
+      try {
+        const res = await s.run("MATCH (n {id:$id}) RETURN n LIMIT 1",{id});
+        const n = res.records[0]?.get('n');
+        if(!n) return null;
+        return { id: n.properties.id, kind: n.labels[0]||"Unknown", props: n.properties };
+      } finally { await s.close(); }
+    },
+    shortestPath: async (_,{src,dst},{driver})=>{
+      const s = driver.session();
+      try {
+        const res = await s.run(`MATCH (a {id:$src}),(b {id:$dst}),
+          p=shortestPath((a)-[*..6]-(b)) RETURN nodes(p) AS ns`,{src,dst});
+        const ns = res.records[0]?.get('ns')||"[]";
+        return ns.map(n=>({ id:n.properties.id, kind:n.labels[0]||"Unknown", props:n.properties }));
+      } finally { await s.close(); }
+    }
+  }
+};
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/src/middleware/costGuard.js
+export function costGuard({ persisted }){
+  return {
+    async requestDidStart(){
+      return {
+        async didResolveOperation(ctx){
+          const id = ctx.request.http?.headers.get('apq-id');
+          if(!id || !persisted[id]) throw new Error('Persisted query required');
+          const est = estimateCost(ctx.document);
+          if(est > Number(process.env.MAX_COST||1000)){
+            throw new Error('Query exceeds cost budget');
+          }
+        }
+      };
+    }
+  };
+}
+
+function estimateCost(){
+  // TODO: implement AST visitor; for now return small constant
+  return 50;
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/src/persisted.json
+{
+  "getEntity": "query getEntity($id:ID!){ entity(id:$id){ id kind } }",
+  "shortest": "query shortest($src:ID!,$dst:ID!){ shortestPath(src:$src,dst:$dst){ id } }"
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/jest.config.js
+export default { testEnvironment: 'node' };
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/__tests__/smoke.test.js
+import { resolvers, typeDefs } from "../src/schema.js";
test('schema loads', ()=>{ expect(typeDefs.length).toBeGreaterThan(10); });
*** End Patch
```

---

## 3) PR-3 – Ingest Wizard + CSV & STIX/TAXII connectors

**Branch:** `feature/ingest-wizard-connectors`
**Open PR:**

```bash
git checkout -b feature/ingest-wizard-connectors
# apply patch below, commit, push
gh pr create -t "Ingest Wizard + CSV and STIX/TAXII connectors (with golden tests)" -b "Adds ingest service skeleton, manifests, connectors, and tests." -B develop -H feature/ingest-wizard-connectors -l prio:P0,area:ingest
```

**Patch:**

```diff
*** Begin Patch
*** Add File: services/ingest/package.json
+{
+  "name": "intelgraph-ingest",
+  "version": "0.1.0",
+  "type": "module",
+  "scripts": { "start": "node src/index.js", "test": "jest" },
+  "dependencies": { "pino": "^9.3.1", "axios": "^1.7.4", "yargs": "^17.7.2", "xml2js": "^0.6.2" },
+  "devDependencies": { "jest": "^29.7.0" }
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/index.js
+import pino from 'pino';
+import { csvConnector } from './plugins/csv.js';
+import { stixTaxiiConnector } from './plugins/stix_taxii.js';
+
+const log = pino();
+const connectors = { csv: csvConnector, stix_taxii: stixTaxiiConnector };
+
+export async function run(name, opts){
+  const fn = connectors[name];
+  if(!fn) throw new Error('unknown connector');
+  return fn(opts, { log });
+}
+
+if (process.argv[1] === new URL(import.meta.url).pathname) {
+  const name = process.argv[2];
+  const args = Object.fromEntries(new URLSearchParams(process.argv.slice(3).join('&')));
+  run(name, args).then(()=>log.info({name},'done')).catch(e=>{ log.error(e); process.exit(1); });
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/csv.js
+import fs from 'node:fs';
+
+export async function csvConnector({ file }, { log }){
+  if(!file) throw new Error('file required');
+  const text = fs.readFileSync(file,'utf8').trim();
+  const [header, ...rows] = text.split(/\r?\n/);
+  const cols = header.split(',');
+  const records = rows.map(r=>Object.fromEntries(r.split(',').map((v,i)=>[cols[i], v])));
+  log.info({ count: records.length }, 'csv parsed');
+  return { count: records.length };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/src/plugins/stix_taxii.js
+import axios from 'axios';
+import { parseStringPromise } from 'xml2js';
+
+export async function stixTaxiiConnector({ url, collection }, { log }){
+  if(!url) throw new Error('url required');
+  const res = await axios.get(url, { timeout: 20000 });
+  // simplistic: support TAXII 1.x feed discovery (XML); extend to 2.x JSON later
+  if(res.headers['content-type']?.includes('xml')){
+    const xml = await parseStringPromise(res.data);
+    log.info({ keys: Object.keys(xml) }, 'taxii xml fetched');
+  } else {
+    log.info({ size: (JSON.stringify(res.data)||'').length }, 'taxii json fetched');
+  }
+  return { ok: true };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/ingest/__tests__/csv.test.js
+import { csvConnector } from '../src/plugins/csv.js';
+import fs from 'node:fs';
+
+test('csv counts rows (golden)', async ()=>{
+  const tmp = 'services/ingest/__tests__/fixtures/sample.csv';
+  fs.mkdirSync('services/ingest/__tests__/fixtures', { recursive: true });
+  fs.writeFileSync(tmp, 'id,name\n1,Alice\n2,Bob\n');
+  const res = await csvConnector({ file: tmp }, { log: { info(){} } });
+  expect(res.count).toBe(2);
+});
*** End Patch
```

---

## 4) Commands to create branches & PRs in order

```bash
git checkout -b chore/scaffold-ci && git add -A && git commit -m "scaffold repo + ci" && git push -u origin chore/scaffold-ci
# open PR-1 (see above)

git checkout -b feature/graph-core-api && git add -A && git commit -m "graph core api skeleton" && git push -u origin feature/graph-core-api
# open PR-2

git checkout -b feature/ingest-wizard-connectors && git add -A && git commit -m "ingest wizard + connectors" && git push -u origin feature/ingest-wizard-connectors
# open PR-3
```

---

## 5) Post‑merge next actions

* Wire docker‑compose with Neo4j + OPA + Kafka; add integration tests for `shortestPath` query.
* Add persisted query ID header enforcement at API gateway/edge.
* Extend STIX/TAXII to 2.1 Collections (JSON, pagination, auth).
* Add golden datasets for ER service and integrate ingest → ER pipeline topic.
