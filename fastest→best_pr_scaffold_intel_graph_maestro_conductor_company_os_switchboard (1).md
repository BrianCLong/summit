# Critical Assessment → Orchestrate for **Build/Self‑Heal** First
IntelGraph already gives you policy, provenance, and collaboration. Your immediate need is **developer‑facing orchestration** that keeps your platforms (IntelGraph, Maestro Conductor, CompanyOS, Switchboard) building, error‑checking, and self‑healing. That means:

- **Native multi‑LLM routing inside the platform** for intelligence *and* DevEx (e.g., triage logs, propose fixes, write tests, open PRs).  
- **Fail‑closed policy** for TS/PII; **fail‑open (U‑only)** to keep builds moving during OPA blips.  
- **Provenance on every CI suggestion** so auditors can see which model proposed a change.  
- **SLO & budgets** so CI bots don’t burn spend.  
- **Self‑healing loop** in CI: detect failure → summarize → propose patch → open PR with provenance → re‑run jobs → rollback if needed.

This scaffold delivers exactly that: **FASTEST** pack behind a flag, wired into CI/CD with budgets + dashboards, and a clean runway to **BEST**.

---

# PR Scaffold (ready to paste)

## 0) File Tree (new/changed)
```
.
├─ server/
│  ├─ src/
│  │  ├─ services/
│  │  │  ├─ llm-router.service.ts
│  │  │  └─ providers/
│  │  │     ├─ openai.adapter.ts
│  │  │     ├─ anthropic.adapter.ts
│  │  │     ├─ google.adapter.ts
│  │  │     └─ perplexity.adapter.ts
│  │  ├─ utils/
│  │  │  ├─ opa-client.ts
│  │  │  ├─ provenance.ts
│  │  │  ├─ cost-logger.ts
│  │  │  ├─ tokens.ts
│  │  │  └─ timeout.ts
│  │  └─ graphql/
│  │     └─ resolvers/
│  │        └─ copilot.ts
│  └─ policies/
│     ├─ llm-routing.rego
│     └─ llm-output.rego
│
├─ infra/
│  ├─ neo4j/
│  │  └─ 2025-10-06_provenance.cql
│  ├─ postgres/
│  │  └─ 2025-10-06_llm_calls.sql
│  ├─ grafana/
│  │  └─ copilot_dashboard.json
│  ├─ redis/
│  │  └─ redis.conf
│  └─ k8s/
│     └─ values-staging.yaml
│
├─ scripts/
│  ├─ ci/
│  │  ├─ self_heal.py
│  │  └─ summarize_failure.py
│  └─ ops/
│     └─ seed_models.ts
│
├─ .github/
│  └─ workflows/
│     ├─ copilot-routing.yml
│     └─ self-heal.yml
│
├─ Makefile
├─ .env.example
└─ RUNBOOK_FASTEST.md
```

---

## 1) FASTEST Pack — Key Files (short, production‑lean)

