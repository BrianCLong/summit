````markdown
# IntelGraph — Copilot, Prompt Studio & Guarded Autonomy Sprint (v1.6.0)

**Slug:** `sprint-2026-03-02-intelgraph-v1-6`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-03-02 → 2026-03-13 (10 business days)  
**Theme:** **Investigation Copilot & Promptable Automations** — schema‑aware NL→Cypher prompt studio, tool‑use actions (ingest/expand/path/export) under strict guardrails, eval harness, and safety/ethics dashboards.

---

## 0) North Stars & DoD

- **Copilot with Receipts:** Every suggestion/action includes citations, cost estimates, and policy checks with visible reasons.
- **Prompt Studio:** Versioned prompt sets per tenant/case with offline diffs, red‑teaming, and automatic regressions.
- **Guarded Autonomy:** Toolformer‑style actions proposed by the copilot run only in **sandbox** mode unless explicitly approved; all actions are logged with purpose and budget.
- **Ops SLOs:** Copilot response p95 < **1.2s** (cached); NL→Cypher validity ≥ **97%** on golden prompts; zero Sev‑1.

**DoD Gate:**

1. Demo: analyst opens Prompt Studio → edits prompt set → Copilot proposes path query + budget; analyst approves; sandbox shows safe diff → results with citations.
2. Red‑team prompt triggers deny with clear policy reason; mitigation suggestion displayed.
3. Eval harness runs on golden set and reports accuracy, latency, and cost deltas; regression gates CI.
4. Safety dashboard shows blocked/approved actions, cost budgets consumed, and prompt set lineage.

---

## 1) Epics → Objectives

1. **Copilot Orchestrator (CPL‑E1)** — Tool registry, action planner, sandbox executor, cost & policy guards.
2. **Prompt Studio (PRM‑E2)** — Versioned prompts/templates, diff/review, red‑team tests, rollout & rollback.
3. **Eval Harness (EVAL‑E3)** — Golden prompts, metrics (validity, answer F1, cost), CI gates, drift alarms.
4. **Safety & Ethics (SAFE‑E4)** — OPA policies for actions, reason‑for‑access, purpose binding integration, safety dashboards.
5. **Ops & Docs (OPS‑E5)** — Telemetry, budgets, incident playbooks, analyst/copilot guide.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- Copilot side‑panel: chat, action suggestions (chips), cost preview, policy reasons.
- Prompt Studio: list, editor with diff view, red‑team test runner, rollout controls.
- Safety dashboard: blocked actions, budget usage, denial reasons; filters by case/user.

### Backend (Node/Express + Apollo + Redis + Python NL service)

- Orchestrator: tool registry, planner, sandbox runner, audit log, budget & OPA checks.
- Prompt service: store/retrieve prompt sets; templating/vars; red‑team test executor.
- Eval harness worker: run golden prompts; compute metrics; push to CI and Grafana.

### Ops/SRE & Security

- Budgets per org/case; rate limits; error budgets.
- Grafana: copilot latency, validity %, blocked actions, cost per action, prompt version adoption.

### QA/Docs

- Golden set creation; red‑team pack; Playwright/E2E; Copilot & Prompt Studio guides.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ **90 pts**

### Copilot Orchestrator (32 pts)

1. Tool registry & planner.  
   **AC:** Tools: `searchEntities`, `expand`, `path`, `ingestRun`, `exportPreview`; planner outputs JSON plan; unit tests. (**L**)
2. Sandbox executor + budget.  
   **AC:** Enforces rows/ms/memory; denial reasons; diff vs. live; audit log. (**L**)
3. Cost estimator & citations collector.  
   **AC:** ±20% cost estimate; citations attached to results; tests. (**M**)

### Prompt Studio (26 pts)

4. Prompt set CRUD + versioning & diff view.  
   **AC:** Git‑like history; reviewers; rollback; JSON schema validation. (**L**)
5. Red‑team test runner.  
   **AC:** Tests with tags; deny list verified; mitigation hints shown. (**M**)
6. Rollout gates & canaries.  
   **AC:** % rollout by org/case; auto rollback on regression; audit. (**M**)

### Eval Harness (18 pts)

7. Golden prompts + metrics.  
   **AC:** Validity %, answer F1 on labeled set, latency, cost; Grafana panels. (**L**)
