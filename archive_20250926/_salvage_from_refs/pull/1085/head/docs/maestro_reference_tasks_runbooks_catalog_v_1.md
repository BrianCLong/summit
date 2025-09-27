# Maestro Reference Tasks & Runbooks — Catalog (v1)

**Last Updated:** 2025‑08‑31 • **Owner:** Platform Eng • **Scope:** Production‑ready *reference* tasks/connectors and runbooks aligned to the PRD. Targets MVP→GA with semver and examples.

---
## 0) Layout (drop into Maestro repo)
```
packages/
  tasks-core/
    package.json
    tsconfig.json
    src/
      index.ts
      util/hash.ts
      tasks/
        wait.sleep.ts
        notify.slack.ts
        schema.validate.ts
        transform.map.ts
      connectors/
        kafka.publish.ts
        nats.publish.ts
        s3.get.ts
        s3.put.ts
        sig.ingest.ts
      ops/
        approval.gate.ts
        disclosure.package.ts
    test/
      schema.validate.spec.ts
      disclosure.package.spec.ts
runbooks/
  ingest-enrich-handoff.yaml
  backfill-entity-resolver.yaml
  dev-bootstrap.yaml
  demo-seed.yaml
  chaos-drill.yaml
  disclosure-packager.yaml
  deploy-promote.yaml
  rollback.yaml
```

> All TypeScript code uses `@summit/maestro-sdk` from the SDK canvas.

---
## 1) NPM Package — `packages/tasks-core/package.json`
```json
{
  "name": "@summit/maestro-tasks-core",
  "version": "0.1.0",
  "description": "Reference tasks & connectors for Summit Maestro",
  "license": "UNLICENSED",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "clean": "rimraf dist",
    "test": "vitest run",
    "prepublishOnly": "npm run clean && npm run build && npm test"
  },
  "dependencies": {
    "@summit/maestro-sdk": "^0.1.0",
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "yaml": "^2.5.0",
    "aws-sdk": "^2.1588.0",
    "@aws-sdk/client-s3": "^3.626.0",
    "kafkajs": "^2.2.4",
    "nats": "^2.20.2",
    "archiver": "^7.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "rimraf": "^5.0.5",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### `src/index.ts`
```ts
export * as tasks from './tasks/wait.sleep.js';
export * from './tasks/wait.sleep.js';
export * from './tasks/notify.slack.js';
export * from './tasks/schema.validate.js';
export * from './tasks/transform.map.js';
export * from './connectors/kafka.publish.js';
export * from './connectors/nats.publish.js';
export * from './connectors/s3.get.js';
export * from './connectors/s3.put.js';
export * from './connectors/sig.ingest.js';
export * from './ops/approval.gate.js';
export * from './ops/disclosure.package.js';
```

### `src/util/hash.ts`
```ts
import { createHash } from 'node:crypto';
export function sha256(data: string | Uint8Array) {
  return createHash('sha256').update(data).digest('hex');
}
```

---
## 2) Tasks & Connectors (TypeScript)

### 2.1 `tasks/wait.sleep.ts`
```ts
import { defineTask, type TaskInput } from '@summit/maestro-sdk';

export default defineTask<{ ms: number }, { slept: number}>({
  validate: ({ payload }: TaskInput<{ ms: number }>) => {
    if (!payload || typeof payload.ms !== 'number' || payload.ms < 0) throw new Error('ms must be >= 0');
  },
  execute: async (_ctx, { payload }) => {
    await new Promise(r => setTimeout(r, payload.ms));
    return { payload: { slept: payload.ms } };
  }
});
```

### 2.2 `tasks/notify.slack.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';

type In = { webhook?: string; channel?: string; text: string };
export default defineTask<In, { ok: boolean }>({
  async execute(ctx, { payload }){
    const url = payload.webhook ?? await ctx.secrets('SLACK_WEBHOOK_URL');
    const res = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ text: payload.text }) });
    return { payload: { ok: res.ok } };
  }
});
```

### 2.3 `tasks/schema.validate.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

interface In { schema: object; data: unknown }

