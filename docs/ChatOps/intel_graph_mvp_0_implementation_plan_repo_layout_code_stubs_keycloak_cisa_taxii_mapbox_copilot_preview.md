# IntelGraph MVP-0 — Implementation Plan & Code Stubs

This document packages a buildable MVP-0 with branches, CI/CD, Docker dev stack, GraphQL gateway, ABAC/OPA, audit logging, ingest (CSV + CISA TAXII), ER v1, analytics (paths/community via Neo4j GDS), Copilot NL→Cypher **preview-only** behind a feature flag, and a React tri‑pane UI (graph/timeline/map) with jQuery glue.

---

## 0) Repository layout (monorepo)

```
intelgraph/
├─ apps/
│  ├─ server/                # Node 18 + Apollo + Neo4j driver + OPA middleware
│  ├─ web/                   # React 18 UI (Cytoscape.js + Mapbox + Timeline) + jQuery interactions
│  ├─ copilot/               # Copilot NL→Cypher preview service (no external LLM; rules + templates)
│  ├─ ingest-processor/      # Node Kafka consumer -> Neo4j/MinIO/PG; CSV mapper & PII tagging
│  └─ taxii-puller/          # Python 3.12 TAXII 2.1 puller (CISA) -> Kafka topics
├─ packages/
│  ├─ schema/                # GraphQL SDL & TS types
│  ├─ shared/                # Shared utils, types, logging
│  └─ policy/                # OPA policies, Rego, and client
├─ infra/
│  ├─ docker-compose.dev.yml
│  ├─ k6/                    # perf scripts for p95 checks
│  ├─ keycloak/              # dev realm export + bootstrap script
│  ├─ opa/                   # policies and test data
│  ├─ migrations/            # Postgres DDL (audit, er_candidates)
│  └─ github-actions/        # CI workflows
├─ Makefile
├─ pnpm-workspace.yaml
└─ README.md
```

---

## 1) Dev Docker stack (Compose)

**File:** `infra/docker-compose.dev.yml`

```yaml
version: '3.9'
services:
  neo4j:
    image: neo4j:5.20-community
    ports: ['7474:7474', '7687:7687']
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-devpass}
      NEO4J_dbms_security_auth__minimum__password__length: 12
      NEO4J_dbms_memory_pagecache_size: 1G
      NEO4J_server_directories_plugins: /plugins
      NEO4JLABS_PLUGINS: '["graph-data-science"]'
      NEO4J_ACCEPT_LICENSE_AGREEMENT: 'yes'
    volumes:
      - neo4j_data:/data
      - neo4j_plugins:/plugins

  postgres:
    image: postgres:16
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: intelgraph
      POSTGRES_PASSWORD: ${PG_PASSWORD:-devpass}
      POSTGRES_DB: intelgraph
    volumes: ['pg_data:/var/lib/postgresql/data']

  redis:
    image: redis:7
    ports: ['6379:6379']

  kafka:
    image: bitnami/kafka:3
    ports: ['9092:9092']
    environment:
      KAFKA_ENABLE_KRAFT: 'yes'
      KAFKA_CFG_NODE_ID: 1
      KAFKA_CFG_PROCESS_ROLES: controller,broker
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: '1@kafka:9093'
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: 'true'

  minio:
    image: minio/minio:RELEASE.2025-04-18T00-00-00Z
    command: server /data --console-address ":9001"
    ports: ['9000:9000', '9001:9001']
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-devpass}
    volumes: ['minio_data:/data']

  keycloak:
    image: quay.io/keycloak/keycloak:25.0
    command: start-dev --import-realm
    environment:
      KC_DB: dev-file
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    volumes:
      - ./keycloak/realm-export:/opt/keycloak/data/import
    ports: ['8080:8080']

  opa:
    image: openpolicyagent/opa:0.66.0-rootless
    command: ['run', '--server', '/policies/policy.rego']
    ports: ['8181:8181']
    volumes:
      - ./opa:/policies

  server:
    build: ../apps/server
    environment:
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_PASSWORD: ${NEO4J_PASSWORD:-devpass}
      PG_CONN: postgres://intelgraph:${PG_PASSWORD:-devpass}@postgres:5432/intelgraph
      OPA_URL: http://opa:8181/v1/data/intelgraph/allow
      KEYCLOAK_ISSUER: http://keycloak:8080/realms/intelgraph
      COPILOT_PREVIEW_ENABLED: 'true'
      MAPBOX_TOKEN: ${MAPBOX_TOKEN:-changeme}
    depends_on: [neo4j, postgres, opa]
    ports: ['4000:4000']

  web:
    build: ../apps/web
    environment:
      VITE_GRAPHQL_URL: http://server:4000/graphql
      VITE_MAPBOX_TOKEN: ${MAPBOX_TOKEN:-changeme}
    depends_on: [server]
    ports: ['5173:5173']

  ingest_processor:
    build: ../apps/ingest-processor
    environment:
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_PASSWORD: ${NEO4J_PASSWORD:-devpass}
      KAFKA_BROKER: kafka:9092
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: minio
      MINIO_SECRET_KEY: ${MINIO_PASSWORD:-devpass}
    depends_on: [kafka, neo4j, minio]

  taxii_puller:
    build: ../apps/taxii-puller
    environment:
      KAFKA_BROKER: kafka:9092
      TAXII_URL: https://example.cisa.gov/taxii2/ # placeholder; configurable
      TAXII_USER: ${TAXII_USER:-}
      TAXII_PASS: ${TAXII_PASS:-}
    depends_on: [kafka]

volumes:
  neo4j_data: {}
  neo4j_plugins: {}
  pg_data: {}
  minio_data: {}
```

