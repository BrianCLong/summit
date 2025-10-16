# Sprint 14 — Implementation Scaffolding (code)

This doc packages ready-to-drop scaffolds for the thin vertical we’re shipping in Sprint 14. Paths are relative to repo root. Each block compiles/runs with minimal stubbing so the team can branch and fill in data sources.

---

## 1) Repo layout

```
intelgraph/
  apps/
    gateway/            # Apollo Server + OPA + persisted queries + cost guard
    prov-ledger/        # Evidence register + manifest + bundler (Node/TS + Postgres + S3)
    web/                # React/MUI app with Cytoscape + Mapbox + vis-timeline (jQuery overlays)
  services/
    graph/              # Neo4j access + claim ingestion
    sandbox-orch/       # Ephemeral Neo4j orchestration for NL→Cypher
  tools/
    verifier-cli/       # Python verifier for disclosure bundles
    load/               # k6 scripts
  deploy/
    helm/               # Charts for apps/services
    prometheus/
      alerts/           # SLO + budget alerts
  .github/workflows/ci.yml
```

---

## 2) prov-ledger service (Node 18 + TS + Postgres + S3)

**`apps/prov-ledger/package.json`**

```json
{
  "name": "prov-ledger",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js",
    "db:up": "psql $DATABASE_URL -f db/schema.sql"
  },
  "dependencies": {
    "archiver": "^6",
    "aws-sdk": "^2",
    "@aws-sdk/client-s3": "^3",
    "@aws-sdk/s3-request-presigner": "^3",
    "express": "^4",
    "express-validator": "^7",
    "helmet": "^7",
    "morgan": "^1",
    "pg": "^8",
    "uuid": "^9"
  },
  "devDependencies": {
    "typescript": "^5",
    "ts-node-dev": "^2",
    "@types/express": "^4",
    "@types/morgan": "^1"
  }
}
```

**`apps/prov-ledger/src/index.ts`**

```ts
import express from 'express';
import { Pool } from 'pg';
import helmet from 'helmet';
import morgan from 'morgan';
import { body, validationResult } from 'express-validator';
import { buildManifest } from './manifest.js';
import { packBundle } from './zipper.js';
import { signBytes, verifyEnv } from './signer.js';
import { uploadStreamGetUrl } from './storage.js';

verifyEnv();
const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(helmet());
app.use(morgan('combined'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.post(
  '/evidence/register',
  body('caseId').isString().notEmpty(),
  body('checksum').isString().isLength({ min: 64, max: 64 }),
  body('license').isString().notEmpty(),
  body('transforms').isArray(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { caseId, checksum, license, transforms, metadata } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO evidence(case_id, checksum, license, transforms, metadata)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [
          caseId,
          checksum,
          license,
          JSON.stringify(transforms),
          metadata || null,
        ],
      );
      await client.query('COMMIT');
      res.status(201).json({ id: rows[0].id });
    } catch (e) {
      await client.query('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error(e);
      res.status(500).json({ error: 'evidence_register_failed' });
    } finally {
      client.release();
    }
  },
);

app.post('/bundle/export', async (req, res) => {
  const { caseId } = req.body || {};
  if (!caseId) return res.status(400).json({ error: 'caseId_required' });
  const client = await pool.connect();
  try {
    const { rows: ev } = await client.query(
      `SELECT id, checksum, license, transforms FROM evidence WHERE case_id=$1`,
      [caseId],
    );
    const manifest = await buildManifest(caseId, ev);
    const signature = await signBytes(Buffer.from(JSON.stringify(manifest)));
    const { stream, finalize } = packBundle(manifest, signature, ev);
    const url = await uploadStreamGetUrl(
      `bundles/${caseId}/${manifest.id}.zip`,
      stream,
    );
    await finalize();
    res.json({ url, manifestId: manifest.id });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ error: 'bundle_export_failed' });
  } finally {
    client.release();
  }
});

app.get('/healthz', (_req, res) => res.send('ok'));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`prov-ledger listening on :${port}`));
```

