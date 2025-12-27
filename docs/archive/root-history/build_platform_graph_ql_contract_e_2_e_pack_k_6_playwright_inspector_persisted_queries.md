# GraphQL Contract & E2E Pack

#

# Files are separated by `=== FILE: <path> ===`.

# Includes: GraphQL k6 scenarios, Playwright e2e smoke against preview URL,

# schema diff checks via graphql-inspector, and persisted-queries tooling + policy.

=== FILE: tests/k6/graphql-canary.js ===
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
vus: 20,
duration: '2m',
thresholds: {
http_req_failed: ['rate<0.01'],
http_req_duration: ['p(95)<700', 'p(99)<1500']
}
};

const ENDPOINT = `${__ENV.GRAPHQL_URL || 'http://localhost:8080'}/graphql`;

const GET_DASHBOARD = `query GetUserDashboard($id: ID!) {
  user(id: $id) { id name widgets { id type } alerts { level message } }
}`;

const CREATE_NOTE = `mutation CreateNote($input: NoteInput!) { createNote(input: $input) { id text } }`;

export default function () {
const headers = { 'Content-Type': 'application/json' };

const q = http.post(ENDPOINT, JSON.stringify({ query: GET_DASHBOARD, variables: { id: 'seed-user-1' } }), { headers });
check(q, {
'dashboard OK': (r) => r.status === 200 && r.json('data.user.id') !== undefined,
});

const m = http.post(ENDPOINT, JSON.stringify({ query: CREATE_NOTE, variables: { input: { text: `canary-${__VU}-${Date.now()}` } } }), { headers });
check(m, {
'createNote OK': (r) => r.status === 200 && r.json('data.createNote.id') !== undefined,
});

sleep(1);
}

=== FILE: .github/workflows/e2e-playwright.yml ===
name: e2e-playwright
on:
workflow_dispatch:
inputs:
baseURL:
description: 'Preview Base URL (e.g., https://pr-123.preview.app)'
required: true
permissions: { contents: read }
jobs:
e2e:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with: { node-version: 20 } - run: corepack enable && corepack prepare pnpm@latest --activate - run: pnpm install --frozen-lockfile - name: Install browsers
run: pnpm exec playwright install --with-deps - name: Run Playwright
env:
BASE_URL: ${{ inputs.baseURL }}
GRAPHQL_URL: ${{ inputs.baseURL }}/graphql
run: pnpm exec playwright test --reporter=list - uses: actions/upload-artifact@v4
if: always()
with:
name: playwright-report
path: playwright-report

=== FILE: playwright.config.ts ===
import { defineConfig } from '@playwright/test';

export default defineConfig({
timeout: 30_000,
retries: 1,
use: {
baseURL: process.env.BASE_URL || 'http://localhost:3000',
trace: 'retain-on-failure',
},
reporter: [['html', { outputFolder: 'playwright-report' }], ['list']]
});

=== FILE: tests/e2e/smoke.spec.ts ===
import { test, expect, request } from '@playwright/test';

const gql = async (rq: any, query: string, variables?: any) => {
const res = await rq.post(`${process.env.GRAPHQL_URL || process.env.BASE_URL + '/graphql'}`, {
data: { query, variables },
});
expect(res.ok()).toBeTruthy();
const json = await res.json();
expect(json.errors).toBeFalsy();
return json.data;
};

test('home loads', async ({ page }) => {
await page.goto('/');
await expect(page).toHaveTitle(/IntelGraph|Dashboard/i);
});

test('GraphQL smoke — dashboard and create note', async ({ request }) => {
const data1 = await gql(request, `query($id: ID!){ user(id:$id){ id name } }`, { id: 'seed-user-1' });
expect(data1.user.id).toBeTruthy();
const note = await gql(request, `mutation($t:String!){ createNote(input:{text:$t}){ id text } }`, { t: `pw-${Date.now()}` });
expect(note.createNote.id).toBeTruthy();
});

=== FILE: tools/graphql/schema-check.mjs ===
#!/usr/bin/env node
import { diff } from '@graphql-inspector/core';
import fs from 'node:fs';
import { parse } from 'graphql';

const nextSDL = fs.readFileSync('schema/schema.graphql', 'utf8');
const baseSDL = fs.readFileSync('schema/baseline.graphql', 'utf8');