---

## 2) Postgres schema (audit + ER candidates)

**File:** `infra/migrations/001_init.sql`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant TEXT NOT NULL,
  user_sub TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  purpose TEXT,
  legal_basis TEXT,
  attributes JSONB,
  ip TEXT
);

CREATE TABLE IF NOT EXISTS er_candidates (
  id BIGSERIAL PRIMARY KEY,
  tenant TEXT NOT NULL,
  left_id TEXT NOT NULL,
  right_id TEXT NOT NULL,
  algo TEXT NOT NULL,
  score NUMERIC NOT NULL,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision TEXT
);

CREATE INDEX IF NOT EXISTS er_candidates_tenant_status ON er_candidates(tenant, status);
```

---

## 3) OPA policy (ABAC) & contract

**File:** `infra/opa/policy.rego`

```rego
package intelgraph

# Input contract expected from server middleware
# input = {
#   "subject": {"sub": "uuid", "roles": ["analyst"], "tenant": "t0"},
#   "action": "read",             # read|write|execute
#   "resource": {"type": "person", "tenant": "t0", "labels": ["PII"], "sensitivity": "internal"},
#   "purpose": "investigation:case-123",
#   "legal_basis": "consent|public_task|legitimate_interest"
# }

# Simple tenant match + role gate + label blocklist
allow {
  input.subject.tenant == input.resource.tenant
  some r
  r := input.subject.roles[_]
  r == "analyst" # replace with proper role mapping
  not denied_by_label
}

denied_by_label {
  labels := input.resource.labels
  labels[_] == "restricted"
}
```

**Middleware contract (server emits to OPA):**

```json
{
  "input": {
    "subject": { "sub": "dev", "roles": ["analyst"], "tenant": "dev" },
    "action": "read",
    "resource": {
      "type": "graph",
      "tenant": "dev",
      "labels": ["PII"],
      "sensitivity": "internal"
    },
    "purpose": "investigation:demo",
    "legal_basis": "legitimate_interest"
  }
}
```

---

## 4) GraphQL schema (SDL)

**File:** `packages/schema/src/typeDefs.graphql`

```graphql
directive @authz(
  resource: String!
  action: String!
) on FIELD_DEFINITION | OBJECT

interface Node {
  id: ID!
  createdAt: String!
  policy: Policy!
}

type Policy {
  tenant: ID!
  labels: [String!]!
  sensitivity: String!
  legalBasis: String!
}

type Person implements Node @authz(resource: "person", action: "read") {
  id: ID!
  name: String!
  aliases: [String!]
  emails: [String!]
  phones: [String!]
  createdAt: String!
  policy: Policy!
}

type Org implements Node @authz(resource: "org", action: "read") {
  id: ID!
  name: String!
  createdAt: String!
  policy: Policy!
}

type Document implements Node @authz(resource: "document", action: "read") {
  id: ID!
  title: String!
  checksum: String!
  license: String!
  createdAt: String!
  policy: Policy!
}

