# IntelGraph MCP Exceedance — Implementation Kickstart

This pack gives us running starts for the **Firecracker Runtime Pooler**, **Deterministic Replay Engine**, **TS SDK Alpha**, and the **Conformance CLI** — plus CI, Helm, and test scaffolds. It’s aligned to the accepted ADRs and the 90‑day roadmap you captured. Everything is minimal, typed, observable, and ready to iterate.

> Repo shape (monorepo via pnpm workspaces)

```
intelgraph-mcp/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .editorconfig
  .gitignore
  .gitattributes
  .github/workflows/ci.yml
  ops/helm/
    runtime-pooler/
    replay-engine/
  services/
    runtime-pooler/
      package.json
      tsconfig.json
      src/
        index.ts
        api.ts
        scheduler.ts
        firecracker.ts
        sandbox.ts
        authz.ts
        telemetry.ts
      tests/
        scheduler.spec.ts
    replay-engine/
      package.json
      tsconfig.json
      src/
        index.ts
        recorder.ts
        replayer.ts
        model.ts
        storage.ts
        redaction.ts
        telemetry.ts
      tests/
        replayer.spec.ts
  packages/
    sdk-ts/
      package.json
      tsconfig.json
      src/
        index.ts
        client.ts
        types.ts
      tests/
        client.spec.ts
  tools/
    conformance-cli/
      package.json
      tsconfig.json
      bin/
        ig-mcp-conformance.ts
      src/
        runner.ts
        checks/
          latency.ts
          auth.ts
          sandbox.ts
          schema.ts
          provenance.ts
      tests/
        runner.spec.ts
  benchmarks/
    harness/
      package.json
      k6/
        pooler-baseline.js
      src/
        run.ts
  docker/
    runtime-pooler.Dockerfile
    replay-engine.Dockerfile
```

---

## Root workspace

**package.json** (root)

```json
{
  "name": "intelgraph-mcp",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.6.0",
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm -r --parallel dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "conformance": "pnpm --filter conformance-cli start",
    "bench": "pnpm --filter harness start"
  },
  "workspaces": ["services/*", "packages/*", "tools/*", "benchmarks/*"]
}
```

**pnpm-workspace.yaml**

```yaml
packages:
  - 'services/*'
  - 'packages/*'
  - 'tools/*'
  - 'benchmarks/*'
```

**tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist"
  }
}
```

**.github/workflows/ci.yml**

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9.6.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test && pnpm build
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anchore/sbom-action/download-syft@v0.16.0
      - run: syft packages dir:. -o spdx-json > sbom.spdx.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.spdx.json }
```

---

## Service: runtime-pooler (Firecracker + deterministic sandboxes)

**services/runtime-pooler/package.json**

```json
{
  "name": "runtime-pooler",
  "version": "0.1.0",
  "main": "dist/index.js",
  "type": "commonjs",
  "scripts": {
    "dev": "ts-node-dev src/index.ts",
    "build": "tsc -p .",
    "lint": "eslint .",
    "typecheck": "tsc -p . --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/under-pressure": "^8.5.1",
    "@fastify/ajv-compiler": "^4.0.0",
    "zod": "^3.23.8",
    "execa": "^9.3.0",
    "p-limit": "^6.1.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^5.9.1",
    "@opentelemetry/auto-instrumentations-node": "^0.53.1"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "ts-node-dev": "^2.0.0",
    "eslint": "^9.11.1",
    "@types/node": "^22.5.4",
    "vitest": "^2.1.4"
  }
}
```

**services/runtime-pooler/src/index.ts**

```ts
import Fastify from 'fastify';
import underPressure from '@fastify/under-pressure';
import { registerApi } from './api';
import { initTelemetry } from './telemetry';

async function main() {
  const app = Fastify({ logger: true });
  await initTelemetry('runtime-pooler');

  app.register(underPressure, {
    maxEventLoopDelay: 100,
    maxHeapUsedBytes: 1024 * 1024 * 1024,
    retryAfter: 30,
  });

  registerApi(app);

  const port = Number(process.env.PORT || 8080);
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**services/runtime-pooler/src/api.ts**

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Scheduler } from './scheduler';
import { authorize } from './authz';

const scheduler = new Scheduler();

export function registerApi(app: FastifyInstance) {
  app.post('/v1/session', async (req, reply) => {
    const body = z
      .object({ toolClass: z.string(), caps: z.array(z.string()).default([]) })
      .parse(req.body);
    await authorize(req.headers.authorization, body.caps);
    const session = await scheduler.allocate(body.toolClass);
    return reply.code(201).send(session);
  });

  app.post('/v1/session/:id/invoke', async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ fn: z.string(), args: z.any() }).parse(req.body);
    const result = await scheduler.invoke(params.id, body.fn, body.args);
    return reply.send(result);
  });
}
```

