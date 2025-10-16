````markdown
# IntelGraph — Marketplace, Extensions & Governance Sprint (v1.8.0)

**Slug:** `sprint-2026-03-30-intelgraph-v1-8`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-03-30 → 2026-04-10 (10 business days)  
**Theme:** **Extensibility with Guardrails** — Plugin Marketplace (safe sandbox), Data Contracts & Schema Registry, Governance Workflows, and FinOps (quotas + billing hooks) for enterprise rollout.

---

## 0) North Stars & DoD

- **Safe Extensibility:** Third‑party plugins run in a **capability‑scoped sandbox** with resource budgets and auditable permissions.
- **Trust the Shape:** All ingests & exports conform to **Data Contracts** (versioned schemas + tests) with enforcement at edges.
- **Govern Decisions:** Review/approve flows for risky operations (exports, merges, policy changes) with evidence trails.
- **Cost‑Aware:** FinOps dashboards; quotas per plugin/org; budget hints; no Sev‑1s; p95 plugin exec < **1.2s** (cached).

**DoD Gate:**

1. Demo: install plugin from Marketplace → grant minimal capabilities → run action in sandbox → results show provenance & cost.
2. Ingest blocked by contract violation → fix via mapping patch → contract tests pass → ingest proceeds.
3. Governance workflow: policy change → review/approve → applied with audit; denial shows reasons & appeal.

---

## 1) Epics → Objectives

1. **Plugin Marketplace (PLG‑E1)** — Catalog, capability manifest, install/uninstall, sandboxed execution, reviews/ratings.
2. **Sandbox & Capabilities (SBX‑E2)** — VM/worker isolation, syscall allowlist, GraphQL scope, budgets, telemetry.
3. **Data Contracts (DC‑E3)** — Schema registry (JSON‑Schema/Avro), contract tests, CI gates, version negotiation.
4. **Governance Workflows (GOV‑E4)** — Review/approve queues for exports, merges, policy updates; evidence attachments.
5. **FinOps & Ops (FIN‑E5)** — Quotas per plugin/org, cost meters, dashboards, alerts; marketplace publishing flow.
6. **QA/Docs (QA‑E6)** — Golden contracts, plugin samples, E2E flows, operator/author docs.

---

## 2) Swimlanes

### Frontend (React + MUI + jQuery)

- Marketplace: list/detail/install; capability prompts; ratings; search & filters.
- Plugin Runner UI: inputs form, budget/cost preview, run + logs; provenance & citation chips.
- Data Contracts UI: registry browser, diff view, contract test runner, enforcement toggles.
- Governance: review queues, approval modals, reason‑for‑decision; audit view.

### Backend (Node/Express + Apollo + Workers + Neo4j/Postgres/Redis)

- Plugin registry API; signed manifests; storage of versions; semantic search.
- Sandbox runner (VM2/isolated-workers) with budgets, capability broker, syscall filter.
- Schema registry & contract tests; mapping patch generator; enforcement hooks at ingest/export.
- Governance service: queues, SLAs, required approvers, notifications; audit log integration.
- FinOps: plugin meters, org quotas, budget hints, Stripe‑compatible marketplace hooks.

### Ops/SRE & Security

- Isolation hardening, resource limits, seccomp (where applicable), read‑only FS for plugins.
- Grafana: plugin latency/cost, quota usage, contract failures, approval SLAs.

### QA/Docs

- Sample plugins (enricher, visual overlay, exporter); contract golden sets; governance playbook; marketplace author guide.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### Plugin Marketplace (28 pts)

1. Catalog + detail + install/uninstall.  
   **AC:** Signed manifest verified; version pinning; uninstall cleans capabilities & cache. (**L**)
2. Capability consent flow.  
   **AC:** Minimal set by default; user can toggle; audit entry created; revoke path. (**M**)
3. Ratings & search.  
   **AC:** Weighted score; abuse report; semantic search across manifests. (**M**)

### Sandbox & Capabilities (26 pts)

4. Isolated runner with budgets.  
   **AC:** CPU/memory/time budgets enforced; denial reasons; per‑call provenance. (**L**)