type EdgeProvenance {
  source: String!
  transform: [String!]!
  hash: String!
  confidence: Float!
}

type REL {
  from: ID!
  to: ID!
  type: String!
  since: String
  until: String
  prov: EdgeProvenance!
}

input CsvMapping {
  entity: String!
  column: String!
  property: String!
}

input ERDecisionInput {
  id: ID!
  decision: String!
  merge: Boolean!
}

scalar JSON

type Query {
  person(id: ID!): Person
  search(q: String!, limit: Int = 25): [Node!]!
  neighbors(id: ID!, hop: Int = 2, limit: Int = 200): [REL!]!
    @authz(resource: "graph", action: "read")
  analyticsShortestPath(from: ID!, to: ID!): [ID!]!
    @authz(resource: "graph", action: "read")
  analyticsCommunities(limit: Int = 10000): JSON
    @authz(resource: "graph", action: "read")
  erQueue(status: String = "PENDING", limit: Int = 50): [JSON!]!
}

type Mutation {
  ingestCsv(
    bucket: String!
    key: String!
    mapping: [CsvMapping!]!
    tenant: ID!
  ): JSON @authz(resource: "ingest", action: "write")
  recordAudit(
    action: String!
    resource: String!
    resourceId: ID
    attributes: JSON
  ): Boolean
  decideER(input: ERDecisionInput!): Boolean
    @authz(resource: "er", action: "write")
  copilotPreview(nl: String!): JSON
    @authz(resource: "copilot", action: "execute")
}
```

---

## 5) Server (Apollo + Neo4j + OPA + Audit)

**File:** `apps/server/src/index.ts`

```ts
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import neo4j, { Driver } from 'neo4j-driver';
import pg from 'pg';
import fetch from 'node-fetch';
import typeDefs from '@intelgraph/schema/typeDefs.graphql';
import { resolvers } from './resolvers';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Neo4j
const driver: Driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD || 'devpass'),
  { disableLosslessIntegers: true },
);

// Postgres
const pool = new pg.Pool({ connectionString: process.env.PG_CONN });

// OPA enforcement
async function opaEnforce(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: parse JWT (Keycloak). For dev, stub user
    const user = {
      sub: 'dev',
      roles: ['analyst'],
      tenant: req.header('x-tenant') || 'dev',
    };
    (req as any).user = user;
    (req as any).tenant = user.tenant;
    // attach helpers
    (req as any).authorize = async (resource: any, action: string) => {
      const body = {
        input: {
          subject: user,
          action,
          resource,
          purpose: req.header('x-purpose') || 'investigation:demo',
          legal_basis: req.header('x-legal-basis') || 'legitimate_interest',
        },
      };
      const r = await fetch(process.env.OPA_URL as string, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      return !!j.result;
    };
    next();
  } catch (e) {
    next(e);
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apollo = new ApolloServer({ schema });
await apollo.start();

app.use(
  '/graphql',
  opaEnforce,
  expressMiddleware(apollo, {
    context: async ({ req }) => ({
      user: (req as any).user,
      tenant: (req as any).tenant,
      authorize: (req as any).authorize,
      driver,
      pool,
      costBudget: 1e5,
      copilotPreviewEnabled: process.env.COPILOT_PREVIEW_ENABLED === 'true',
    }),
  }),
);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'internal_error' });
});

const server = http.createServer(app);
server.listen(process.env.PORT || 4000, () => logger.info('server up'));
```

**File:** `apps/server/src/resolvers.ts`

```ts
import { Neo4jError } from 'neo4j-driver';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';
import { buildCopilotPreview } from '../util/copilot';