**`apps/prov-ledger/src/manifest.ts`** (Merkle manifest)

```ts
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

type EvidenceRow = {
  id: string;
  checksum: string;
  license: string;
  transforms: any;
};
export type Manifest = {
  id: string;
  caseId: string;
  createdAt: string;
  files: { path: string; sha256: string }[];
  transforms: Record<string, any>[];
  merkleRoot: string;
  signer: { alg: 'ed25519'; keyId: string };
};

export async function buildManifest(
  caseId: string,
  ev: EvidenceRow[],
): Promise<Manifest> {
  const files = ev.map((e) => ({
    path: `evidence/${e.id}.bin`,
    sha256: e.checksum,
  }));
  const hashes = files.map((f) => Buffer.from(f.sha256, 'hex'));
  const merkleRoot = merkle(hashes).toString('hex');
  return {
    id: uuidv4(),
    caseId,
    createdAt: new Date().toISOString(),
    files,
    transforms: ev.flatMap((e) =>
      Array.isArray(e.transforms) ? e.transforms : [],
    ),
    merkleRoot,
    signer: { alg: 'ed25519', keyId: process.env.SIGNING_KEY_ID! },
  };
}

function merkle(leaves: Buffer[]): Buffer {
  if (leaves.length === 0) return Buffer.alloc(32);
  let layer = leaves.map((b) => b);
  while (layer.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(
        crypto
          .createHash('sha256')
          .update(Buffer.concat([left, right]))
          .digest(),
      );
    }
    layer = next;
  }
  return layer[0];
}
```

**`apps/prov-ledger/src/zipper.ts`** (streaming ZIP)

```ts
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { Manifest } from './manifest.js';

export function packBundle(
  manifest: Manifest,
  signature: Buffer,
  evRows: any[],
) {
  const stream = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(stream);
  archive.append(Buffer.from(JSON.stringify(manifest, null, 2)), {
    name: 'manifest.json',
  });
  archive.append(signature, { name: 'manifest.sig' });
  for (const e of evRows) {
    // In real system stream blobs from object store
    archive.append(Buffer.from('placeholder'), {
      name: `evidence/${e.id}.bin`,
    });
  }
  const finalize = () => archive.finalize();
  return {
    stream,
    finalize: async () => {
      await finalize();
    },
  };
}
```

**`apps/prov-ledger/src/signer.ts`** (Ed25519 signing)

```ts
import crypto from 'crypto';
export function verifyEnv() {
  [
    'DATABASE_URL',
    'SIGNING_PRIVATE_KEY_PEM',
    'SIGNING_KEY_ID',
    'BUNDLE_BUCKET',
  ].forEach((k) => {
    if (!process.env[k]) throw new Error(`Missing env ${k}`);
  });
}
export async function signBytes(data: Buffer): Promise<Buffer> {
  const privateKey = crypto.createPrivateKey(
    process.env.SIGNING_PRIVATE_KEY_PEM!,
  );
  return crypto.sign(null, data, privateKey);
}
```

**`apps/prov-ledger/src/storage.ts`** (S3 client)

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
export async function uploadStreamGetUrl(key: string, body: Readable) {
  const bucket = process.env.BUNDLE_BUCKET!;
  // Buffering stream for simplicity; swap for multipart upload in prod
  const chunks: Buffer[] = [];
  for await (const c of body) chunks.push(Buffer.from(c));
  const blob = Buffer.concat(chunks);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: blob }));
  return await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key }),
    {
      expiresIn: 300,
    },
  );
}
```

**`apps/prov-ledger/db/schema.sql`**

```sql
create extension if not exists pgcrypto;
create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  checksum char(64) not null,
  license text not null,
  transforms jsonb not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

**Env**

```
DATABASE_URL=postgres://user:pass@host:5432/db
SIGNING_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
SIGNING_KEY_ID=prod-key-2025-08
BUNDLE_BUCKET=intelgraph-bundles
AWS_REGION=us-east-1
```

---

## 3) Gateway (Apollo + OPA + Persisted + Cost Guard)