**services/runtime-pooler/src/scheduler.ts**

```ts
import pLimit from 'p-limit';
import { startMicroVM, invokeSandbox } from './firecracker';

export type Session = {
  id: string;
  vmId: string;
  sandboxId: string;
  createdAt: string;
};

export class Scheduler {
  private pool = new Map<string, { vmId: string; busy: boolean }>();
  private limit = pLimit(Number(process.env.MAX_CONCURRENCY || 64));

  async allocate(toolClass: string): Promise<Session> {
    const vmId = await this.getOrStartVm(toolClass);
    const sandboxId = `sbx_${Math.random().toString(36).slice(2)}`;
    // TODO: snapshot/restore per toolClass for p95 cold-start ≤300ms.
    return {
      id: `sess_${crypto.randomUUID()}`,
      vmId,
      sandboxId,
      createdAt: new Date().toISOString(),
    };
  }

  async invoke(sessionId: string, fn: string, args: unknown) {
    return this.limit(() => invokeSandbox(sessionId, fn, args));
  }

  private async getOrStartVm(toolClass: string) {
    const key = `vm:${toolClass}`;
    const existing = this.pool.get(key);
    if (existing && !existing.busy) return existing.vmId;
    const vmId = await startMicroVM(toolClass);
    this.pool.set(key, { vmId, busy: false });
    return vmId;
  }
}
```

**services/runtime-pooler/src/firecracker.ts**

```ts
import { execa } from 'execa';

export async function startMicroVM(toolClass: string): Promise<string> {
  const id = `fc_${Math.random().toString(36).slice(2)}`;
  // Placeholder: wire to firecracker --api-sock + jailer. Respect ADR 0003.
  await execa('sh', ['-lc', `echo start ${id} for ${toolClass}`]);
  return id;
}

export async function invokeSandbox(
  sessionId: string,
  fn: string,
  args: unknown,
) {
  // Placeholder: execute inside deterministic sandbox, capture I/O for replay.
  return { sessionId, fn, ok: true, result: { echo: args } };
}
```

**services/runtime-pooler/src/authz.ts**

```ts
export async function authorize(
  authorization: unknown,
  requestedCaps: string[],
) {
  // Verify scoped capability token (OPA/ABAC call in real impl)
  if (!authorization) throw new Error('unauthorized');
  // TODO: enforce purpose tags and caps intersection.
}
```