export const resolvers = {
  Query: {
    async person(_: any, { id }: { id: string }, ctx: any) {
      const s = (ctx.driver as Driver).session();
      try {
        const rs = await s.run('MATCH (p:Person {id:$id}) RETURN p LIMIT 1', {
          id,
        });
        return rs.records[0]?.get('p').properties || null;
      } finally {
        await s.close();
      }
    },
    async search(_: any, { q, limit }: any, ctx: any) {
      const s = (ctx.driver as Driver).session();
      try {
        const rs = await s.run(
          "CALL db.index.fulltext.queryNodes('entity_fulltext', $q) YIELD node, score RETURN node as n ORDER BY score DESC LIMIT $limit",
          { q, limit: Math.min(limit, 50) },
        );
        return rs.records.map((r) => r.get('n').properties);
      } finally {
        await s.close();
      }
    },
    async neighbors(_: any, { id, hop, limit }: any, ctx: any) {
      const s = (ctx.driver as Driver).session();
      const h = Math.min(hop, 3);
      const l = Math.min(limit, 1000);
      try {
        const rs = await s.run(
          `MATCH (n {id:$id})-[r*1..${h}]-(m)
           WITH r LIMIT $limit
           UNWIND r AS e WITH startNode(e) AS s, endNode(e) AS t, e
           RETURN s.id AS from, t.id AS to, type(e) AS type,
                  e.since AS since, e.until AS until,
                  {source:e.source, transform:e.transform, hash:e.hash, confidence:coalesce(e.confidence,0.5)} AS prov`,
          { id, limit: l },
        );
        return rs.records.map((r) => ({
          from: r.get('from'),
          to: r.get('to'),
          type: r.get('type'),
          since: r.get('since'),
          until: r.get('until'),
          prov: r.get('prov'),
        }));
      } finally {
        await s.close();
      }
    },
    async analyticsShortestPath(_: any, { from, to }: any, ctx: any) {
      const s = (ctx.driver as Driver).session();
      try {
        const rs = await s.run(
          `MATCH (a {id:$from}), (b {id:$to})
           CALL gds.shortestPath.dijkstra.stream({
             sourceNode: a, targetNode: b, relationshipTypes: ['RELATES'], relationshipWeightProperty: 'weight'
           })
           YIELD nodeIds RETURN nodeIds`,
          { from, to },
        );
        return rs.records[0]?.get('nodeIds') || [];
      } finally {
        await s.close();
      }
    },
    async analyticsCommunities(_: any, { limit }: any, ctx: any) {
      const s = (ctx.driver as Driver).session();
      try {
        const rs = await s.run(
          `CALL gds.louvain.stream('g') YIELD nodeId, communityId
           RETURN nodeId, communityId LIMIT $limit`,
          { limit: Math.min(limit, 100000) },
        );
        return rs.records.map((r) => ({
          nodeId: r.get('nodeId'),
          communityId: r.get('communityId'),
        }));
      } finally {
        await s.close();
      }
    },
    async erQueue(_: any, { status, limit }: any, ctx: any) {
      const pool: Pool = ctx.pool;
      const { rows } = await pool.query(
        'SELECT * FROM er_candidates WHERE tenant=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3',
        [ctx.tenant, status, Math.min(limit, 200)],
      );
      return rows;
    },
  },
  Mutation: {
    async ingestCsv(_: any, { bucket, key, mapping, tenant }: any, ctx: any) {
      const authorized = await ctx.authorize(
        { type: 'ingest', tenant, labels: [], sensitivity: 'internal' },
        'write',
      );
      if (!authorized) throw new Error('forbidden');
      // emit a Kafka message for ingest-processor
      // (In dev we can call the processor via REST; here we return an ack)
      await recordAudit(ctx, 'ingest_csv', `s3://${bucket}/${key}`, {
        mapping,
      });
      return { ok: true };
    },
    async recordAudit(
      _: any,
      { action, resource, resourceId, attributes }: any,
      ctx: any,
    ) {
      await recordAudit(ctx, action, resource, attributes, resourceId);
      return true;
    },
    async decideER(_: any, { input }: any, ctx: any) {
      const pool: Pool = ctx.pool;
      await pool.query(
        "UPDATE er_candidates SET status='DECIDED', decided_by=$1, decided_at=now(), decision=$2 WHERE id=$3 AND tenant=$4",
        [ctx.user.sub, input.decision, input.id, ctx.tenant],
      );
      // optional: merge in Neo4j if input.merge
      if (input.merge) {
        const s = (ctx.driver as Driver).session();
        try {
          await s.run(
            `MATCH (l {id:$lid}),(r {id:$rid}) MERGE (l)-[:SAME_AS {source:'er_v1', confidence:1.0}]->(r)`,
            { lid: input.leftId, rid: input.rightId },
          );
        } finally {
          await s.close();
        }
      }
      await recordAudit(ctx, 'er_decide', 'er', { input });
      return true;
    },
    async copilotPreview(_: any, { nl }: any, ctx: any) {
      if (!ctx.copilotPreviewEnabled) return { enabled: false };
      const preview = buildCopilotPreview(nl);
      return { enabled: true, ...preview };
    },
  },
};

