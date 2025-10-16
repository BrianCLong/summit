# Summit Maestro — Bulk Backlog (CSV for Jira Import) + Contract‑Test Stubs

**Last Updated:** 2025‑08‑31 • **Owner:** Platform PM

---

## A) Jira Bulk Import — CSV

**How to use:** In Jira CSV import, map fields as:

- `Issue Type` → Issue Type
- `Summary` → Summary
- `Description` → Description
- `Labels` → Labels
- `Story Points` → Story Points (or `customfield_10016` in some Jira Cloud sites)
- `Epic Name` (for Epics) → Epic Name
- `Epic Link` (for Stories) → Epic Link (select mapping during import)
- Optional: `Component/s`

> Tip: Import **Epics first**, then Stories (so `Epic Link` resolves). If your site requires keys, replace `EPIC‑SM‑...` with actual keys after epic creation, or do a single import with both epics & stories so the importer links by row.

```csv
Issue Type,Summary,Description,Labels,Story Points,Epic Name,Epic Link,Component/s
Epic,EPIC‑SM‑CP — Control Plane Foundation,"API for /workflows and /runs; scheduler; metadata store; health/SLOs.",mvp,,,Control Plane,,control‑plane
Story,SM‑101 Control Plane API skeleton,"Scaffold REST/GRPC for /workflows and /runs; authn/authz stubs. Acceptance: POST /workflows stores manifest and returns digest; unauth = 401.",mvp,5,,EPIC‑SM‑CP,control‑plane
Story,SM‑102 Scheduler & Queue MVP,"Priority queue; lease/heartbeat; retry with backoff. Acceptance: p95 decision < 500ms @ 100 RPS; retries w/ jitter.",mvp,8,,EPIC‑SM‑CP,control‑plane
Story,SM‑103 Metadata Store (Runs/Tasks),"Persist Run/TaskExec; filter by time/status/workflowRef.",mvp,5,,EPIC‑SM‑CP,control‑plane
Story,SM‑104 Control Plane SLOs & Health,"/healthz, /readyz; 99.9% control plane SLO monitors.",mvp,3,,EPIC‑SM‑CP,control‑plane
Epic,EPIC‑SM‑WF — Workflow Compiler & DAG Engine,"Declarative→DAG compiler; retries; caching.",mvp,,,Workflow Engine,,workflow
Story,SM‑111 Manifest parser & schema validation,"Reject invalid manifests w/ path+line; enforce JSON Schema.",mvp,5,,EPIC‑SM‑WF,workflow
Story,SM‑112 DAG builder with dependencies,"Fan‑out/fan‑in; conditionals; deterministic topo order.",mvp,8,,EPIC‑SM‑WF,workflow
Story,SM‑113 Retries/Timeouts/Guards,"Per‑task retry policy; global timeout; circuit‑break on N failures.",mvp,5,,EPIC‑SM‑WF,workflow
Story,SM‑114 Task caching & replay,"Cache identical inputs/code digest; replay reproduces artifacts (hash‑equal).",ga,8,,EPIC‑SM‑WF,workflow
Epic,EPIC‑SM‑RUN — Execution Runners,"K8s Jobs, Container, Local; resource classes.",mvp,,,Runners,,runners
Story,SM‑121 K8s Jobs runner,"Namespaced isolation; logs streamed.",mvp,8,,EPIC‑SM‑RUN,runners
Story,SM‑122 Container runner,"Local container exec; artifacts mount; exit codes → status.",mvp,5,,EPIC‑SM‑RUN,runners
Story,SM‑123 Local dev runner,"CLI runs workflow locally; mock secrets; emit traces.",mvp,3,,EPIC‑SM‑RUN,runners
Story,SM‑124 Serverless adapter (alpha),"Invoke function on demand; idempotent retries.",ga,5,,EPIC‑SM‑RUN,runners
Epic,EPIC‑SM‑SDK — SDKs (TS/Python),"Dev ergonomics; task/connector ABI.",mvp,,,SDK,,sdk
Story,SM‑131 Task/Connector ABI (TS),"init/validate/execute/emit lifecycle; type defs shipped.",mvp,5,,EPIC‑SM‑SDK,sdk
Story,SM‑132 Python SDK (alpha),"Parity minimal set; publish to internal PyPI.",mvp,5,,EPIC‑SM‑SDK,sdk
Story,SM‑133 Samples & quickstarts,"Hello‑task; connector skeleton; e2e example.",mvp,3,,EPIC‑SM‑SDK,sdk
Epic,EPIC‑SM‑POL — Policy Gate (PDP),"OPA/ABAC evaluation at execution.",mvp,,,Policy,,policy
Story,SM‑141 PDP client & purpose binding,"Calls require purpose/authority/license; denials halt with reason.",mvp,5,,EPIC‑SM‑POL,policy
Story,SM‑142 Policy annotations in manifest,"Policy context in manifests; surfaced in logs.",mvp,3,,EPIC‑SM‑POL,policy
Story,SM‑143 Audit trail for decisions,"Immutable decision logs (WORM) with correlation IDs.",ga,3,,EPIC‑SM‑POL,policy
Epic,EPIC‑SM‑PROV — Provenance & Disclosure,"Receipts (alpha→GA), disclosure packager, in‑toto/SLSA.",mvp;ga,,,Provenance,,provenance
Story,SM‑151 Provenance receipt (alpha),"Inputs hash, code digest, outputs hash, signer.",mvp,5,,EPIC‑SM‑PROV,provenance
Story,SM‑152 Receipt exposure in Console,"Link from run → receipt; downloadable JSON.",mvp,3,,EPIC‑SM‑PROV,provenance
Story,SM‑153 Disclosure packager,"Bundle artifacts + receipts; verify on import.",ga,8,,EPIC‑SM‑PROV,provenance
Story,SM‑154 In‑toto/SLSA attestations,"Attestation per release; signature verifiable.",ga,5,,EPIC‑SM‑PROV,provenance
Epic,EPIC‑SM‑CON — Operator Console,"Runs/logs/retry/cancel; DAG viz.",mvp;ga,,,Console,,console
Story,SM‑161 Runs list & detail view,"Filter by status/workflow/namespace; task tree + logs.",mvp,5,,EPIC‑SM‑CON,console
Story,SM‑162 Retry/Cancel actions,"Retry idempotent; cancel updates status.",mvp,3,,EPIC‑SM‑CON,console
Story,SM‑163 DAG visualization,"Graph view; zoom/pan; critical path highlight.",ga,5,,EPIC‑SM‑CON,console
Epic,EPIC‑SM‑OBS — Observability & FinOps,"Metrics/traces/logs; dashboards; budgets/quotas.",ga,,,Observability,,observability
Story,SM‑171 Metrics & traces (OTel),"Standard metrics; traces linked to SIG ops.",ga,5,,EPIC‑SM‑OBS,observability
Story,SM‑172 Dashboards (MTTR, success rate, backlog),"Prebuilt dashboards; SLO breach alerts.",ga,3,,EPIC‑SM‑OBS,observability
Story,SM‑173 Budgets/Quotas per namespace,"Pre‑execution budget guard; usage reports.",ga,5,,EPIC‑SM‑OBS,observability
Epic,EPIC‑SM‑CAT — Reference Tasks & Runbooks,"10 tasks; 8 runbooks; golden paths.",mvp,,,Catalog,,catalog
Story,SM‑181 10 reference tasks,"HTTP, gRPC, Kafka/NATS, S3/Blob, DB RW, schema‑validate, notify, wait, approval gate, SIG ingest.",mvp,5,,EPIC‑SM‑CAT,catalog
Story,SM‑182 8 cataloged runbooks,"Dev bootstrap, demo seed, ingest backfill, schema replay, chaos drill, disclosure packager (stub), deploy promote, rollback.",mvp,5,,EPIC‑SM‑CAT,catalog
Epic,EPIC‑SM‑BLUE — Blueprints (CI/CD & ETL),"Reusable blueprints for SIG services.",ga,,,Blueprints,,blueprints
Story,SM‑191 CI/CD blueprint for SIG services,"Compile/test/deploy; env promotion & approvals.",ga,5,,EPIC‑SM‑BLUE,blueprints
Story,SM‑192 Data/ETL blueprint,"Ingest→validate→enrich→handoff; contract tests vs SIG.",ga,5,,EPIC‑SM‑BLUE,blueprints
Epic,EPIC‑SM‑SEC — Supply‑Chain Security,"SBOM; signed images; CIS hardening.",ga,,,Security,,security
Story,SM‑201 Image signing & verification,"Sigstore signing in CI; verification at runner start.",ga,5,,EPIC‑SM‑SEC,security
Story,SM‑202 SBOM generation,"SBOM attached to releases; stored/queryable.",ga,3,,EPIC‑SM‑SEC,security
Story,SM‑203 CIS hardening checks,"Benchmarks pass thresholds; exceptions tracked.",ga,5,,EPIC‑SM‑SEC,security
Epic,EPIC‑SM‑INT — SIG Integration Contracts,"Ingest/claims/export clients; triggers; CI contract tests.",mvp;ga,,,SIG Integration,,integration
Story,SM‑211 Ingest API client & schema,"Batch + stream clients; schema versioning.",mvp,5,,EPIC‑SM‑INT,integration
Story,SM‑212 Claims/Provenance API client,"Register claims; link receipts.",mvp,3,,EPIC‑SM‑INT,integration
Story,SM‑213 Runbooks trigger API (allow‑listed),"SIG can trigger approved runbooks; PDP enforced.",ga,3,,EPIC‑SM‑INT,integration
Story,SM‑214 Contract tests in CI,"Breaking change blocks merge; N‑2 compatibility.",ga,5,,EPIC‑SM‑INT,integration
```