5. Capability broker APIs.  
   **AC:** Fine‑grained scopes (read:graph, write:case, net:deny by default); tests for leakage. (**L**)
6. Telemetry & logs.  
   **AC:** Plugin stdout/stderr captured; PII‑safe; metrics exported. (**M**)

### Data Contracts (22 pts)

7. Schema registry + diff.  
   **AC:** JSON‑Schema/Avro versions; diff view; deprecation warnings. (**L**)
8. Contract tests & gates.  
   **AC:** Ingest/export blocked on failure; mapping patch suggestions; CI job. (**L**)

### Governance (12 pts)

9. Review/approve workflows.  
   **AC:** Required approvers by policy; SLAs; notifications; full audit trail; appeal path. (**M**)

### QA/Docs (4 pts)

10. Samples + E2E + docs.  
    **AC:** Sample plugins published; golden contract set; governance playbook. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Plugin Manifest (capabilities)

```json
// plugins/samples/enricher/manifest.json
{
  "name": "sample-enricher",
  "version": "0.1.0",
  "entry": "index.js",
  "capabilities": {
    "graph": ["read"],
    "cases": ["read", "write"],
    "network": false
  },
  "budgets": { "ms": 800, "memoryMB": 256, "rows": 50000 },
  "permissions": ["use:nl2cypher"]
}
```
````

### 4.2 Sandbox Runner (VM2/Workers)

```ts
// server/src/plugins/sandbox.ts
import { NodeVM } from 'vm2';
export async function runPlugin(
  code: string,
  manifest: any,
  ctx: any,
  args: any,
) {
  if (!ctx.capBroker.allow(manifest.capabilities))
    throw new Error('CapabilityDenied');
  const vm = new NodeVM({
    sandbox: { args, ctx: ctx.safe },
    timeout: manifest.budgets?.ms || 800,
    eval: false,
    wasm: false,
    console: 'redirect',
  });
  let memory = 0;
  const t0 = Date.now();
  try {
    const mod: any = vm.run(code);
    const res = await Promise.race([
      Promise.resolve(mod.run(args, ctx.api)),
      new Promise((_, rej) =>
        setTimeout(
          () => rej(new Error('Timeout')),
          manifest.budgets?.ms || 800,
        ),
      ),
    ]);
    const ms = Date.now() - t0;
    if (ms > (manifest.budgets?.ms || 800))
      throw new Error('BudgetExceeded:time');
    return { ok: true, res, ms };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
```

### 4.3 Capability Broker

```ts
// server/src/plugins/cap-broker.ts
export class CapBroker {
  constructor(private granted: any) {}
  allow(req: any) {
    if (req.network === true) return false; // deny by default
    for (const k of Object.keys(req)) {
      if (!this.granted[k]) return false;
      for (const s of req[k]) if (!this.granted[k].includes(s)) return false;
    }
    return true;
  }
}
```

### 4.4 Sample Plugin (enricher)

```js
// plugins/samples/enricher/index.js
module.exports.run = async function (args, api) {
  const entities = await api.graph.search({ q: args.q, limit: 10 });
  return entities.map((e) => ({ id: e.id, score: Math.random() }));
};
```

### 4.5 Schema Registry & Contract Test

```ts
// server/src/contracts/registry.ts
import { readFileSync } from 'fs';
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });
export function validate(schemaPath: string, payload: any) {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);
  const ok = validate(payload);
  return { ok, errors: validate.errors };
}
```

```yaml
# contracts/person.v1.json (excerpt)
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'title': 'PersonV1',
  'type': 'object',
  'required': ['name', 'id'],
  'properties':
    {
      'id': { 'type': 'string' },
      'name': { 'type': 'string' },
      'dob': { 'type': ['string', 'null'], 'format': 'date' },
    },
}
```

### 4.6 Governance Workflow (GraphQL)