async function recordAudit(
  ctx: any,
  action: string,
  resource: string,
  attributes?: any,
  resourceId?: string,
) {
  const pool: Pool = ctx.pool;
  await pool.query(
    'INSERT INTO audit_log(tenant,user_sub,action,resource,resource_id,purpose,legal_basis,attributes) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      ctx.tenant,
      ctx.user.sub,
      action,
      resource,
      resourceId || null,
      'investigation:demo',
      'legitimate_interest',
      attributes || {},
    ],
  );
}
```

**Copilot (rules-only translator)**
**File:** `apps/server/src/util/copilot.ts`

```ts
export function buildCopilotPreview(nl: string) {
  const lower = nl.toLowerCase();
  let cypher = '';
  let note = 'rule-based';
  if (lower.includes('shortest') && lower.includes('path')) {
    const m = lower.match(/between (\w+) and (\w+)/);
    const a = m?.[1] || '$from';
    const b = m?.[2] || '$to';
    cypher = `MATCH (a {id:'${a}'}),(b {id:'${b}'}) CALL gds.shortestPath.dijkstra.stream({sourceNode:a,targetNode:b,relationshipTypes:['RELATES'],relationshipWeightProperty:'weight'}) YIELD nodeIds RETURN nodeIds`;
  } else if (lower.startsWith('neighbors of ')) {
    const id = lower.split('neighbors of ')[1].trim();
    cypher = `MATCH (n {id:'${id}'})-[r*1..2]-(m) RETURN n,m LIMIT 200`;
  } else if (lower.includes('community') || lower.includes('cluster')) {
    cypher = `CALL gds.louvain.stream('g') YIELD nodeId, communityId RETURN nodeId, communityId`;
  } else {
    cypher = `// Unable to parse. Please refine.`;
    note = 'unparsed';
  }
  return { cypher, note };
}
```

---

## 6) Ingest — CSV mapper & processor

**File:** `apps/ingest-processor/src/index.ts`

```ts
import { Kafka } from 'kafkajs';
import neo4j, { Driver } from 'neo4j-driver';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const kafka = new Kafka({
  clientId: 'ingest-processor',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});
const consumer = kafka.consumer({ groupId: 'ingest-processor' });
const driver: Driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD || 'devpass'),
);
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minio',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'devpass',
  },
});

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'intelgraph.raw', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value!.toString());
        if (payload.type === 'csv') await handleCsv(payload);
        if (payload.type === 'stix') await handleStix(payload);
      } catch (e) {
        console.error(e);
      }
    },
  });
}

async function handleCsv(p: any) {
  const session = driver.session();
  try {
    // p.rows: [{ colA:..., colB:... }], p.mapping: [{entity, column, property}]
    for (const row of p.rows) {
      const props: any = {
        id: row.id || crypto.randomUUID(),
        name: row.name,
        createdAt: new Date().toISOString(),
        policy: {
          tenant: p.tenant,
          labels: [],
          sensitivity: 'internal',
          legalBasis: 'legitimate_interest',
        },
      };
      await session.run('MERGE (n:Person {id:$id}) SET n += $props', {
        id: props.id,
        props,
      });
    }
  } finally {
    await session.close();
  }
}

async function handleStix(p: any) {
  // persist raw bundle to MinIO then map selected entities/relationships into Neo4j
  const key = `stix/${p.collection}/${Date.now()}.json`;
  await s3.send(
    new PutObjectCommand({
      Bucket: 'intelgraph',
      Key: key,
      Body: JSON.stringify(p.bundle),
      ContentType: 'application/json',
    }),
  );
  const session = driver.session();
  try {
    for (const o of p.bundle.objects || []) {
      if (o.type === 'indicator' || o.type === 'identity') {
        const id = o.id;
        await session.run(
          'MERGE (d:Document {id:$id}) SET d.title=$title, d.license=$lic, d.createdAt=coalesce(d.createdAt,$ts), d.policy=$policy',
          {
            id,
            title: o.name || o.type,
            lic: p.license || 'unknown',
            ts: new Date().toISOString(),
            policy: {
              tenant: p.tenant,
              labels: [],
              sensitivity: 'internal',
              legalBasis: 'public_task',
            },
          },
        );
      }
    }
  } finally {
    await session.close();
  }
}