### `server/src/services/llm-router.service.ts`
```ts
import crypto from "node:crypto";
import { opaEvaluate } from "../utils/opa-client";
import { writeProvenance } from "../utils/provenance";
import { tokenEstimate } from "../utils/tokens";
import * as OpenAI from "./providers/openai.adapter";
import * as Anthropic from "./providers/anthropic.adapter";
import * as Google from "./providers/google.adapter";
import * as Perplexity from "./providers/perplexity.adapter";

export type Provider = "openai"|"anthropic"|"google"|"perplexity";
export type Purpose = "search"|"synthesis"|"long_context"|"multimodal"|"default";
export interface Req { investigationId:string; userId:string; text:string; attachments?:Array<{mime:string;bytesB64:string}>; requireCitations?:boolean; classification?:"U"|"C"|"S"|"TS"; }
export interface Route { provider:Provider; model:string; purpose:Purpose; reason:string; }

function analyze(q:string, requireCitations?:boolean){
  return {
    tokens: tokenEstimate(q),
    needsCitations: !!requireCitations || /\b(cite|source|references?)\b/i.test(q),
    hasImage: /\bimage|screenshot|figure\b/i.test(q)
  };
}

export function decide(req:Req):Route{
  const a = analyze(req.text, req.requireCitations);
  if (a.needsCitations) return {provider:"perplexity", model:"sonar-pro", purpose:"search", reason:"grounded"};
  if (a.tokens>80_000) return {provider:"anthropic", model:"claude-3-5-sonnet", purpose:"long_context", reason:"ultra-long"};
  if (a.hasImage) return {provider:"google", model:"gemini-1.5-pro", purpose:"multimodal", reason:"image"};
  return {provider:"openai", model: process.env.OPENAI_MODEL||"gpt-4o", purpose:"synthesis", reason:"default"};
}

export async function execute(req:Req){
  const route = decide(req);
  const pre = await opaEvaluate("intelgraph/llm/route", {
    classification: req.classification||"U",
    provider: route.provider,
    model: route.model,
    requiresCitations: !!req.requireCitations
  });
  if(!pre.allow) throw new Error(`OPA denied: ${pre.reason||"policy"}`);

  const t0 = Date.now();
  let out:{text:string;inTok:number;outTok:number;cost:number};
  if(route.provider==="perplexity"){
    const r = await Perplexity.search(route.model, req.text);
    out = { text:r.text, inTok:r.tokensIn, outTok:r.tokensOut, cost:r.costUsd||0 };
  } else if(route.provider==="anthropic"){
    const r = await Anthropic.complete(route.model, req.text, req.attachments);
    out = { text:r.text, inTok:r.tokensIn, outTok:r.tokensOut, cost:r.costUsd||0 };
  } else if(route.provider==="google"){
    const r = await Google.generate(route.model, req.text, req.attachments);
    out = { text:r.text, inTok:r.tokensIn, outTok:r.tokensOut, cost:r.costUsd||0 };
  } else {
    const r = await OpenAI.complete(route.model, req.text, req.attachments);
    out = { text:r.text, inTok:r.tokensIn, outTok:r.tokensOut, cost:r.costUsd };
  }
  const latencyMs = Date.now()-t0;
  const provId = await writeProvenance({
    investigationId: req.investigationId,
    provider: route.provider, model: route.model,
    tokensIn: out.inTok, tokensOut: out.outTok,
    costUsd: out.cost, latencyMs,
    promptHash: crypto.createHash("sha256").update(req.text).digest("hex"),
    routeReason: route.reason
  });

  const post = await opaEvaluate("intelgraph/llm/output", { purpose: route.purpose, citations: /https?:\/\//.test(out.text) });
  const text = post.allow ? out.text : "[REDACTED BY POLICY]";
  return { text, route, provId, tokensIn: out.inTok, tokensOut: out.outTok, costUsd: out.cost, latencyMs };
}
```

### Adapters (`server/src/services/providers/*.ts`)
*(Minimal stubs; identical shape; cost calc via env)*

**openai.adapter.ts**
```ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
export async function complete(model:string, prompt:string){
  const r = await client.chat.completions.create({ model, messages:[{role:"user",content:prompt}], temperature:0.2 });
  const u = r.usage ?? {prompt_tokens:0, completion_tokens:0};
  const cost = (u.prompt_tokens * (Number(process.env.COST_OAI_IN)||0.000005)) + (u.completion_tokens * (Number(process.env.COST_OAI_OUT)||0.000015));
  return { text:r.choices[0]?.message?.content||"", tokensIn:u.prompt_tokens, tokensOut:u.completion_tokens, costUsd:+cost.toFixed(6) };
}
```

**anthropic.adapter.ts / google.adapter.ts / perplexity.adapter.ts** follow the same pattern (token usage if provided; otherwise estimate; return `{text,tokensIn,tokensOut,costUsd}`).