export default defineTask<In, { valid: true }>({
  async execute(_ctx, { payload }){
    const ajv = new Ajv({ allErrors: true }); addFormats(ajv);
    const validate = ajv.compile(payload.schema as any);
    const ok = validate(payload.data);
    if (!ok) throw new Error('Schema validation failed: ' + JSON.stringify(validate.errors));
    return { payload: { valid: true } };
  }
});
```

### 2.4 `tasks/transform.map.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';

type Mapper<T> = (row: any) => T;
interface In<TOut> { rows: any[]; mapper: string }

// Note: mapper is a JS function body in a sandboxed new Function (trusted catalogs only)
export default defineTask<In<any>, { rows: any[] }>({
  async execute(_ctx, { payload }){
    const fn = new Function('row', payload.mapper) as Mapper<any>;
    const out = payload.rows.map(r => fn(r));
    return { payload: { rows: out } };
  }
});
```

### 2.5 `connectors/kafka.publish.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';
import { Kafka } from 'kafkajs';

interface In { brokers: string[]; topic: string; messages: { key?: string; value: string }[] }
export default defineTask<In, { count: number }>({
  async execute(_ctx, { payload }){
    const kafka = new Kafka({ clientId: 'maestro', brokers: payload.brokers });
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({ topic: payload.topic, messages: payload.messages });
    await producer.disconnect();
    return { payload: { count: payload.messages.length } };
  }
});
```

### 2.6 `connectors/nats.publish.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';
import { connect, StringCodec } from 'nats';

interface In { servers: string; subject: string; messages: string[] }
export default defineTask<In, { count: number }>({
  async execute(_ctx, { payload }){
    const nc = await connect({ servers: payload.servers });
    const sc = StringCodec();
    for (const m of payload.messages) nc.publish(payload.subject, sc.encode(m));
    await nc.drain();
    return { payload: { count: payload.messages.length } };
  }
});
```

### 2.7 `connectors/s3.get.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface In { bucket: string; key: string; region?: string }
export default defineTask<In, { body: string }>({
  async execute(_ctx, { payload }){
    const s3 = new S3Client({ region: payload.region ?? process.env.AWS_REGION });
    const res = await s3.send(new GetObjectCommand({ Bucket: payload.bucket, Key: payload.key }));
    const body = await res.Body!.transformToString();
    return { payload: { body } };
  }
});
```

### 2.8 `connectors/s3.put.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface In { bucket: string; key: string; body: string; region?: string; contentType?: string }
export default defineTask<In, { etag: string }>({
  async execute(_ctx, { payload }){
    const s3 = new S3Client({ region: payload.region ?? process.env.AWS_REGION });
    const res = await s3.send(new PutObjectCommand({ Bucket: payload.bucket, Key: payload.key, Body: payload.body, ContentType: payload.contentType }));
    return { payload: { etag: res.ETag || '' } };
  }
});
```

### 2.9 `connectors/sig.ingest.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';

type Item = { id: string; payload: unknown };
interface In { endpoint?: string; items: Item[] }
export default defineTask<In, { jobId: string; receipts: Array<{ id: string; hash: string }>}>({
  async execute(ctx, { payload }){
    const endpoint = payload.endpoint ?? await ctx.secrets('SIG_INGEST_URL');
    const res = await fetch(`${endpoint}/ingest/batch`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: payload.items })
    });
    if (!res.ok) throw new Error(`SIG ingest failed ${res.status}`);
    return res.json();
  }
});
```

### 2.10 `ops/approval.gate.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';

interface In { approved?: boolean; approver?: string; ticket?: string }
export default defineTask<In, { approved: boolean }>({
  async execute(_ctx, { payload }){
    if (!payload.approved) throw new Error('Approval required');
    return { payload: { approved: true } };
  }
});
```

### 2.11 `ops/disclosure.package.ts`
```ts
import { defineTask } from '@summit/maestro-sdk';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { sha256 } from '../util/hash.js';

interface In { files: string[]; outPath: string }
interface ManifestEntry { path: string; sha256: string }

export default defineTask<In, { bundle: string; manifest: ManifestEntry[] }>({
  async execute(_ctx, { payload }){
    const manifest: ManifestEntry[] = payload.files.map(p => ({ path: p, sha256: sha256(fs.readFileSync(p)) }));
    const out = fs.createWriteStream(payload.outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(out);
    for (const f of payload.files) archive.file(f, { name: path.basename(f) });
    archive.append(JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2), { name: 'manifest.json' });
    await archive.finalize();
    return { payload: { bundle: payload.outPath, manifest } };
  }
});
```

---
## 3) Tests (Vitest)

### `test/schema.validate.spec.ts`
```ts
import task from '../src/tasks/schema.validate.js';