```graphql
# server/src/graphql/governance.graphql
type ReviewTask {
  id: ID!
  kind: String!
  status: String!
  createdAt: DateTime!
  dueAt: DateTime
  requester: User!
  approvers: [User!]!
  evidence: [String!]!
  reason: String
}

type Mutation {
  requestPolicyChange(
    kind: String!
    payload: JSON!
    reason: String!
  ): ReviewTask!
  reviewApprove(id: ID!, note: String): ReviewTask!
  reviewDeny(id: ID!, reason: String!): ReviewTask!
}
```

### 4.7 jQuery — Install Plugin & Consent

```js
// apps/web/src/features/plugins/jquery-market.js
$(function () {
  $(document).on('click', '.install', function () {
    const id = $(this).data('id');
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `mutation{ pluginInstall(id:"${id}"){ id, capabilities } }`,
      }),
    });
  });
  $(document).on('click', '#grant', function () {
    const caps = collectCaps();
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `mutation{ pluginGrant(id:"${$('#pid').val()}", caps:${JSON.stringify(caps)}) }`,
      }),
    });
  });
});
```

### 4.8 FinOps — Meters & Quotas

```ts
// server/src/finops/meters.ts
import { Counter, Histogram } from 'prom-client';
export const pluginExec = new Histogram({
  name: 'plugin_exec_ms',
  help: 'Plugin exec time',
  buckets: [50, 100, 200, 400, 800, 1600],
});
export const pluginCost = new Counter({
  name: 'plugin_rows_total',
  help: 'Rows returned by plugin',
  labelNames: ['plugin', 'org'],
});
export function beforeRun(id: string) {
  return Date.now();
}
export function afterRun(id: string, org: string, t0: number, rows: number) {
  pluginExec.observe(Date.now() - t0);
  pluginCost.labels(id, org).inc(rows);
}
```

### 4.9 CI Gate — Contract Tests

```yaml
# .github/workflows/contracts.yml
name: Data Contracts
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/contracts/validate.js contracts/*.json samples/*.json
```

### 4.10 k6 — Plugin & Governance Mix

```js
import http from 'k6/http';
export const options = { vus: 40, duration: '3m' };
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query:
        'mutation{ pluginRun(id:"sample-enricher", input:{ q:"acme" }){ ok } }',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query:
        'mutation{ requestPolicyChange(kind:"export_gate", payload:{"threshold":0.9}, reason:"tighten export" ){ id } }',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Registry & catalog; sandbox runner baseline; capability broker.
- **D3–D4:** Contract registry + tests + enforcement; Marketplace install/consent UI.
- **D5–D6:** Governance queues & approvals; audit integration; FinOps meters/quotas.
- **D7:** Sample plugins; CI gates; dashboards.
- **D8–D10:** Hardening, E2E, docs, runbooks, demo polish.

---

## 6) Risks & Mitigations

- **Sandbox escapes** → deny‑by‑default caps, no net/fs by default, seccomp/read‑only FS, fuzz tests.
- **Contract churn** → versioned schemas, deprecation windows, auto‑patch suggestions.
- **Approval bottlenecks** → SLA alerts, backup approvers, queue ownership.
- **Cost spikes** → quotas, per‑plugin budgets, kill switch, marketplace review.

---

## 7) Metrics

- Plugin exec p95/p99; quota hits; contract pass/fail; approval SLA; blocked capability requests; error budgets.

---

## 8) Release Artifacts

- **ADR‑036:** Plugin sandbox & capability model.
- **ADR‑037:** Data contracts & enforcement strategy.
- **RFC‑033:** Governance workflow & approvals.
- **Runbooks:** Sandbox incident; contract failure triage; approval backlog; quota breach.
- **Docs:** Plugin author guide; Marketplace publishing; Data contracts; Governance how‑to.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Install **sample‑enricher** → grant minimal capabilities → run with budget & see provenance/cost.
2. Ingest JSON failing contract → view diff & suggested mapping patch → re‑run contract tests → ingest passes.
3. Request export‑policy change → reviewer approves → policy applies; then request deny scenario → show appeal path.
4. Show FinOps dashboard: plugin p95, costs, quotas; Marketplace search/ratings.

---

## 11) Out‑of‑Scope (backlog)

- Remote plugin hosting; revenue share payouts; WASM plugins; contract inference; multi‑tenant plugin isolation across orgs.

```

```