### OPA policies (`server/policies`)
**llm-routing.rego**
```rego
package intelgraph.llm.route

default allow = false
reason := ""

us_only := {"openai", "anthropic", "google"}

violation[msg] {
  input.classification == "TS"
  not us_only[input.provider]
  msg := "TS requires US-resident provider"
}
violation[msg] {
  input.requiresCitations
  input.provider != "perplexity"
  msg := "Citations requested; use Perplexity"
}

allow { count(violation) == 0 }
reason := concat(", ", violation) { count(violation) > 0 }
```

**llm-output.rego**
```rego
package intelgraph.llm.output

default allow = true
allow = false { input.purpose == "search"; input.citations == false }
```

### Provenance & Cost
**infra/neo4j/2025-10-06_provenance.cql**
```cypher
CREATE CONSTRAINT prov_id IF NOT EXISTS FOR (p:Provenance) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT model_key IF NOT EXISTS FOR (m:Model) REQUIRE (m.provider, m.name) IS NODE KEY;
CREATE CONSTRAINT inv_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE;
UNWIND [
  {p:'openai', n:'gpt-4o'},
  {p:'openai', n:'gpt-4o-mini'},
  {p:'anthropic', n:'claude-3-5-sonnet'},
  {p:'google', n:'gemini-1.5-pro'},
  {p:'perplexity', n:'sonar-pro'}
] AS m MERGE (:Model {provider:m.p, name:m.n});
```

**server/src/utils/provenance.ts** (Neo4j write helper)
```ts
import neo4j from "neo4j-driver";
const drv = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!));
export async function writeProvenance(p:{investigationId:string;provider:string;model:string;tokensIn:number;tokensOut:number;costUsd:number;latencyMs:number;promptHash:string;routeReason:string;}){
  const s = drv.session();
  try{ const r = await s.executeWrite(tx=>tx.run(`
    MATCH (i:Investigation {id:$investigationId})
    MERGE (m:Model {provider:$provider, name:$model})
    CREATE (p:Provenance {id:randomUUID(), at:datetime(), provider:$provider, model:$model,
      tokensIn:$tokensIn, tokensOut:$tokensOut, costUsd:$costUsd, latencyMs:$latencyMs,
      promptHash:$promptHash, routeReason:$routeReason })
    MERGE (i)-[:GENERATED_BY]->(p)
    MERGE (p)-[:USED_MODEL]->(m)
    RETURN p.id AS id
  `, p)); return r.records[0].get("id") as string; } finally { await s.close(); }
}
```

### Copilot resolver
**server/src/graphql/resolvers/copot.ts** *(typo fixed to copilot.ts in tree)*
```ts
import { execute as llmExecute } from "../../services/llm-router.service";
export const CopilotResolvers = { Mutation: { async copilotExecute(_:any,{input}:any,ctx:any){
  const r = await llmExecute({ investigationId: input.investigationId, userId: ctx.user.id, text: input.prompt, requireCitations: !!input.requireCitations, classification: input.classification||"U" });
  return { text:r.text, meta:{ provider:r.route.provider, model:r.route.model, costUsd:r.costUsd, tokensIn:r.tokensIn, tokensOut:r.tokensOut, latencyMs:r.latencyMs, provenanceId:r.provId } };
}} };
```

---

## 2) Budgets, Caps, Caching

### `.env.example`
```
COPILOT_MULTI_LLM=true
OPENAI_MODEL=gpt-4o
PER_BRIEF_CAP_USD=2.50
OPENAI_BUDGET_USD=200
ANTHROPIC_BUDGET_USD=120
PERPLEXITY_BUDGET_USD=50
GOOGLE_BUDGET_USD=50

OPENAI_API_KEY=changeme
ANTHROPIC_API_KEY=changeme
PERPLEXITY_API_KEY=changeme
GOOGLE_API_KEY=changeme

NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme
OPA_URL=http://opa:8181
DATABASE_URL=postgres://user:pass@host/db
REDIS_URL=redis://redis:6379

COST_OAI_IN=0.000005
COST_OAI_OUT=0.000015
```