**`apps/gateway/package.json`**

```json
{
  "name": "gateway",
  "version": "0.1.0",
  "type": "module",
  "scripts": { "dev": "ts-node-dev src/server.ts" },
  "dependencies": {
    "@apollo/server": "^4",
    "@graphql-tools/schema": "^10",
    "express": "^4",
    "node-fetch": "^3"
  },
  "devDependencies": { "typescript": "^5", "ts-node-dev": "^2" }
}
```

**`apps/gateway/src/server.ts`**

```ts
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { GraphQLRequestContext } from '@apollo/server';

const typeDefs = readFileSync('schema.graphql', 'utf8');
const resolvers = {
  Query: { caseEvidence: async () => [], claims: async () => [] },
};
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function opaAllow(
  ctx: any,
  opName: string,
  fields: string[],
  labels: any,
) {
  const res = await fetch(
    process.env.OPA_URL || 'http://opa:8181/v1/data/intelgraph/authz/allow',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: {
          user: ctx.user,
          operation: opName,
          fields,
          labels,
          reason: ctx.reason,
        },
      }),
    },
  );
  const json: any = await res.json();
  return json.result === true;
}

function estimateCost(query: string) {
  return Math.min(5000, (query.match(/[{]/g) || []).length * 50);
}

const app = express();
app.use((req: any, _res, next) => {
  req.user = { sub: 'demo', roles: ['analyst'] };
  req.reason = req.header('X-Reason-For-Access') || undefined;
  next();
});

const server = new ApolloServer({
  schema,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation(ctx) {
            const opName = ctx.operationName || 'Anonymous';
            const doc = ctx.request.query || '';
            const cost = estimateCost(doc);
            if (cost > 2000) throw new Error('query_budget_exceeded');
            const fields = Array.from(
              new Set(doc.match(/\b\w+\b/g) || []),
            ).slice(0, 200);
            const labels = {}; // derive from persisted query metadata in prod
            const ok = await opaAllow(ctx.contextValue, opName, fields, labels);
            if (!ok) throw new Error('policy_denied');
          },
        };
      },
    },
  ],
});

await server.start();
app.use(
  '/graphql',
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({
      user: (req as any).user,
      reason: (req as any).reason,
    }),
  }),
);
app.listen(9000, () => console.log('gateway :9000'));
```

**`apps/gateway/schema.graphql`**

```graphql
scalar JSON

type Evidence {
  id: ID!
  caseId: String!
  checksum: String!
  license: String!
  transforms: JSON
  createdAt: String!
}

type Claim {
  id: ID!
  text: String!
  confidence: Float
  sources: [Evidence!]!
  createdAt: String!
}

type Query {
  caseEvidence(caseId: String!): [Evidence!]!
  claims(caseId: String!): [Claim!]!
}
```

**`apps/gateway/policy/intelgraph.rego`**

```rego
package intelgraph.authz

default allow = false

# analysts cannot access fields tagged sensitivity
allow {
  input.user.roles[_] == "analyst"
  not denied_field
}

denied_field {
  some f
  input.query.fields[f] == "sensitivity"
}

# need_to_know requires justification
allow {
  input.labels.need_to_know
  input.reason != ""
}
```

---

## 4) Neo4j: Claims & Contradictions

**`services/graph/src/claims.ts`**

```ts
import { Driver } from 'neo4j-driver';
export class ClaimRepo {
  constructor(private driver: Driver) {}
  async upsertClaim(
    caseId: string,
    text: string,
    confidence: number,
    sourceEvidenceIds: string[],
  ) {
    const session = this.driver.session();
    try {
      const res = await session.executeWrite((tx) =>
        tx.run(
          `MERGE (c:Claim {text:$text, caseId:$caseId})
         ON CREATE SET c.createdAt = timestamp(), c.confidence=$confidence
         WITH c
         UNWIND $eids as eid
         MATCH (e:Evidence {id:eid})
         MERGE (e)-[:SUPPORTS]->(c)
         RETURN c`,
          { caseId, text, confidence, eids: sourceEvidenceIds },
        ),
      );
      return res.records[0]?.get('c');
    } finally {
      await session.close();
    }
  }
  async linkContradiction(claimIdA: string, claimIdB: string) {
    const s = this.driver.session();
    try {
      await s.executeWrite((tx) =>
        tx.run(
          `MATCH (a:Claim {id:$a}), (b:Claim {id:$b}) MERGE (a)-[:CONTRADICTS]->(b)`,
          {
            a: claimIdA,
            b: claimIdB,
          },
        ),
      );
    } finally {
      await s.close();
    }
  }
}
```