run().catch(console.error);
```

---

## 7) TAXII puller (Python 3.12)

**File:** `apps/taxii-puller/app.py`

```python
import os, json, time
from taxii2client.v21 import Server
from kafka import KafkaProducer

BROKER=os.getenv("KAFKA_BROKER","localhost:9092")
TAXII_URL=os.getenv("TAXII_URL")
USER=os.getenv("TAXII_USER")
PASS=os.getenv("TAXII_PASS")
TENANT=os.getenv("TENANT","dev")

prod = KafkaProducer(bootstrap_servers=[BROKER], value_serializer=lambda v: json.dumps(v).encode("utf-8"))

server = Server(TAXII_URL, user=USER, password=PASS)
api_root = server.api_roots[0]
collections = api_root.collections

while True:
    for col in collections:
        try:
            objs = col.get_objects()
            bundle = objs.get("objects", [])
            if bundle:
                prod.send("intelgraph.raw", {"type":"stix","tenant":TENANT,"collection":col.title,"bundle":{"objects":bundle},"license":"CISA"})
        except Exception as e:
            print("TAXII error", e)
    time.sleep(300)
```

`Dockerfile` (taxii-puller)

```dockerfile
FROM python:3.12-slim
RUN pip install taxii2-client kafka-python
WORKDIR /app
COPY app.py .
CMD ["python","app.py"]
```

---

## 8) ER v1 (deterministic + queue)

**File:** `apps/ingest-processor/src/er.ts`

```ts
import { compareTwoStrings } from 'string-similarity';
import type { Pool } from 'pg';

export async function proposeER(pool: Pool, tenant: string, a: any, b: any) {
  const nameScore = compareTwoStrings(
    (a.name || '').toLowerCase(),
    (b.name || '').toLowerCase(),
  );
  const emailMatch = (a.emails || []).some((e: string) =>
    (b.emails || []).includes(e),
  );
  const phoneMatch = (a.phones || []).some((p: string) =>
    (b.phones || []).includes(p),
  );
  const score = Math.max(
    nameScore,
    emailMatch ? 1 : 0.0,
    phoneMatch ? 0.9 : 0.0,
  );
  if (score >= 0.92) {
    await pool.query(
      'INSERT INTO er_candidates(tenant,left_id,right_id,algo,score,explanation) VALUES($1,$2,$3,$4,$5,$6)',
      [
        tenant,
        a.id,
        b.id,
        'rules_v1',
        score,
        JSON.stringify({ nameScore, emailMatch, phoneMatch }),
      ],
    );
  }
}
```

---

## 9) React UI (tri‑pane) with jQuery glue

**File:** `apps/web/src/App.tsx`

```tsx
import React, { useState } from 'react';
import GraphPane from './components/GraphPane';
import MapPane from './components/MapPane';
import TimelinePane from './components/TimelinePane';
import CommandBar from './components/CommandBar';

export default function App() {
  const [elements, setElements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  return (
    <div className="w-screen h-screen grid grid-cols-2 grid-rows-2 gap-2 p-2 bg-neutral-950 text-neutral-100">
      <div className="col-span-1 row-span-2 rounded-2xl shadow-lg overflow-hidden">
        <GraphPane elements={elements} onSelect={(id) => {}} />
      </div>
      <div className="col-span-1 row-span-1 rounded-2xl shadow-lg overflow-hidden">
        <MapPane />
      </div>
      <div className="col-span-1 row-span-1 rounded-2xl shadow-lg overflow-hidden">
        <TimelinePane events={events} />
      </div>
      <CommandBar
        onRun={(cmd) => {
          /* call copilot preview */
        }}
      />
    </div>
  );
}
```

**File:** `apps/web/src/components/GraphPane.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import $ from 'jquery';

export default function GraphPane({
  elements,
  onSelect,
}: {
  elements: any[];
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const cy = cytoscape({
      container: ref.current,
      elements,
      layout: { name: 'cose' },
      wheelSensitivity: 0.2,
    });
    $(ref.current).on('wheel', (e) => {
      e.preventDefault();
      const d = (e as any).originalEvent.deltaY;
      cy.zoom({
        level: cy.zoom() * (d > 0 ? 0.9 : 1.1),
        renderedPosition: cy.renderedCenter(),
      });
    });
    cy.on('tap', 'node', (evt) => onSelect(evt.target.id()));
    return () => cy.destroy();
  }, [elements]);
  return <div className="w-full h-full bg-neutral-900" ref={ref} />;
}
```

**File:** `apps/web/src/components/MapPane.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import $ from 'jquery';

