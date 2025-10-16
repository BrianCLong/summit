# Sprint 14 — “Provenance First”

**Window:** Mon Sep 8 → Fri Sep 19, 2025 (10 workdays)

**Goal:** Ship a verifiable provenance path end-to-end while hardening query safety and observability.

**Success =** a case’s export bundle verifies on a clean workstation; NL→Cypher runs safely in a sandbox with cost estimates; field-level ABAC is enforced; SLO dashboards show p95 latency and slow-query kills.

---

## 1) Focus Areas & Outcomes

1. **Provenance & Claim Ledger (M1 / beta)**
   - Register evidence → generate **export manifest** (Merkle tree) → verify with a CLI.
   - Wire Report Studio to bundle **disclosure packages**.
2. **NL Graph Querying (v0.9)**
   - Prompt → generated Cypher **preview**, **cost estimate**, **sandbox-only execute**.
   - Immutable audit record of prompts/parameters.
3. **ABAC via OPA on GraphQL (read path GA)**
   - Field-level checks; **reason-for-access** prompt; policy decision telemetry.
4. **Ops: SLO + Cost Guard baseline**
   - OTEL traces, Prom metrics; **budgeted query** plugin; **slow-query killer**.

---

## 2) Deliverables (Demo-worthy)

- `prov-ledger` service (HTTP): `/evidence/register`, `/claim`, `/export/manifest`.
- `intelgraph-verify` CLI: `verify manifest.json --bundle ./export.zip` (exit 0/1).
- Report Studio button: **“Export with manifest”**; download `.zip + manifest.json`.
- NL→Cypher panel: preview, **row/expand cost estimate**, **Run in Sandbox** gate.
- GraphQL ABAC live with OPA bundle; **denials include human-readable reason**.
- Grafana dashboard: p95 query latency, error rate, slow-kill count; per-tenant budget gauge.

---

## 3) Backlog → Stories (owner/pts)

| ID  | Story                                | Acceptance (DoD)                                        | Owner       | Pts   |
| --- | ------------------------------------ | ------------------------------------------------------- | ----------- | ----- |
| P1  | Evidence registration API            | POST stores hash, license, source; returns `evidenceId` | BE-1        | 5     |
| P2  | Manifest generator (Merkle)          | Deterministic tree; tamper changes root; unit tests     | BE-2        | 5     |
| P3  | Export bundle + CLI verifier         | Verifier returns 0/1; runs offline; README              | BE-2        | 3     |
| P4  | Report Studio “Export with manifest” | Button → zip + manifest; toast with verify cmd          | FE          | 3     |
| Q1  | NL→Cypher service stub               | ≥95% syntactic validity on test prompts; logged         | BE-3        | 5     |
| Q2  | Cost estimator + sandbox exec        | Show node/edge scan est.; only sandbox can run          | FE+BE-3     | 5     |
| A1  | ABAC policy wiring (OPA)             | Field-level deny returns reason; unit+integration       | BE-1        | 8     |
| A2  | Reason-for-access prompt             | UX modal; selection logged with request                 | FE          | 3     |
| O1  | OTEL traces + Prom metrics           | Spans for resolvers; metrics exported                   | DevOps      | 3     |
| O2  | Query budgeter + slow-kill           | Per-tenant token bucket; kill > N ms; alerts            | DevOps+BE-1 | 8     |
| C1  | CSV ingest PII flags (stretch)       | Flags PII columns in wizard; redaction preset           | BE-2        | 5 (S) |

**Capacity target:** ~48–55 pts (stretch C1 if green by Day 7).

---

## 4) Architecture Notes (concise)

### Provenance manifest (Merkle)

```
root
├─ /evidence/<id>/meta.json (sha256)
├─ /transforms/<step>.json (sha256)
└─ /artifacts/<file>.bin (sha256)
```

- Store per-tenant in object storage; persist root + tree in `prov-ledger.manifests`.
- CLI recomputes hashes and compares roots; prints first mismatch.

### ABAC via OPA

- GraphQL resolver → **input context** (tenant, roles, clearance, purpose, legalBasis, labels[]) → OPA `/v1/data/intelgraph/allow`.
- Deny ⇒ attach `explanation` string to GraphQL error extensions.

---

## 5) Implementation Snippets (ready to paste)

**Apollo Server – cost guard & slow-kill plugin (TypeScript)**

```ts
// server/graphql/plugins/costGuard.ts
import { GraphQLRequestContext } from '@apollo/server';
const TENANT_BUDGET = new Map<string, number>();

export const costGuard = {
  async requestDidStart(rc: GraphQLRequestContext) {
    const t0 = Date.now();
    const tenant = rc.contextValue.tenantId;
    return {
      async didResolveOperation(ctx) {
        const est = ctx.operation?.selectionSet.selections.length || 1;
        const budget = TENANT_BUDGET.get(tenant) ?? 1000;
        if (est > budget) {
          throw Object.assign(new Error('Query over budget'), {
            extensions: { code: 'BUDGET_EXCEEDED', est, budget },
          });
        }
      },
      async willSendResponse() {
        const dt = Date.now() - t0;
        if (dt > 1500) {
          // slow-query killer (log + hint)
          rc.logger.warn(`Slow query ${dt}ms for tenant=${tenant}`);
        }
      },
    };
  },
};
```

**GraphQL resolver with OPA check**