---

## 5) Sandbox Orchestrator (ephemeral Neo4j per run)

**`services/sandbox-orch/src/index.ts`**

```ts
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';

function sh(cmd: string, args: string[]): Promise<void> {
  return new Promise((ok, no) => {
    const p = execFile(cmd, args, (e) => (e ? no(e) : ok()));
    p.stdout?.pipe(process.stdout);
    p.stderr?.pipe(process.stderr);
  });
}

export async function createSandbox(ttlSec = 300) {
  const name = `neo4j-sbx-${randomUUID().slice(0, 8)}`;
  await sh('docker', [
    'run',
    '-d',
    '--rm',
    '--name',
    name,
    '-e',
    'NEO4J_AUTH=none',
    '-p',
    '0:7687',
    'neo4j:5',
  ]);
  setTimeout(async () => {
    try {
      await sh('docker', ['kill', name]);
    } catch {
      /*noop*/
    }
  }, ttlSec * 1000);
  return { name };
}
```

---

## 6) Verifier CLI (Python 3.12)

**`tools/verifier-cli/verify.py`**

```python
#!/usr/bin/env python3
import json, hashlib, zipfile, sys
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives import serialization

def main(path: str, pubkey_pem: str):
    with zipfile.ZipFile(path) as z:
        manifest = json.loads(z.read('manifest.json'))
        sig = z.read('manifest.sig')
        # verify signature
        pub = serialization.load_pem_public_key(pubkey_pem.encode())
        pub.verify(sig, json.dumps(manifest).encode())
        # verify files
        for f in manifest['files']:
            h = hashlib.sha256(z.read(f['path'])).hexdigest()
            assert h == f['sha256'], f"hash mismatch: {f['path']}"
    print('Valid')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: verify.py bundle.zip public_key.pem'); sys.exit(2)
    main(sys.argv[1], open(sys.argv[2]).read())
```

---

## 7) Web — Tri‑Pane shell + NL→Cypher (React 18 + MUI + Cytoscape + Mapbox + vis-timeline + jQuery)

**`apps/web/src/components/TriPaneShell.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import Cytoscape from 'cytoscape';
import $ from 'jquery';

export default function TriPaneShell() {
  const cyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = Cytoscape({
      container: cyRef.current,
      elements: [],
      style: [{ selector: 'node', style: { label: 'data(label)' } }],
    });
    // jQuery-driven tooltip overlay for provenance
    $(cyRef.current).on('mousemove', '.cy-node', function () {
      /* overlay positioning */
    });
    cy.on('mouseover', 'node', (e) => {
      const data: any = e.target.data();
      const tooltip = $('<div class="prov-tip"/>').text(
        `${data.source} · ${data.license} · conf ${data.confidence}`,
      );
      $('body').append(tooltip);
    });
    return () => cy.destroy();
  }, []);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateRows: '1fr 180px',
        gridTemplateColumns: '1fr 420px',
        gap: 1,
        height: '100vh',
      }}
    >
      <Box gridRow="1" gridColumn="1" id="graph">
        <div ref={cyRef} style={{ width: '100%', height: '100%' }} />
      </Box>
      <Box gridRow="1" gridColumn="2" id="map" />
      <Box gridRow="2" gridColumn="1/3" id="timeline" />
    </Box>
  );
}
```

**`apps/web/src/components/NlToCypher.tsx`**