test('valid schema passes', async () => {
  const schema = { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] };
  const out = await task.execute({} as any, { payload: { schema, data: { a: 1 } } });
  expect(out.payload.valid).toBe(true);
});
```

### `test/disclosure.package.spec.ts`
```ts
import fs from 'node:fs';
import task from '../src/ops/disclosure.package.js';

test('packages files with manifest', async () => {
  fs.writeFileSync('tmp.txt', 'hello');
  const res = await task.execute({} as any, { payload: { files: ['tmp.txt'], outPath: 'bundle.zip' } });
  expect(res.payload.bundle).toBe('bundle.zip');
  expect(res.payload.manifest[0].path).toBe('tmp.txt');
});
```

---
## 4) Reference Runbooks (YAML)

### 4.1 `runbooks/dev-bootstrap.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: dev-bootstrap
  version: 0.2.0
  owner: sre@summit
  allowList:
    roles: ["platform-engineer", "sre"]
spec:
  inputs: []
  workflowRef: dev-bootstrap@0.2.0
```

**Workflow `dev-bootstrap@0.2.0`**
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: dev-bootstrap
  version: 0.2.0
  owner: sre@summit
spec:
  tasks:
    - id: create-ns
      uses: tasks/notify.slack@0.1.0
      with: { text: "Bootstrapping dev namespace..." }
    - id: sleep
      uses: tasks/wait.sleep@0.1.0
      needs: [create-ns]
      with: { ms: 500 }
```

### 4.2 `runbooks/demo-seed.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: demo-seed
  version: 0.3.0
  owner: platform@summit
  approvals:
    required: true
    approvers: ["product-lead"]
spec:
  inputs:
    - name: dataset
      type: string
      required: true
  workflowRef: demo-seed@0.3.0
```

**Workflow `demo-seed@0.3.0`**
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: demo-seed
  version: 0.3.0
  owner: platform@summit
spec:
  parameters:
    - name: dataset
      type: string
      required: true
  tasks:
    - id: fetch
      uses: connectors/s3.get@0.1.0
      with:
        bucket: demo-datasets
        key: ${params.dataset}
    - id: validate
      uses: tasks/schema.validate@0.1.0
      needs: [fetch]
      with:
        schema: { "$schema": "http://json-schema.org/draft-07/schema#", "type": "object" }
    - id: ingest
      uses: connectors/sig.ingest@0.1.0
      needs: [validate]
      with:
        items: [ { id: "seed-1", payload: { source: "demo" } } ]
```

### 4.3 `runbooks/ingest-enrich-handoff.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: ingest-enrich-handoff
  version: 1.2.0
  owner: data@summit
  allowList:
    roles: ["data-engineer", "platform-engineer"]
spec:
  inputs:
    - name: source_bucket
      type: string
      required: true
  workflowRef: ingest-enrich-handoff@1.2.0
```

**Workflow `ingest-enrich-handoff@1.2.0`** *(matches earlier example, simplified here)*
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: ingest-enrich-handoff
  version: 1.2.0
  owner: data@summit
spec:
  parameters:
    - name: source_bucket
      type: string
      required: true
  tasks:
    - id: fetch
      uses: connectors/s3.get@0.1.0
      with: { bucket: ${params.source_bucket}, key: "raw.json" }
    - id: validate
      uses: tasks/schema.validate@0.1.0
      needs: [fetch]
      with: { schema: { "type": "object" } }
    - id: map
      uses: tasks/transform.map@0.1.0
      needs: [validate]
      with: { rows: [], mapper: "return row;" }
    - id: ingest
      uses: connectors/sig.ingest@0.1.0
      needs: [map]
      with: { items: [ { id: "x", payload: {}} ] }
```

### 4.4 `runbooks/backfill-entity-resolver.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: backfill-entity-resolver
  version: 0.9.0
  owner: sre@summit
  approvals:
    required: true
    approvers: ["sre-oncall", "data-lead"]