```ts
import fetch from 'node-fetch';
async function abac(ctx: any, resource: any, fields: string[]) {
  const payload = {
    input: { sub: ctx.user, tenant: ctx.tenantId, resource, fields },
  };
  const r = await fetch(process.env.OPA_URL + '/v1/data/intelgraph/allow', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const { result } = await r.json();
  if (!result.allow) {
    const msg = result.explanation || 'Access denied by policy';
    const err: any = new Error(msg);
    err.name = 'AccessDenied';
    // include reason for access prompt id if present
    // ctx.audit(...)
    throw err;
  }
}

export const resolvers = {
  Query: {
    entity: async (_: any, { id }: any, ctx: any) => {
      await abac(ctx, { type: 'Entity', id }, [
        'name',
        'selectors',
        'sensitivity',
      ]);
      return ctx.ds.entities.get(id);
    },
  },
};
```

**OPA (Rego) policy sketch**

```rego
package intelgraph

default allow = false
allow {
  input.sub.role == "analyst"
  input.resource.type == "Entity"
  not denied_field
}

denied_field {
  some f
  f := input.fields[_]
  f == "selectors"
  not input.sub.clearances["selector:view"]
}

explanation := msg {
  not allow
  msg := "Policy denies one or more requested fields (e.g., selectors) — request purpose or clearance missing"
}
```

**Provenance manifest generator (Node)**

```ts
import { createHash } from 'crypto';
import fs from 'fs';

export function sha256(p: string) {
  const h = createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}
export function merkle(paths: string[]) {
  let layer = paths.map(sha256);
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i],
        b = layer[i + 1] || layer[i];
      next.push(
        createHash('sha256')
          .update(a + b)
          .digest('hex'),
      );
    }
    layer = next;
  }
  return layer[0];
}
```

**CLI verifier**

```ts
#!/usr/bin/env node
import fs from 'fs';
import { merkle } from '../lib/merkle';
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const files = manifest.files.map((f: any) => f.path);
const root = merkle(files);
if (root === manifest.root) {
  console.log('OK');
  process.exit(0);
}
console.error('FAIL: root mismatch');
process.exit(1);
```

**NL→Cypher UI (React + jQuery action)**

```tsx
import $ from 'jquery';
export default function NL2CypherPanel() {
  function runSandbox() {
    $('#runStatus').text('Running in sandbox...');
    $.ajax({
      url: '/ai/nl2cypher/execute',
      method: 'POST',
      data: JSON.stringify({ sandbox: true }),
      contentType: 'application/json',
    })
      .done(() => $('#runStatus').text('Done'))
      .fail((e) => $('#runStatus').text('Error: ' + e.responseText));
  }
  return (
    <div className="p-4 rounded-2xl shadow">
      <textarea
        id="prompt"
        className="w-full border p-2"
        placeholder="e.g., 'Paths from A to B in last 30d'"
      ></textarea>
      <pre id="cypherPreview" className="mt-2 p-2 bg-gray-50">
        MATCH ...
      </pre>
      <div className="text-sm">
        Estimated rows: <span id="estRows">~12,340</span>
      </div>
      <button
        id="runBtn"
        onClick={runSandbox}
        className="mt-3 px-3 py-2 rounded-2xl shadow"
      >
        Run in Sandbox
      </button>
      <div id="runStatus" className="text-xs mt-2" />
    </div>
  );
}
```

**Jest example for manifest**

```ts
import fs from 'fs';
import { merkle } from '../lib/merkle';

test('manifest root changes on tamper', () => {
  const a = merkle(['fixtures/a.txt', 'fixtures/b.txt']);
  fs.writeFileSync('fixtures/a.txt', 'tampered');
  const b = merkle(['fixtures/a.txt', 'fixtures/b.txt']);
  expect(a).not.toEqual(b);
});
```

---

## 6) QA, Security, Ops

- **Tests:** unit (manifest, OPA decisions), integration (resolver+OPA), UI e2e (export+verify), k6 perf (read 3-hop neighborhood).
- **Threats addressed:** prompt injection (sandbox), over-broad reads (ABAC), data tamper (manifest).
- **Observability:** OTEL span per resolver; Prom histograms for p50/p95; alert on slow-kill count > 5/h.

---

## 7) Ceremonies & Milestones

- **D1 Mon:** Kickoff & task breakdown (2h).
- **D3 Wed:** Architecture checkpoint (ABAC path + manifest) (30m).
- **D6 Mon:** UI demo (NL→Cypher + Export).
- **D9 Thu:** Code freeze + demo script.
- **D10 Fri:** Sprint review & retro; release tag `v0.9.0-s14`.

---

## 8) Branching, CI/CD, and PR gates

- Branches:
  - `feature/prov-ledger-m1`
  - `feature/abac-opa-read`
  - `feature/nl2cypher-v0.9`
  - `feature/ops-cost-guard`
- CI gates: unit+int tests; eslint/prettier; **schema diff checker**; bundle size guard; k6 smoke.
- CD: canary 10%; auto-rollback on p95 regression > 20%.

---

## 9) Risks & Mitigations

- **OPA policy churn** → freeze v1.0 rules by D6; simulate with recorded queries.
- **NL→Cypher hallucinations** → preview-only + sandbox-only; keep deterministic prompt + seed logs.
- **Export UX complexity** → start with simple zip; polish in next sprint.

---

## 10) Definition of Done (for this sprint)

- Verifier proves integrity of a demo export on a fresh laptop.
- Any denied GraphQL field clearly states **why** and how to request access.
- NL→Cypher runs **only** in sandbox, with visible cost estimate.
- Grafana dashboard shows p95, error%, slow-kill count, budgets per tenant.

---

## 11) After-Sprint (seeds for Sprint 15)

- Extend ABAC to write path + dual-control deletes.
- Connector conformance tests + 3 more sources.
- NL→Cypher: **path rationales** + diff view vs manual query.
- “Manifest verifier” GitHub Action to validate PR artifacts.