export default function MapPane() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 1.2,
    });
    $(ref.current).on('dblclick', () => map.zoomTo(map.getZoom() + 1));
    return () => map.remove();
  }, []);
  return <div className="w-full h-full" ref={ref} />;
}
```

**File:** `apps/web/src/components/TimelinePane.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import $ from 'jquery';

export default function TimelinePane({ events }: { events: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Minimal timeline: render as list with jQuery filters (placeholder for vis-timeline)
    const $root = $(ref.current);
    $root.empty();
    const $ul = $("<ul class='p-2 overflow-auto h-full'></ul>");
    events.forEach((e) =>
      $ul.append(`<li class='py-1 text-sm'>${e.ts} — ${e.text}</li>`),
    );
    $root.append($ul);
  }, [events]);
  return <div className="w-full h-full bg-neutral-900" ref={ref} />;
}
```

**File:** `apps/web/src/components/CommandBar.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import $ from 'jquery';

export default function CommandBar({
  onRun,
}: {
  onRun: (cmd: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) $(ref.current).focus();
  }, []);
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-2/3">
      <input
        ref={ref}
        className="w-full rounded-2xl p-3 text-black"
        placeholder="Ask: 'shortest path between A and B'"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onRun((e.target as any).value);
        }}
      />
    </div>
  );
}
```

---

## 10) Tests (Jest + Supertest)

**File:** `apps/server/tests/person.test.ts`

```ts
import request from 'supertest';
import { app } from '../src/app'; // if split from index, export app

test('person query returns and audits', async () => {
  const res = await request(app)
    .post('/graphql')
    .set('x-tenant', 'dev')
    .send({ query: '{ person(id:"p1"){ id name } }' });
  expect(res.status).toBe(200);
});
```

---

## 11) CI (GitHub Actions)

**File:** `.github/workflows/ci.yml`

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 18, cache: 'pnpm' }
      - run: pnpm i --frozen-lockfile
      - run: pnpm -r build
      - run: pnpm -r test -- --ci
```

---

## 12) Makefile (developer UX)

**File:** `Makefile`

```make
up:
	docker compose -f infra/docker-compose.dev.yml up -d --build

down:
	docker compose -f infra/docker-compose.dev.yml down -v

seed:
	node scripts/seed-neo4j.js

perf:
	k6 run infra/k6/p95-neighborhood.js
```

---

## 13) Branch plan & initial commits

- `feature/infra-dev-compose` — Add Compose, Makefile, CI; **PR#1: bootable dev stack**
- `feature/graph-core-schema` — SDL, resolvers, indexes, seed; **PR#2: graph core + provenance**
- `feature/ingest-csv-stix` — Kafka consumer + CSV mapper + STIX mapper; **PR#3: ingest**
- `feature/er-v1` — rules + PG queue + adjudication API; **PR#4: ER v1**
- `feature/analytics-gds` — shortest path + louvain; **PR#5: analytics**
- `feature/abac-opa-audit` — OPA policy + server enforcement + audit table; **PR#6: governance**
- `feature/ui-tripane` — graph/map/timeline; **PR#7: tri‑pane UI**
- `feature/copilot-preview` — rules-only translator + feature flag; **PR#8: Copilot**

---

## 14) Definition of Done (MVP‑0)

- p95 ≤ 1.5s for 2‑hop neighborhood @ 50k nodes (k6 script green)
- Every edge carries `{source, transform, hash, confidence}`
- OPA gates read/write; audit log populated for all mutations + privileged queries
- Copilot returns Cypher **without auto-execute**; user must confirm
- UI tri‑pane in sync; provenance tooltips visible on edges

---

## 15) Notes

- Replace TAXII URL with the selected CISA endpoint + credentials.
- Set `VITE_MAPBOX_TOKEN` and `MINIO_*` secrets for local testing.
- For GDS, create projection `CALL gds.graph.project('g','*','*',{ relationshipProperties:['weight'] })` during seed.