---

## B) Contract‑Test Stubs (TypeScript)

**Repo layout (suggested):**

```
contracts/
  workflow.schema.json
  runbook.schema.json
tests/contract/
  workflow_manifest.test.ts
  runbook_manifest.test.ts
  sig_api.test.ts
  sig_trigger_api.test.ts
package.json
```

### `package.json` (dev deps)

```json
{
  "name": "maestro-contract-tests",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "nock": "^13.5.4",
    "vitest": "^2.0.0"
  }
}
```

### `tests/contract/workflow_manifest.test.ts`

```ts
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const schema = JSON.parse(
  fs.readFileSync(path.join('contracts', 'workflow.schema.json'), 'utf8'),
);

function loadYaml(file: string) {
  // Minimal YAML loader stub; replace with 'yaml' pkg if desired
  const { parse } = require('yaml');
  return parse(fs.readFileSync(file, 'utf8'));
}

describe('Workflow manifest schema', () => {
  it('validates example manifest', () => {
    const manifest = loadYaml('examples/workflows/ingest-enrich-handoff.yaml');
    const validate = ajv.compile(schema);
    const ok = validate(manifest);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });

  it('fails on missing policy fields', () => {
    const m = {
      apiVersion: 'maestro/v1',
      kind: 'Workflow',
      metadata: { name: 'x', version: '1.0.0' },
      spec: { tasks: [] },
    } as any;
    const validate = ajv.compile(schema);
    expect(validate(m)).toBe(false);
  });
});
```