8. CI gates.  
   **AC:** Fail PR if validity < 97% or cost delta > +15%; artifacts uploaded. (**M**)

### Safety (10 pts)

9. OPA policies for actions + purpose.  
   **AC:** Deny/allow with reasons; purpose required; appeals queue. (**M**)

### QA/Docs (4 pts)

10. Playwright E2E + Guides.  
    **AC:** Chat→plan→sandbox→approve flow; docs updated. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Orchestrator — Tool Registry & Planner (TypeScript)

```ts
// server/src/copilot/tools.ts
export type Tool = {
  name: string;
  schema: any;
  run: (args: any, ctx: any) => Promise<any>;
};
export const registry: Record<string, Tool> = {};
export function register(t: Tool) {
  registry[t.name] = t;
}

register({
  name: 'searchEntities',
  schema: { q: 'string', limit: 'number' },
  async run(args, ctx) {
    return ctx.driver.executeQuery(
      'MATCH (n) WHERE n.name CONTAINS $q RETURN n LIMIT $limit',
      args,
    );
  },
});
register({
  name: 'path',
  schema: { a: 'string', b: 'string', k: 'number' },
  async run(args, ctx) {
    /* call k‑paths */
  },
});
```
````

```ts
// server/src/copilot/planner.ts
export type Plan = {
  steps: { tool: string; args: any; budget?: { rows: number; ms: number } }[];
};
export function plan(prompt: string): Plan {
  // naive: detect intent keywords → choose tools
  if (/path between/i.test(prompt))
    return {
      steps: [
        {
          tool: 'path',
          args: { a: 'A', b: 'B', k: 3 },
          budget: { rows: 10000, ms: 800 },
        },
      ],
    };
  return {
    steps: [{ tool: 'searchEntities', args: { q: prompt, limit: 20 } }],
  };
}
```

### 4.2 Sandbox Executor & Budget Guard

```ts
// server/src/copilot/sandbox.ts
export async function runSandbox(step: any, ctx: any) {
  const t0 = Date.now();
  const res = await registry[step.tool].run(step.args, ctx);
  const ms = Date.now() - t0;
  if (step.budget && ms > step.budget.ms)
    throw new Error('BudgetExceeded:time');
  // row budget check (pseudo)
  const rows = Array.isArray(res.records)
    ? res.records.length
    : res.records?.length || 0;
  if (step.budget && rows > step.budget.rows)
    throw new Error('BudgetExceeded:rows');
  return { ms, rows, res };
}
```

### 4.3 Prompt Set Model & Diff

```ts
// server/src/prompts/store.ts
import { readFileSync, writeFileSync } from 'fs';
export type PromptSet = {
  id: string;
  name: string;
  version: string;
  system: string;
  examples: any[];
  tests: any[];
};
export function save(ps: PromptSet) {
  writeFileSync(`prompts/${ps.id}.json`, JSON.stringify(ps, null, 2));
}
export function load(id: string) {
  return JSON.parse(readFileSync(`prompts/${id}.json`, 'utf8'));
}
export function diff(a: PromptSet, b: PromptSet) {
  return {
    system: [a.system, b.system],
    examples: { a: a.examples.length, b: b.examples.length },
  };
}
```

### 4.4 Red‑Team Runner

```ts
// server/src/prompts/redteam.ts
export type RT = {
  id: string;
  prompt: string;
  expect: 'deny' | 'allow';
  reason?: string;
};
export async function runRedTeam(
  setId: string,
  tests: RT[],
  exec: (p: string) => Promise<any>,
) {
  const results = [];
  for (const t of tests) {
    const out = await exec(t.prompt);
    const passed =
      (t.expect === 'deny' && out.denied) ||
      (t.expect === 'allow' && !out.denied);
    results.push({ id: t.id, passed, reason: out.reason });
  }
  return results;
}
```

### 4.5 OPA Policy — Copilot Actions

```rego
package intelgraph.copilot

default allow = false

allow {
  input.user.role in {"analyst","case_owner"}
  input.action.tool in {"searchEntities","path","expand","exportPreview"}
  not over_budget
  has_purpose
}

over_budget { input.budget.ms > 2000 }

has_purpose { input.user.purpose != "" }
```

### 4.6 GraphQL — Copilot API