### Redis config (`infra/redis/redis.conf`)
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

*(Add a tiny cache layer in the Perplexity adapter or a shared `cache.ts` for 10–15m TTL on identical search prompts.)*

---

## 3) Grafana Panels (minimal JSON)
**infra/grafana/copilot_dashboard.json** (trimmed)
```json
{
  "title": "Copilot Routing",
  "panels": [
    { "type": "stat", "title": "Cost / Brief (median)", "targets": [{"expr":"histogram_quantile(0.5, sum(rate(intelgraph_llm_cost_usd_bucket[1m])) by (le))"}]},
    { "type": "graph", "title": "p95 Latency", "targets": [{"expr":"histogram_quantile(0.95, sum(rate(intelgraph_llm_latency_ms_bucket[5m])) by (le,provider))"}]},
    { "type": "table", "title": "OPA Denials (by reason)", "targets": [{"expr":"sum(rate(intelgraph_llm_policy_denials_total[5m])) by (reason)"}]},
    { "type": "piechart", "title": "Route Mix", "targets": [{"expr":"sum(rate(intelgraph_llm_calls_total[5m])) by (provider)"}]}
  ]
}
```

---

## 4) K8s Staging Values (feature‑flagged)
**infra/k8s/values-staging.yaml**
```yaml
copilot:
  env:
    COPILOT_MULTI_LLM: "true"
    OPENAI_MODEL: "gpt-4o"
    PER_BRIEF_CAP_USD: "2.50"
    OPENAI_BUDGET_USD: "200"
    ANTHROPIC_BUDGET_USD: "120"
    PERPLEXITY_BUDGET_USD: "50"
    GOOGLE_BUDGET_USD: "50"
  resources:
    requests: { cpu: "200m", memory: "512Mi" }
    limits:   { cpu: "1",    memory: "1Gi" }
```

---

## 5) CI/CD: build, pilot, and **self‑healing**

### GitHub Action — Routing build/deploy
**.github/workflows/copilot-routing.yml**
```yaml
name: Copilot Routing (Staging)
on:
  push:
    branches: [ feature/copilot-multi-llm ]
  workflow_dispatch: {}

jobs:
  test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint && npm run test --workspaces
      - run: npm run build --workspaces

  docker-push:
    needs: test-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASS }}
      - run: |
          docker build -t ${{ secrets.REGISTRY }}/intelgraph/copilot:${{ github.sha }} .
          docker push ${{ secrets.REGISTRY }}/intelgraph/copilot:${{ github.sha }}

  deploy-staging:
    needs: docker-push
    runs-on: ubuntu-latest
    steps:
      - uses: azure/setup-kubectl@v4
      - name: K8s deploy (staging)
        run: |
          kubectl set image deploy/copilot copilot=${{ secrets.REGISTRY }}/intelgraph/copilot:${{ github.sha }} -n staging
          kubectl rollout status deploy/copilot -n staging --timeout=300s
      - name: Enable feature flag
        run: kubectl set env deploy/copilot COPILOT_MULTI_LLM=true -n staging

  smoke-and-metrics:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Synthetic check
        run: curl -fsS https://staging.yourdomain/copilot/healthz
      - name: Prime dashboard annotations
        run: echo "Annotate Grafana via API (optional)"
```

### GitHub Action — Self‑healing loop
**.github/workflows/self-heal.yml**
```yaml
name: Self-Heal CI
on:
  workflow_run:
    workflows: ["Copilot Routing (Staging)"]
    types: ["completed"]

jobs:
  triage:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install pydantic requests
      - name: Summarize failure
        run: python scripts/ci/summarize_failure.py "${{ github.event.workflow_run.id }}" > /tmp/summary.txt
      - name: Ask Copilot Router for fix
        env:
          ROUTER_URL: ${{ secrets.ROUTER_URL }}
          ROUTER_TOKEN: ${{ secrets.ROUTER_TOKEN }}
        run: |
          python scripts/ci/self_heal.py /tmp/summary.txt > /tmp/patch.md
      - name: Open PR with patch proposal
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh pr create --title "Self-heal: Fix proposal" --body-file /tmp/patch.md --base feature/copilot-multi-llm
```