**services/runtime-pooler/src/telemetry.ts**

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | null = null;
export async function initTelemetry(serviceName: string) {
  if (sdk) return;
  sdk = new NodeSDK({
    serviceName,
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
}
```

**services/runtime-pooler/tests/scheduler.spec.ts**

```ts
import { describe, it, expect } from 'vitest';
import { Scheduler } from '../src/scheduler';

describe('Scheduler', () => {
  it('allocates and invokes', async () => {
    const s = new Scheduler();
    const sess = await s.allocate('github');
    const out = await s.invoke(sess.id, 'ping', { x: 1 });
    expect(out.ok).toBe(true);
  });
});
```

---

## Service: replay-engine (deterministic recorder/replayer)

**services/replay-engine/package.json**

```json
{
  "name": "replay-engine",
  "version": "0.1.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev src/index.ts",
    "build": "tsc -p .",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc -p . --noEmit"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "zod": "^3.23.8",
    "@opentelemetry/api": "^1.9.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.4",
    "ts-node-dev": "^2.0.0",
    "@types/node": "^22.5.4"
  }
}
```

**services/replay-engine/src/model.ts**

```ts
export type IOEvent = {
  t: number;
  dir: 'in' | 'out';
  channel: 'mcp' | 'net' | 'fs' | 'env';
  payload: unknown;
  hash?: string;
};
export type Recording = {
  id: string;
  sessionId: string;
  seed: string;
  events: IOEvent[];
  version: string;
};
export type ReplayResult = {
  id: string;
  sessionId: string;
  divergence?: { at: number; expected: unknown; got: unknown };
};
```

**services/replay-engine/src/recorder.ts**

```ts
import { Recording, IOEvent } from './model';

export class Recorder {
  start(sessionId: string, seed: string): Recording {
    return {
      id: `rec_${crypto.randomUUID()}`,
      sessionId,
      seed,
      events: [],
      version: '1',
    };
  }
  push(rec: Recording, ev: IOEvent) {
    rec.events.push(ev);
  }
}
```

**services/replay-engine/src/replayer.ts**

```ts
import { Recording, ReplayResult } from './model';

export class Replayer {
  replay(rec: Recording): ReplayResult {
    // TODO: enforce causal ordering + side-effect stubs per ADR 0004.
    for (let i = 0; i < rec.events.length; i++) {
      // Simulate perfect match for now
      continue;
    }
    return { id: `rpl_${crypto.randomUUID()}`, sessionId: rec.sessionId };
  }
}
```

**services/replay-engine/src/redaction.ts**

```ts
export function redact(obj: unknown): unknown {
  // Replace secrets with tokens; align to purpose/retention policy.
  return obj;
}
```

**services/replay-engine/src/storage.ts**

```ts
import { Recording } from './model';
const mem = new Map<string, Recording>();
export const Storage = {
  save(rec: Recording) {
    mem.set(rec.id, rec);
    return rec.id;
  },
  get(id: string) {
    return mem.get(id);
  },
};
```

**services/replay-engine/src/index.ts**

```ts
import Fastify from 'fastify';
import { Recorder } from './recorder';
import { Replayer } from './replayer';
import { Storage } from './storage';

const app = Fastify({ logger: true });
const recorder = new Recorder();
const replayer = new Replayer();

app.post('/v1/recordings', async (req, reply) => {
  const seed = (req.body as any)?.seed ?? '0';
  const sessionId = (req.body as any)?.sessionId ?? 'unknown';
  const rec = recorder.start(sessionId, seed);
  Storage.save(rec);
  return reply.code(201).send(rec);
});

app.post('/v1/replay/:id', async (req, reply) => {
  const id = (req.params as any).id;
  const rec = Storage.get(id);
  if (!rec) return reply.code(404).send({ error: 'not found' });
  return reply.send(replayer.replay(rec));
});

app.listen({ port: Number(process.env.PORT || 8081), host: '0.0.0.0' });
```

**services/replay-engine/tests/replayer.spec.ts**

```ts
import { describe, it, expect } from 'vitest';
import { Replayer } from '../src/replayer';
import { Recorder } from '../src/recorder';

describe('Replayer', () => {
  it('replays a trivial recording', () => {
    const rec = new Recorder().start('sess1', 'seed');
    const out = new Replayer().replay(rec);
    expect(out.sessionId).toBe('sess1');
  });
});
```

---

## Package: sdk-ts (3‑line connect, typed contracts)

**packages/sdk-ts/package.json**

```json
{
  "name": "@intelgraph/mcp-sdk",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p .",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc -p . --noEmit"
  },
  "dependencies": {
    "undici": "^6.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.4",
    "@types/node": "^22.5.4"
  }
}
```

**packages/sdk-ts/src/types.ts**

```ts
export type Session = { id: string };
export type InvokeArgs = { fn: string; args: unknown };
```

**packages/sdk-ts/src/client.ts**

```ts
import { Session, InvokeArgs } from './types';

export class McpClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async connect(toolClass: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/v1/session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ toolClass }),
    });
    if (!res.ok) throw new Error(`connect failed: ${res.status}`);
    return res.json();
  }

  async invoke(session: Session, input: InvokeArgs) {
    const res = await fetch(`${this.baseUrl}/v1/session/${session.id}/invoke`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`invoke failed: ${res.status}`);
    return res.json();
  }
}
```

**packages/sdk-ts/src/index.ts**

```ts
export * from './client';
export * from './types';
```

**packages/sdk-ts/tests/client.spec.ts**

```ts
import { describe, it, expect } from 'vitest';
import { McpClient } from '../src/client';