const changes = await diff(parse(baseSDL), parse(nextSDL));
const breaking = changes.filter((c) => c.criticality?.level === 'BREAKING');
for (const c of breaking) console.error(`[BREAKING] ${c.path} — ${c.message}`);
if (breaking.length) process.exit(1);
console.log('No breaking schema changes.');

=== FILE: .github/workflows/graphql-contract.yml ===
name: graphql-contract
on:
pull_request:
paths: - 'schema/**' - 'apps/**/schema/**' - 'services/**/schema/\*\*'
permissions: { contents: read }
jobs:
check:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with: { node-version: 20 } - run: corepack enable && corepack prepare pnpm@latest --activate - run: pnpm install --frozen-lockfile - run: pnpm add -Dw @graphql-inspector/core graphql - run: node tools/graphql/schema-check.mjs

=== FILE: schema/baseline.graphql ===

# Placeholder: commit a known-good baseline schema here.

# Update this through a dedicated PR when intentionally breaking.

type Query { health: Health! user(id: ID!): User }

type Mutation { createNote(input: NoteInput!): Note! }

type Health { ok: Boolean! }

type User { id: ID! name: String! widgets: [Widget!]! alerts: [Alert!]! }

type Widget { id: ID! type: String! }

type Alert { level: String! message: String! }

input NoteInput { text: String! }

type Note { id: ID! text: String! }

=== FILE: tools/pq/build-manifest.mjs ===
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = 'persisted';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.graphql'));
const manifest = {};
for (const f of files) {
const query = fs.readFileSync(path.join(dir, f), 'utf8').trim();
const sha = crypto.createHash('sha256').update(query).digest('hex');
manifest[sha] = query;
}
fs.writeFileSync('persisted/manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest for ${files.length} queries.`);

=== FILE: persisted/queries/GetUserDashboard.graphql ===
query GetUserDashboard($id: ID!) {
user(id: $id) { id name widgets { id type } alerts { level message } }
}

=== FILE: persisted/mutations/CreateNote.graphql ===
mutation CreateNote($input: NoteInput!) { createNote(input: $input) { id text } }

=== FILE: .github/workflows/persisted-queries.yml ===
name: persisted-queries
on:
push:
paths: - 'persisted/**/\*.graphql'
pull_request:
paths: - 'persisted/**/\*.graphql'
permissions: { contents: write }
jobs:
build-manifest:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with: { node-version: 20 } - run: node tools/pq/build-manifest.mjs - uses: stefanzweifel/git-auto-commit-action@v5
with:
commit_message: 'chore(pq): update persisted manifest'
file_pattern: persisted/manifest.json

=== FILE: docs/persisted-queries.md ===

# Persisted Queries — Policy & Runtime

**Policy**

- Production GraphQL must only accept requests with `extensions.persistedQuery.sha256Hash` that match `persisted/manifest.json` built at CI.
- Non-persisted queries allowed only in `NODE_ENV!=production` or behind a feature flag.

**Runtime (Node/Apollo example)**

```ts
// middleware example (pseudocode)
import manifest from '../persisted/manifest.json';

app.use('/graphql', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const ext = req.body?.extensions?.persistedQuery;
  if (!ext?.sha256Hash)
    return res.status(400).json({ error: 'PersistedQueryRequired' });
  const query = manifest[ext.sha256Hash];
  if (!query) return res.status(400).json({ error: 'UnknownPersistedQuery' });
  req.body.query = query; // inject and continue
  next();
});
```

**Client**

- Send `{"extensions":{"persistedQuery":{"version":1,"sha256Hash":"…"}},"variables":{...}}`

**CI**

- `persisted-queries.yml` keeps `manifest.json` up to date; attach to release artifacts.

=== FILE: .github/workflows/k6-graphql-canary.yml ===
name: k6-graphql-canary
on:
workflow_dispatch:
inputs:
graphqlUrl:
description: 'GraphQL endpoint base URL (e.g., https://api.staging.example.com/graphql)'
required: true
permissions: { contents: read }
jobs:
k6:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: grafana/setup-k6-action@v1 - name: Run k6 GraphQL canary
env:
GRAPHQL_URL: ${{ inputs.graphqlUrl }}
run: k6 run tests/k6/graphql-canary.js