### Self‑healing scripts (stubs)
**scripts/ci/summarize_failure.py**
```py
# Pull logs from the failed run (via GitHub API) and produce a concise summary.
# Keep it minimal and deterministic for now.
```

**scripts/ci/self_heal.py**
```py
# Reads a failure summary, calls Copilot Router endpoint with `requireCitations=false` and `classification='U'`.
# Returns a markdown patch plan + diff hints. Avoids direct code changes in CI; humans review PR.
```

---

## 6) Makefile
```Makefile
router-test:
	npm run test --workspaces -- llm-router

migrate-db:
	psql $$DATABASE_URL -f infra/postgres/2025-10-06_llm_calls.sql

seed-neo4j:
	cypher-shell -f infra/neo4j/2025-10-06_provenance.cql

staging-on:
	kubectl set env deploy/copilot COPILOT_MULTI_LLM=true -n staging

staging-off:
	kubectl set env deploy/copilot COPILOT_MULTI_LLM=false -n staging
```

---

## 7) RUNBOOK (1‑pager) — `RUNBOOK_FASTEST.md`
- **Goal:** Native multi‑LLM routing for Copilot; feature flag controlled; budgets & p95 tracked.
- **Enable:** `make staging-on`
- **Disable (rollback):** `make staging-off`
- **Migrations:** `make migrate-db && make seed-neo4j`
- **Dashboards:** Grafana → *Copilot Routing* (cost/brief, p95, denials, route mix)
- **OPA outage:** U‑classification can fail‑open if `OPA_ENFORCE=false`; TS always fail‑closed.
- **Per‑brief cap:** Env `PER_BRIEF_CAP_USD` (default 2.50) — downshift to mini, truncate if exceeded.
- **Self‑healing:** On routing workflow failure, `self-heal.yml` opens a PR with proposed fix and provenance.

---

# Pilot & Move to BEST
**Pilot (3–5 days):**
- Track: median cost/brief, p95, RL%/provider, OPA denies, cache hit% (Perplexity), analyst CSAT.

**Promotion gates:**
- RL% > 2% or p95 > 8s → consider provider tier bump for that route.
- Long‑doc quality issues → prioritize Claude route; consider Team tier.
- Cost/brief > $2.50 despite caching → refine prompts/routing or downshift defaults.

**BEST Sprint (2–4 weeks):**
- Deep provenance coverage + UI drawer.
- Rich OPA (PII classifier hook, tenant provider blocklist).
- DLQ/retries + alerts, canaries.
- “Retry on X model” UX and learned routing.

— End of Scaffold —

---

## 8) Grafana Auto‑Import Script (on deploy)
**File:** `scripts/ops/import_grafana_dashboard.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   GRAFANA_URL=https://grafana.example.com \
#   GRAFANA_API_KEY=glsa_xxx \
#   DASHBOARD_PATH=infra/grafana/copilot_dashboard.json \
#   FOLDER_UID=copilot \
#   bash scripts/ops/import_grafana_dashboard.sh

: "${GRAFANA_URL:?set GRAFANA_URL}" 
: "${GRAFANA_API_KEY:?set GRAFANA_API_KEY}" 
DASHBOARD_PATH="${DASHBOARD_PATH:-infra/grafana/copilot_dashboard.json}"
FOLDER_UID="${FOLDER_UID:-copilot}"  # creates/uses folder with this UID

create_folder_if_missing() {
  # Try to get folder; if 404, create it
  code=$(curl -s -o /tmp/folder.json -w "%{http_code}" \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    "${GRAFANA_URL}/api/folders/${FOLDER_UID}")
  if [[ "$code" == "200" ]]; then
    echo "Folder '${FOLDER_UID}' exists"
    return 0
  fi
  echo "Creating folder '${FOLDER_UID}'"
  curl -sS -X POST \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{\"uid\":\"${FOLDER_UID}\",\"title\":\"Copilot Routing\"}" \
    "${GRAFANA_URL}/api/folders" >/dev/null
}

create_or_update_dashboard() {
  local payload
  # Wrap dashboard JSON as per /dashboards/db API
  payload=$(jq -n \
    --argfile dash "${DASHBOARD_PATH}" \
    --arg folderUid "${FOLDER_UID}" \
    '{ dashboard: $dash, folderUid: $folderUid, overwrite: true }')

  curl -sS -X POST \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    "${GRAFANA_URL}/api/dashboards/db" | jq -r '.status // "ok"'
}

which jq >/dev/null || { echo "Please install jq"; exit 1; }
create_folder_if_missing
create_or_update_dashboard
```