### `tests/contract/runbook_manifest.test.ts`

```ts
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });
const schema = JSON.parse(
  fs.readFileSync(path.join('contracts', 'runbook.schema.json'), 'utf8'),
);

describe('Runbook manifest schema', () => {
  it('validates example runbook', () => {
    const rb = JSON.parse(
      fs.readFileSync(
        'examples/runbooks/backfill-entity-resolver.json',
        'utf8',
      ),
    );
    const validate = ajv.compile(schema);
    expect(validate(rb)).toBe(true);
  });
});
```

### `tests/contract/sig_api.test.ts`

```ts
import nock from 'nock';

// Configure base
const SIG_BASE = 'https://sig.example.internal';

function maestroIngestBatch(payload: any) {
  // Replace with actual client call
  return fetch(`${SIG_BASE}/ingest/batch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('SIG API contracts', () => {
  afterEach(() => nock.cleanAll());

  it('POST /ingest/batch sends required fields and handles receipts', async () => {
    const scope = nock(SIG_BASE)
      .post('/ingest/batch', (body) => {
        // Validate shape
        return (
          body &&
          Array.isArray(body.items) &&
          body.items.every((i: any) => i.id && i.payload)
        );
      })
      .reply(200, { jobId: 'job-123', receipts: [{ id: 'i‑1', hash: 'abc' }] });

    const res = await maestroIngestBatch({
      items: [{ id: 'i‑1', payload: {} }],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobId).toBeDefined();
    expect(Array.isArray(json.receipts)).toBe(true);
    scope.done();
  });

  it('POST /policy/evaluate enforces purpose/authority/license', async () => {
    const policy = nock(SIG_BASE)
      .post(
        '/policy/evaluate',
        (body) => body && body.purpose && body.authority && body.license,
      )
      .reply(200, { decision: 'allow', reason: 'ok' });

    const res = await fetch(`${SIG_BASE}/policy/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        purpose: 'ingest',
        authority: 'tasking:ops',
        license: 'internal',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.decision).toBe('allow');
    policy.done();
  });
});
```

### `tests/contract/sig_trigger_api.test.ts`

```ts
import nock from 'nock';

const MAESTRO_BASE = 'https://maestro.internal';

describe('Runbooks trigger API (allow‑listed)', () => {
  afterEach(() => nock.cleanAll());

  it('rejects non‑allow‑listed runbook', async () => {
    const scope = nock(MAESTRO_BASE)
      .post('/runbooks/trigger')
      .reply(403, { error: 'runbook not allow‑listed' });

    const res = await fetch(`${MAESTRO_BASE}/runbooks/trigger`, {
      method: 'POST',
    });
    expect(res.status).toBe(403);
    scope.done();
  });
});
```

---

## C) Examples Folder (referenced by tests)

### `examples/workflows/ingest-enrich-handoff.yaml`

_(Same content as the workflow manifest example in the previous canvas; include here verbatim so tests pass.)_

### `examples/runbooks/backfill-entity-resolver.json`

```json
{
  "apiVersion": "maestro/v1",
  "kind": "Runbook",
  "metadata": {
    "name": "backfill-entity-resolver",
    "version": "0.9.0",
    "owner": "sre@summit",
    "approvals": { "required": true, "approvers": ["sre-oncall", "data-lead"] },
    "allowList": { "roles": ["sre", "platform-engineer"] }
  },
  "spec": {
    "inputs": [
      { "name": "since", "type": "datetime", "required": true },
      { "name": "until", "type": "datetime", "required": false }
    ],
    "workflowRef": "ingest-enrich-handoff@1.2.0",
    "dryRun": true
  }
}
```

---

## D) Make Targets (optional)

```makefile
.PHONY: test contract‑test
contract‑test:
	npm ci
	npm run test
```

---

## E) Next Actions

1. Import the CSV (section A) to seed epics and stories.
2. Drop schemas from the manifest canvas into `contracts/`.
3. Add the example manifests to `examples/` and run `make contract‑test`.
4. Wire tests into CI and enforce on PR.