```graphql
# server/src/graphql/copilot.graphql
type CopilotPlan {
  steps: [CopilotStep!]!
  costMs: Int!
  reason: String
}
input CopilotInput {
  prompt: String!
  budgetRows: Int = 200000
  budgetMs: Int = 1500
}

type Query {
  copilotPlan(input: CopilotInput!): CopilotPlan!
}

type Mutation {
  copilotExecute(plan: String!): CopilotResult!
}
```

### 4.7 jQuery — Copilot Panel Hooks

```js
// apps/web/src/features/copilot/jquery-copilot.js
$(function () {
  $('#ask').on('click', function () {
    const prompt = $('#prompt').val();
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `{ copilotPlan(input:{ prompt:"${prompt}" }){ steps costMs reason } }`,
      }),
    });
  });
  $(document).on('click', '.approve-step', function () {
    const plan = $(this).data('plan');
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `mutation{ copilotExecute(plan:"${plan}"){ ok, rows, ms } }`,
      }),
    });
  });
});
```

### 4.8 Eval Harness — Metrics & CI

```ts
// tools/eval/index.ts
export async function evaluate(setId: string) {
  const ps = load(setId);
  let valid = 0,
    total = 0,
    costMs = 0;
  for (const ex of ps.examples) {
    total++;
    const { cypher, ok, ms } = await genAndValidate(ex.prompt, ex.expected);
    if (ok) valid++;
    costMs += ms;
  }
  return { validity: valid / total, avgMs: costMs / total };
}
```

```yaml
# .github/workflows/copilot-eval.yml
name: Copilot Eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/eval/run.js prompts/default.json > eval.json
      - run: node tools/eval/gate.js eval.json 0.97 0.15
```

### 4.9 Safety Dashboard Panels (Grafana YAML)

```yaml
panels:
  - title: Copilot p95 latency
    query: histogram_quantile(0.95, sum(rate(copilot_ms_bucket[5m])) by (le))
  - title: NL→Cypher validity %
    query: sum(rate(cypher_valid_total[5m])) / sum(rate(cypher_attempt_total[5m]))
  - title: Blocked actions by reason
    query: sum(rate(copilot_blocked_total[5m])) by (reason)
  - title: Cost per action (ms)
    query: sum(rate(copilot_cost_ms_sum[5m])) / sum(rate(copilot_cost_ms_count[5m]))
```

### 4.10 k6 — Copilot Load

```js
import http from 'k6/http';
export const options = {
  vus: 40,
  duration: '3m',
  thresholds: { http_req_duration: ['p(95)<1200'] },
};
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query:
        '{ copilotPlan(input:{ prompt:"find connections between acme and bob" }){ steps } }',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Tool registry, planner, sandbox & budgets; Copilot UI shell.
- **D3–D4:** Prompt Studio CRUD/versioning + diff; red‑team runner.
- **D5–D6:** Eval harness + CI gates; safety dashboard & OPA guards.
- **D7–D8:** Cost/citation collector; E2E flows; canary rollout.
- **D9–D10:** Perf tuning, docs, runbooks, demo polish.

---

## 6) Risks & Mitigations

- **Prompt regressions** → versioned sets, CI eval gates, canary rollouts.
- **Over‑automation** → sandbox by default, explicit approvals, audits, purpose binding.
- **Cost overruns** → budgets, estimator, hints, slow‑query killer integration.
- **Policy bypass** → OPA deny‑by‑default + tests + shadow logging.

---

## 7) Metrics

- Copilot p95/p99; NL→Cypher validity; blocked/approved actions; average cost per action; red‑team pass rate; SLO compliance.

---

## 8) Release Artifacts

- **ADR‑032:** Copilot orchestrator & sandbox.
- **ADR‑033:** Prompt Studio versioning & rollout.
- **RFC‑031:** Safety policies for copilot actions.
- **Runbooks:** Copilot outages; budget exceed; red‑team failures; rollback of prompt sets.
- **Docs:** Analyst Copilot guide; Prompt Studio authoring; Safety dashboard.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Edit prompt set → diff & review → 25% canary rollout.
2. Ask Copilot for a "shortest path" → see plan, budget, and policy reasons; approve → sandbox executes → results with citations.
3. Run red‑team test → denial with reason + mitigation; show safety dashboard.
4. Show eval report & CI gates; finalize rollout.

---

## 11) Out‑of‑Scope (backlog)

- Autonomous long‑running agents; multi‑turn tool learning; marketplace for prompt packs; human‑feedback training loops.

```

```