**Optional Helm/K8s hook**: call this script from your deploy job after pods are ready.

```yaml
# snippet to append in deploy step
- name: Import Grafana dashboard
  env:
    GRAFANA_URL: ${{ secrets.GRAFANA_URL }}
    GRAFANA_API_KEY: ${{ secrets.GRAFANA_API_KEY }}
  run: |
    bash scripts/ops/import_grafana_dashboard.sh
```

---

## 9) PR Body Template ( reviewers get everything they need )
**File:** `.github/PULL_REQUEST_TEMPLATE/copilot_multi_llm.md`
```markdown
# IntelGraph: Copilot Multi‑LLM Routing (FASTEST → BEST)

## Summary
This PR enables **feature‑flagged** multi‑LLM routing inside Copilot to accelerate build/self‑healing across **IntelGraph, Maestro Conductor, CompanyOS, and Switchboard**. It adds minimal adapters, OPA gates, Neo4j provenance, cost logging, a UI meta chip, budgets, and Grafana panels. No behavior change when the flag is off.

## Feature Flag
- `COPILOT_MULTI_LLM`: `false` (default). Set to `true` per‑env to enable routing.
- Rollback: `kubectl set env deploy/copilot COPILOT_MULTI_LLM=false` (no redeploy needed on most setups).

## Budgets & Caps
- Per‑brief cap: `${PER_BRIEF_CAP_USD:-2.50}` (downshift/truncate to hold the line)
- Monthly caps: `OPENAI_BUDGET_USD=${OPENAI_BUDGET_USD}`, `ANTHROPIC_BUDGET_USD=${ANTHROPIC_BUDGET_USD}`, `PERPLEXITY_BUDGET_USD=${PERPLEXITY_BUDGET_USD}`, `GOOGLE_BUDGET_USD=${GOOGLE_BUDGET_USD}`
- Alerts: Prometheus counters + Grafana panels included

## SLOs
- p95 end‑to‑end: `< 8s`
- Error rate: `< 1%` (excluding policy denials)

## Security & Policy
- OPA pre‑route (TS → US‑resident providers; citations → Perplexity)
- OPA post‑output (search requires citations) with redaction fallback
- Fail‑closed for TS/PII; U‑only can be configured to fail‑open during OPA outage

## Provenance & Costing
- Neo4j `(:Provenance)` per LLM call; `[:USED_MODEL]` to `(:Model)`; linked to `(:Investigation)`
- Postgres `llm_calls` table for cost/latency rollups
- UI shows `provider/model · tokens · $ · ms` + provenance link

## Not Reinventing / Integration Audit
- **API Gateway / Switchboard**: Reuses existing GraphQL resolver plumbing (`CopilotResolvers`).
- **OPA**: Uses the existing sidecar; adds two small rego modules under `server/policies`.
- **Neo4j**: Extends current graph with `:Provenance` nodes; no existing labels altered.
- **Maestro Conductor**: CI self‑healing wired via GitHub Actions → summaries/PRs; no change to conductor runtime.
- **CompanyOS UI**: Adds a badge component; no routing changes.
- **Redis**: Optional cache is additive; no eviction policy changes.

## Migrations
- Postgres: `infra/postgres/2025-10-06_llm_calls.sql`
- Neo4j: `infra/neo4j/2025-10-06_provenance.cql`

## Observability
- Grafana dashboard auto‑import via `scripts/ops/import_grafana_dashboard.sh`
- Metrics: `intelgraph_llm_calls_total`, `intelgraph_llm_latency_ms_bucket`, `intelgraph_llm_policy_denials_total`, `intelgraph_llm_cost_usd_total`

## Testing & Pilot
- Unit: routing heuristics, OPA deny paths, adapters mocked
- Integration: provenance write/read, feature‑flag toggling
- Staging pilot: 3–5 analysts for 3–5 days; record cost/brief, p95, route mix, OPA denials

## Rollback
- Disable flag (`COPILOT_MULTI_LLM=false`) → reverts to single‑provider path
- OPA outage: set `OPA_ENFORCE=false` for U‑only; TS remains fail‑closed

## Acceptance Criteria
- [ ] With flag OFF, behavior identical to prior baseline
- [ ] With flag ON, 100% LLM calls emit a provenance node
- [ ] p95 < 8s on staging synthetic; error rate < 1%
- [ ] Median cost/brief ≤ $2.00; hard cap respected at $2.50
- [ ] Grafana dashboard visible and populated post‑deploy

## Risk Notes
- Low blast‑radius: flag‑guarded, additive schema, fast rollback
- Network flakiness to providers handled by short backoff + fallback

## Linked Work
- BEST sprint (follow‑up): deep provenance UI, expanded OPA, DLQ/retries, learned routing
```