describe('McpClient', () => {
  it('constructs', () => {
    const c = new McpClient('http://localhost:8080', 't');
    expect(c).toBeTruthy();
  });
});
```

---

## Tool: conformance-cli (self‑cert for marketplace)

**tools/conformance-cli/package.json**

```json
{
  "name": "@intelgraph/mcp-conformance-cli",
  "version": "0.1.0",
  "bin": { "ig-mcp-conformance": "bin/ig-mcp-conformance.ts" },
  "type": "module",
  "scripts": {
    "start": "tsx bin/ig-mcp-conformance.ts",
    "build": "tsc -p .",
    "test": "vitest run"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "undici": "^6.19.2"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

**tools/conformance-cli/bin/ig-mcp-conformance.ts**

```ts
#!/usr/bin/env tsx
import { Command } from 'commander';
import { runAll } from '../src/runner';

const program = new Command();
program
  .name('ig-mcp-conformance')
  .requiredOption('-e, --endpoint <url>', 'MCP server endpoint')
  .option('-t, --token <token>', 'auth token')
  .action(async (opts) => {
    const res = await runAll(opts.endpoint, opts.token);
    console.log(JSON.stringify(res, null, 2));
  });
program.parse();
```

**tools/conformance-cli/src/runner.ts**

```ts
import * as latency from './checks/latency';
import * as auth from './checks/auth';
import * as sandbox from './checks/sandbox';
import * as schema from './checks/schema';
import * as provenance from './checks/provenance';

export async function runAll(endpoint: string, token?: string) {
  const ctx = { endpoint, token } as const;
  return {
    summary: {
      passed: 0,
      failed: 0,
    },
    checks: await Promise.all([
      latency.run(ctx),
      auth.run(ctx),
      sandbox.run(ctx),
      schema.run(ctx),
      provenance.run(ctx),
    ]),
  };
}
```

**tools/conformance-cli/src/checks/latency.ts**

```ts
export async function run(ctx: { endpoint: string; token?: string }) {
  const t0 = Date.now();
  const res = await fetch(ctx.endpoint + '/health');
  const ms = Date.now() - t0;
  const pass = res.ok && ms <= 250; // p95 target for session start (proxy)
  return { name: 'latency', pass, ms };
}
```

(Other checks are stubs you can extend to map to the conformance spec.)

---

## Benchmarks harness (baseline)

**benchmarks/harness/package.json**

```json
{
  "name": "mcp-bench-harness",
  "version": "0.1.0",
  "scripts": { "start": "tsx src/run.ts" },
  "dependencies": { "k6": "file:./k6" },
  "devDependencies": { "tsx": "^4.19.0" }
}
```

**benchmarks/harness/k6/pooler-baseline.js**

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 50, duration: '1m' };

export default function () {
  const res = http.post(
    `${__ENV.ENDPOINT}/v1/session`,
    JSON.stringify({ toolClass: 'github' }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.TOKEN}`,
      },
    },
  );
  check(res, { 201: (r) => r.status === 201 });
  sleep(0.1);
}
```

**benchmarks/harness/src/run.ts**

```ts
console.log('Run k6 with ENDPOINT and TOKEN envs against pooler-baseline.js');
```

---

## Ops: Helm charts (minimal values)

**ops/helm/runtime-pooler/values.yaml**

```yaml
image: { repository: intelgraph/runtime-pooler, tag: v0.1.0 }
replicaCount: 2
resources:
  requests: { cpu: '250m', memory: '256Mi' }
  limits: { cpu: '1', memory: '512Mi' }
otel:
  endpoint: 'http://otel-collector:4317'
```

**ops/helm/replay-engine/values.yaml**

```yaml
image: { repository: intelgraph/replay-engine, tag: v0.1.0 }
replicaCount: 1
resources:
  requests: { cpu: '200m', memory: '256Mi' }
  limits: { cpu: '500m', memory: '512Mi' }
```

---

## Incremental Tickets (ready to open)

**EPIC: Runtime (Pooler) — P95 cold start ≤300ms**

- RT-01 Implement Firecracker controller (API sock, jailer, snapshot/restore). _3d_
- RT-02 Snapshot cache per toolClass with LRU + prewarm cron. _2d_
- RT-03 Deterministic sandbox runner (syscall filter, network egress policy). _4d_
- RT-04 OTEL spans for session start + invoke; pool hit metric. _1d_
- RT-05 k6 baseline vs legacy runtime; report deltas. _1d_

**EPIC: Replay — Deterministic replays ≥95%**

- RP-01 Event taps (mcp/net/fs/env) + hashing; seed capture. _3d_
- RP-02 Side‑effect stubs registry + policy binding. _3d_
- RP-03 Divergence detector + causal graph UI (MVP). _4d_
- RP-04 Privacy redaction + retention enforcement. _2d_

**EPIC: Marketplace/DX**

- DX-01 SDK alpha ergonomics (connect/invoke/stream + typings). _3d_
- DX-02 Local emulator for tool authors. _3d_
- DX-03 Conformance CLI checks mapped to spec; badges. _4d_

**EPIC: Compliance/Benchmarks**

- CB-01 Provenance ledger write-path hooks; signed artifacts. _3d_
- CB-02 Public shootout dashboard scaffold; signed results. _3d_

---

## Acceptance & Verification (initial)

- p95 session start ≤ 250 ms (k6 + OTEL traces).
- p95 cold start ≤ 300 ms (pool hit ratio ≥ 0.8 at steady state).
- Replay success rate ≥ 95% on golden fixtures; divergence triage report.
- Conformance CLI ≥ 90% pass on partner servers; badges generated.
- SBOM built on CI; signatures verified in publish pipeline.

---

### How to run locally

1. `pnpm i && pnpm build`
2. `pnpm --filter runtime-pooler dev` (port 8080)
3. `pnpm --filter replay-engine dev` (port 8081)
4. `pnpm --filter @intelgraph/mcp-sdk build` then import in sample.
5. `ENDPOINT=http://localhost:8080 TOKEN=dev k6 run benchmarks/harness/k6/pooler-baseline.js`

> These are thin, testable slices to get engineering unblocked today. Next pass will wire Firecracker APIs, side‑effect stubs, and conformance checks to your specs and ADRs.

---

## MCP Protocol Additions (informed by ByteByteGo explainer, Sep 30, 2025)

**Objective:** Incorporate the widely adopted MCP mental model (Host ↔ MCP Client ↔ MCP Server) and full protocol stack (Transport → JSON‑RPC 2.0 → Capability layer) into our runtime, SDK, conformance suite, benchmarks, and docs so we’re best‑in‑class and obviously standards‑aligned.

### Scope & Impacts

- **Transports:** Support both **STDIO (local)** and **HTTP + SSE (remote streaming)** in the pooler and SDK. The router negotiates transport per server and enforces auth (mTLS/JWT) for HTTP and OS‑level policy for STDIO.
- **Protocol:** First‑class **JSON‑RPC 2.0** framing and error semantics (id correlation, `-32600/-32601/-32602/-32603` handling; no silent coercions). Add explicit batch handling = **not supported** unless whitelisted (per MCP guidance).
- **Capabilities:** Canonical primitives — **Tools** (actions), **Resources** (read‑only data), **Prompts** (templates/flows). The SDK exposes typed accessors; the conformance CLI validates declarations vs behavior.
- **Roles:** Clarify **Host App** (CompanyOS/Switchboard) responsibilities vs **MCP Client** (per‑server connection, 1:1) vs **MCP Server** (integration wrapper). Our registry and DX docs adopt this vocabulary.

### SDK Work (TypeScript alpha)

- **SDK-TR-01 (new):** Add **SSE event stream** helper with auto‑reconnect, backoff, and back‑pressure (pause/resume) APIs. _3d_
- **SDK-TR-02:** Implement **dual transport**: `stdio://` endpoints spawn local servers; `https://` uses fetch + SSE. _4d_
- **SDK-CP-01:** Capability discovery: `listPrompts`, `listResources`, `listTools`; strong types + Zod schemas. _2d_
- **SDK-CP-02:** **Streaming invokes** with iterator‑style consumption and cancellation tokens. _2d_
- **SDK-OBS-01:** Correlate **JSON‑RPC id** ↔ OTEL span id; attach transport/method/capability attributes. _1d_

### Runtime/Pooler

- **RT-TR-06 (new):** **HTTP+SSE gateway** with mTLS and SSE fan‑out; p95 server→client latency ≤ **250 ms** (subscriptions SLO). _3d_
- **RT-TR-07:** **STDIO adapter** for local servers with OS sandboxing; enforce cgroup limits and seccomp profile. _3d_
- **RT-PR-08:** JSON‑RPC 2.0 validator and error mapper; reject malformed frames with proper codes. _2d_
- **RT-CB-09:** Capability registry per session; enforce **Resources = read‑only** (deny mutations); **Tools = side‑effectful** audited via ledger; **Prompts = templates** versioned. _3d_

### Replay/Observability

- **RP-TR-05 (new):** Record raw **JSON‑RPC frames** and **SSE events** (with seeds) as first‑class IO channels for deterministic replay. _3d_
- **RP-TR-06:** **Journey-of-a-request trace**: Host→Client→Server→Downstream annotated spans; export causal graph. _2d_

### Conformance CLI (expand to protocol spec)

- **CONF-TPT-01:** **Transport matrix** checks: HTTP+SSE streaming continuity under packet loss; STDIO round‑trip correctness. _3d_
- **CONF-JRPC-02:** JSON‑RPC id correlation, error codes, invalid request handling; schema drift detection. _2d_
- **CONF-CAP-03:** Verify capability declarations match observed behavior (resources immutable; tools effectful; prompts enumerated). _2d_
- **CONF-SEC-04:** Auth across transports (mTLS for HTTP; OS identity for STDIO), capability‑scoped tokens enforced end‑to‑end. _2d_

### Benchmarks (add streaming + local mode)

- **BENCH-SSE-01:** Measure SSE **message latency** and **throughput** under 50/200 VU; target p95 ≤ 250 ms; error budget burn alarms. _2d_
- **BENCH-STDIO-02:** Local STDIO invoke p95 ≤ **20 ms** on dev iron; document variance across OSes. _1d_

### SRE & Security Runbooks

- **SSE incident guide:** stuck streams, missed heartbeats, replay gaps, CDN/proxy compatibility.
- **Local server hardening:** guidance for sandboxing, path/FD whitelists, and environment sealing for STDIO servers.

### Data/Policy & Registry

- **Registry metadata additions:** transport(s) supported, capability manifest (tools/resources/prompts), streaming readiness, and required scopes.
- **Retention defaults:** **Resources** results → `standard-365d`; **Tools** outputs with PII → `short-30d` unless legal‑hold.

### Acceptance Criteria (added)

- Dual transport supported and validated by conformance suite.
- JSON‑RPC 2.0 compliance: 100% of negative tests pass; **no** protocol‑level warnings in traces.
- Streaming (SSE) p95 server→client latency ≤ **250 ms**, packet‑loss test shows graceful recovery.
- STDIO local invoke p95 ≤ **20 ms**; sandbox policy blocks network unless explicitly scoped.
- Capability semantics enforced (resource immutability, prompt versioning, tool side‑effect audit) with evidence in provenance ledger.

### New Files/Edits

- **packages/sdk-ts/src/sse.ts** — SSE helper with iterator API and backoff.
- **services/runtime-pooler/src/transport/httpSse.ts** — SSE gateway & keepalive.
- **services/runtime-pooler/src/transport/stdio.ts** — STDIO adapter + sandboxing.
- **tools/conformance-cli/src/checks/transport.ts** — transport matrix tests.
- **tools/conformance-cli/src/checks/jsonrpc.ts** — JSON‑RPC compliance.
- **benchmarks/harness/k6/sse-latency.js** — streaming benchmark.
- **docs** — Update `docs/conformance/mcp-tool-server-conformance.md` to include transport/protocol/capability sections; add developer guides for Host/Client/Server roles.

---

## ByteByteGo Article Integration — Deepening & Actions

**Source context:** ByteByteGo, “Why Anthropic’s MCP is a Big Deal,” Sep 30, 2025. This section distills the explainer into concrete design choices, checks, and developer experience improvements aligned to our roadmap.

### Industry Signals & Positioning

- Treat MCP as the **universal adapter** for AI connectivity; our messaging should mirror the USB‑C analogy and emphasize **addition vs. multiplication** of integrations.
- Public roadmap note: **host ↔ client ↔ server** roles are first‑class in IntelGraph (CompanyOS/Switchboard = Host; our adapters = Clients; partner integrations = Servers). Marketecture slide + docs update.

### Protocol Stack Deepening (Transport → JSON‑RPC 2.0 → Capabilities)

- **Transport**
  - Local: **STDIO** default for low‑latency dev & on‑prem; locked with cgroups/seccomp and **no‑net by default**.
  - Remote: **HTTP requests + SSE streaming responses**; built‑in **mTLS** and connection heartbeats; tolerant of packet loss with resume tokens.
- **JSON‑RPC 2.0 Compliance**
  - Full error mapping (`-32600`, `-32601`, `-32602`, `-32603`, server‑defined).
  - Strict id correlation; **no batch** unless whitelisted per server.
  - Trace enrichment: `rpc.method`, `rpc.jsonrpc=2.0`, `rpc.id` → span link.
- **Capabilities (Tools/Resources/Prompts)**
  - **Resources = immutable**; stateful writes forbidden.
  - **Tools = side‑effectful**; effects logged to provenance ledger.
  - **Prompts = versioned templates**; changes produce new semver + hash.

### Journey of a Request → Observability Mapping

- Emit spans for **Host→Client→Server→Downstream** legs; attach transport, size, and auth mode attributes.
- Record raw frames (**JSON‑RPC** and **SSE**) into the Recorder with seed + wall‑clock; replayer enforces causal ordering.
- Add **causal graph** view in replay UI (request node → tool call → downstream I/O → response node).

### Conformance Matrix (expanded tests)

- **Transport**: HTTP+SSE continuity under jitter/packet loss; STDIO sandboxing blocks outbound network by default.
- **Protocol**: negative tests for malformed JSON, unknown method, invalid params, id reuse, and batch rejection.
- **Capabilities**: declaration vs. behavior checks (resources truly read‑only; prompts enumerated & versioned; tools produce effect records).
- **Security**: mTLS verification, JWT expiry/clock‑skew handling, capability‑scoped tokens enforced end‑to‑end.

### Benchmarks Enhancements

- **Streaming latency**: p95 server→client ≤ **250 ms** at 50/200 VU, with 1% packet loss.
- **Local STDIO**: p95 invoke ≤ **20 ms** on dev iron; doc variance.
- Publish **addition‑not‑multiplication** integration cost chart in blog.

### Docs & DX Tasks

- Add **Host/Client/Server** role primers to the SDK & Conformance docs.
- Provide **reference flows**: GitHub server (resource + tool), Postgres server (resource → SQL), and a Prompt bundle example.
- Include **developer cookbook**: build, test, debug MCP servers with our emulator & CLI.

### New Tickets (add to backlog)

- **RT-TR-10:** STDIO seccomp profile & fs/FD whitelist; default **no‑net**; escape‑hatch via capability.
- **RT-TR-11:** SSE resume tokens + keepalive/heartbeat; proxy/CDN compatibility matrix.
- **SDK-CP-03:** Capability discovery APIs (`listTools`, `listResources`, `listPrompts`) + Zod typings.
- **CONF-JRPC-03:** Negative test suite: malformed, unknown, invalid params, id reuse, batch unsupported.
- **BENCH-SSE-03:** k6 scenario for message latency/throughput with jitter and packet loss.
- **DOCS-ROLE-01:** Role mapping section + diagrams (USB‑C analogy, journey‑of‑request).

### Acceptance Criteria (added)

- **Dual transport** passes transport tests (continuity, sandbox) with green badges.
- **JSON‑RPC 2.0** negative tests: 100% pass; no protocol warnings in traces.
- **Capability semantics** enforced with ledger evidence (immutable resources, effectful tools, versioned prompts).
- **SSE** p95 ≤ 250 ms; **STDIO** p95 ≤ 20 ms under baseline hardware.

### File Stubs to Add

- `packages/sdk-ts/src/sse.ts` (iterator API, backoff, pause/resume)
- `services/runtime-pooler/src/transport/httpSse.ts`
- `services/runtime-pooler/src/transport/stdio.ts`
- `tools/conformance-cli/src/checks/transport.ts`
- `tools/conformance-cli/src/checks/jsonrpc.ts`
- `benchmarks/harness/k6/sse-latency.js`
- `docs/architecture/mcp-roles-and-journeys.md` (marketecture + diagrams)