```tsx
import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import $ from 'jquery';

export default function NlToCypher() {
  const [nl, setNl] = useState('find orgs linked to X after 2023');
  const [cypher, setCypher] = useState('');
  const [cost, setCost] = useState<number | undefined>();
  const onPreview = async () => {
    const r = await $.ajax({
      method: 'POST',
      url: '/api/nl-cypher/preview',
      contentType: 'application/json',
      data: JSON.stringify({ prompt: nl }),
    });
    setCypher(r.cypher);
    setCost(r.cost);
  };
  const onRun = async () => {
    const r = await $.ajax({
      method: 'POST',
      url: '/api/sandbox/run',
      contentType: 'application/json',
      data: JSON.stringify({ cypher }),
    });
    alert(`rows: ${r.rows?.length}`);
  };
  return (
    <Box>
      <TextField
        fullWidth
        value={nl}
        onChange={(e) => setNl(e.target.value)}
        label="Ask in natural language"
      />
      <Button onClick={onPreview}>Preview</Button>
      {cypher && (
        <>
          <Typography variant="caption">Estimated cost: {cost}</Typography>
          <pre>{cypher}</pre>
          <Button onClick={onRun}>Run in Sandbox</Button>
        </>
      )}
    </Box>
  );
}
```

---

## 8) OpenTelemetry + Prometheus + Alerts

**`deploy/prometheus/alerts/slo.yml`**

```yaml
groups:
  - name: gateway-slo
    rules:
      - alert: GraphQueryP95Burn
        expr: histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{job="gateway"}[5m])) by (le)) > 1.5
        for: 5m
        labels: { severity: page }
        annotations:
          { summary: 'p95 over SLO', description: 'Gateway p95 > 1.5s for 5m' }
      - alert: SlowQueryKillerFired
        expr: increase(gateway_query_killed_total[10m]) > 0
        for: 1m
        labels: { severity: warn }
```

---

## 9) k6 SLO profile

**`tools/load/slo.js`**

```js
import http from 'k6/http';
import { Trend } from 'k6/metrics';
export const options = { vus: 20, duration: '2m' };
const lat = new Trend('graph_latency');
export default function () {
  const r = http.post(
    'https://gw/graphql',
    JSON.stringify({ query: 'query{ claims(caseId:"C-1"){ id } }' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  lat.add(r.timings.duration);
}
```

---

## 10) Playwright E2E (happy path)

**`apps/web/tests/e2e/export.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('export disclosure bundle', async ({ page }) => {
  await page.goto('/cases/C-1');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByText('Disclosure Bundle').click();
  await expect(page.getByText('Export complete')).toBeVisible();
});
```

---

## 11) Helm values (snippets)

**`deploy/helm/values.yaml`**

```yaml
gateway:
  image: ghcr.io/brianclong/intelgraph-gateway:v0.14.0
  env:
    OPA_URL: http://opa:8181
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
provLedger:
  image: ghcr.io/brianclong/intelgraph-prov-ledger:v0.14.0
  env:
    DATABASE_URL: postgresql://...
    BUNDLE_BUCKET: intelgraph-bundles
```

---

## 12) GitHub Actions CI

**`.github/workflows/ci.yml`**

```yaml
name: ci
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npm -w apps/gateway test --if-present
      - run: npm -w apps/prov-ledger test --if-present
      - run: npm -w apps/web run build
      - name: Docker build
        run: |
          docker build -t ghcr.io/brianclong/intelgraph-gateway:${{ github.sha }} apps/gateway
          docker build -t ghcr.io/brianclong/intelgraph-prov-ledger:${{ github.sha }} apps/prov-ledger
```

---

## 13) Seed & Hardening

**Seed (scripts/seed.ts)**

```ts
// TODO Day-1: create case C-1, insert evidence rows, add two contradictory claims
```

**Pre-freeze checks**

- OPA dry-run report posted on all PRs (deny/allow counts)
- Bundle signature verified in CI with repo public key
- k6 SLO profile stored; trend compared to baseline
- Playwright E2E green against PR preview env