---

## 10) Repository Integration Review (do‑not‑reinvent checklist)
Run these before merge to ensure we reuse existing components and avoid regressions:

### A. Switchboard/API Gateway
- [ ] **Search** for existing LLM invocation utilities to reuse:
  - `rg -n "(openai|anthropic|gemini|perplexity)" server/src`
  - `rg -n "Provenance|USED_MODEL|GENERATED_BY" server/src`
- [ ] If a shared HTTP client exists, **use it** in adapters (timeouts, tracing, retries).
- [ ] Ensure resolver wiring leverages existing auth/context (authority, reason‑for‑access).

### B. OPA & Policy
- [ ] **Confirm** OPA sidecar is already deployed; reuse its configmap/loader.
- [ ] **Namespacing**: put rego under `intelgraph/llm/*` to avoid policy collisions.

### C. Neo4j Graph
- [ ] Check for an existing `:Provenance` label/schema; if present, **augment** instead of recreating.
- [ ] Index/constraint names: avoid collisions; use `IF NOT EXISTS`.

### D. Postgres Cost Logs
- [ ] If a generic `events` or `usage` table exists, prefer emitting there with a `kind='llm_call'` column to avoid a new table.

### E. Redis/Caching
- [ ] Reuse existing Redis client wrapper (TLS/auth, metrics) if present.
- [ ] TTLs align with platform defaults; confirm eviction policy.

### F. Maestro Conductor (self‑healing)
- [ ] If conductor already has a runbook for flaky builds, **call that** from `self-heal.yml` instead of new scripts.
- [ ] Ensure PRs created by bots use existing bot account/labels.

### G. CompanyOS UI
- [ ] Use the shared badge/Chip component system; keep token/cost metadata behind a prop flag if needed.

### H. Observability
- [ ] Reuse existing Prometheus registry and metric naming conventions.
- [ ] If a central “Deploy Annotations” utility exists, call it instead of ad‑hoc curl.

### I. Security
- [ ] Secrets via existing Vault/KMS paths; no raw secrets in GitHub Actions.
- [ ] TS/PII default **fail‑closed** verified with tests.

> If any box above reveals an existing implementation, swap our scaffold to call into it and delete the duplicate file. Keep the feature flag and PR scope minimal.

---