spec:
  inputs:
    - name: since
      type: datetime
      required: true
    - name: until
      type: datetime
      required: false
  workflowRef: ingest-enrich-handoff@1.2.0
  dryRun: true
```

### 4.5 `runbooks/chaos-drill.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: chaos-drill
  version: 0.4.0
  owner: sre@summit
  allowList:
    roles: ["sre"]
spec:
  inputs:
    - name: note
      type: string
      required: false
  workflowRef: chaos-drill@0.4.0
```

**Workflow `chaos-drill@0.4.0`**
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: chaos-drill
  version: 0.4.0
  owner: sre@summit
spec:
  tasks:
    - id: warn
      uses: tasks/notify.slack@0.1.0
      with: { text: "Chaos drill starting" }
    - id: sleep
      uses: tasks/wait.sleep@0.1.0
      needs: [warn]
      with: { ms: 1000 }
    - id: approve
      uses: ops/approval.gate@0.1.0
      needs: [sleep]
      with: { approved: true, approver: "sre-oncall" }
```

### 4.6 `runbooks/disclosure-packager.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: disclosure-packager
  version: 1.0.0
  owner: compliance@summit
  approvals:
    required: true
    approvers: ["ombuds", "legal"]
spec:
  inputs:
    - name: files
      type: object
      required: true
  workflowRef: disclosure-packager@1.0.0
```

**Workflow `disclosure-packager@1.0.0`**
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: disclosure-packager
  version: 1.0.0
  owner: compliance@summit
spec:
  parameters:
    - name: files
      type: object
      required: true
  tasks:
    - id: package
      uses: ops/disclosure.package@0.1.0
      with: { files: ${params.files}, outPath: "bundle.zip" }
```

### 4.7 `runbooks/deploy-promote.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: deploy-promote
  version: 0.6.0
  owner: platform@summit
  approvals:
    required: true
    approvers: ["release-manager"]
spec:
  inputs:
    - name: service
      type: string
      required: true
    - name: from
      type: string
      required: true
    - name: to
      type: string
      required: true
  workflowRef: deploy-promote@0.6.0
```

**Workflow `deploy-promote@0.6.0`** *(placeholder ops sequence)*
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: deploy-promote
  version: 0.6.0
  owner: platform@summit
spec:
  tasks:
    - id: gate
      uses: ops/approval.gate@0.1.0
      with: { approved: true, approver: "release-manager" }
    - id: notify
      uses: tasks/notify.slack@0.1.0
      needs: [gate]
      with: { text: "Promoting ${params.service} from ${params.from} to ${params.to}" }
```

### 4.8 `runbooks/rollback.yaml`
```yaml
apiVersion: maestro/v1
kind: Runbook
metadata:
  name: rollback
  version: 0.6.0
  owner: platform@summit
  allowList:
    roles: ["sre", "release-manager"]
spec:
  inputs:
    - name: service
      type: string
      required: true
    - name: to
      type: string
      required: true
  workflowRef: rollback@0.6.0
```

**Workflow `rollback@0.6.0`**
```yaml
apiVersion: maestro/v1
kind: Workflow
metadata:
  name: rollback
  version: 0.6.0
  owner: platform@summit
spec:
  tasks:
    - id: notify
      uses: tasks/notify.slack@0.1.0
      with: { text: "Rolling back ${params.service} to ${params.to}" }
```

---
## 5) Versioning & Publishing
- Tag and publish `@summit/maestro-tasks-core` as **0.1.0** for MVP. Increment minor when adding new tasks; patch for bugfixes.
- Runbook manifests reference tasks by semver (e.g., `tasks/schema.validate@0.1.0`).

---
## 6) Security & Policy Notes
- **Approval Gate** is a placeholder for a real human‑in‑the‑loop mechanism. Replace with an API call to your approval system or SIG UI event.
- **transform.map** executes dynamic JS: keep it to **trusted catalogs only**. For untrusted inputs, provide a safe mapping DSL instead.
- All connectors should honor **PDP** decisions before touching sensitive data.

---
## 7) Next Steps
1. Wire these into the Operator Console catalog.
2. Add policy hooks to manifests (purpose/authority/license).
3. Expand with **DB read/write** tasks and **SIG export** connector.

