```markdown
# IntelGraph — Next Sprint Plan (v0.6.0)
**Slug:** `sprint-2025-09-29-intelgraph-v0-6`  
**Date:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2025-09-29 → 2025-10-10 (10 business days)  
**Goal Theme:** Ship the **Auditable Intelligence Core**: ingestion→ER→graph analytics→NL/Cypher preview→provenance export, wrapped in tri‑pane UI with guardrails, SLOs, and cost controls.

---
## 0) North Stars & Acceptance Gate (Definition of Done)
- **Provenance > Prediction:** All materialized artifacts (graphs, briefs, exports) carry lineage + license + authority bindings.
- **Compartmentation by Default:** RBAC/ABAC enforced on GraphQL resolvers; OPA policies dry‑run + enforce.
- **AI with Receipts:** NL→Cypher preview with cost estimates; RAG replies include citations; blocked actions show policy reasons.
- **Ops First:** p95 graph query < 1.5s @ 50k nodes neighborhood; ingestion E2E < 5m for 10k docs.
- **Ethics Gate:** No features enabling unlawful harm; all exports checked against license/authority compiler.

**Sprint DoD:**
1) Demo: Ingest CSV→map schema→ER queue→tri‑pane investigation→NL query→generated Cypher→sandbox run→report studio export with provenance bundle.  
2) SLO dashboard shows compliant latency on demo dataset.  
3) 100% of GraphQL mutations covered by authZ tests + audit trail.

---
## 1) High‑Level Epic Map → Objectives (What we ship in 2 weeks)
1. **Ingestion & Mapping (A2/A4)** — Ingest Wizard MVP: CSV/JSON mapping, PII flags, license registry enforcement, lineage stamps.  
2. **Entity Resolution Core (B1/C3)** — Deterministic + probabilistic ER with explainable scorecards and manual reconcile queue.  
3. **Tri‑Pane Analyst UI (I)** — Graph (Cytoscape.js) + Timeline + Map with synchronized brushing; pinboards, filter chips.  
4. **NL→Cypher (D1)** — Prompt→generated Cypher preview, row/cost estimates, sandbox execution, diff vs. manual query.  
5. **Provenance & Claim Ledger (B4)** — Evidence registration; export manifests (hash tree + transform chain).  
6. **Governance & Guardrails (F)** — OPA policy bundle; warrant/license compiler gating exports; reason‑for‑access prompts.  
7. **Ops & Cost Guard (H)** — SLO dashboards; slow‑query killer; query budget hints; Helm chart updates.  
8. **QA/Docs** — Golden datasets; test packs; operator playbook; user study checklist.

---
## 2) Swimlanes & Workstreams

### 2.1 Frontend Experience (React + MUI + Cytoscape.js + jQuery enchants)
- **FE-1** Tri‑Pane shell (Graph/Timeline/Map) with synchronized cursors & time‑brushing.
- **FE-2** Graph canvas interactions via **jQuery** wrappers (drag, lasso, context actions) integrated with Cytoscape events.
- **FE-3** NL Query panel → Cypher preview → run in sandbox; diff panel vs manual Cypher.
- **FE-4** Report Studio MVP: figure snapshots (graph/map/timeline), caption assistant, export to HTML/PDF (server‑side).
- **FE-5** A11y + keyboard palette; dark/light; saved views.

### 2.2 Backend Graph & ETL (Node.js/Express + Apollo GraphQL + Neo4j)
- **BE-1** Ingest Wizard API: schema introspection, mapping persistence, PII classifier stub, lineage stamping.
- **BE-2** Streaming ETL jobs (BullMQ + Redis) with enrichers (GeoIP, language, hash, EXIF scrub, OCR stub hooks).
- **BE-3** ER service: rules + probabilistic scoring; explainability panel payloads; reconcile queue CRUD.
- **BE-4** GraphQL schema for Canonical Model (Person/Org/Asset/Account/Location/Event/Document/Claim/Case).
- **BE-5** NL→Cypher engine: prompt→generated Cypher; cost estimator; sandbox executor with query budget.

### 2.3 Provenance, Guardrails & Export
- **PG-1** Claim/Evidence registration; provenance manifest builder (Merkle tree over transforms + inputs).
- **PG-2** License/Authority Compiler: blocklist/allowlist by source terms; query‑time annotations; export gate.
- **PG-3** Audit trail: who/what/why/when; reason‑for‑access modal; immutable log sink.

### 2.4 Ops, SRE & Security
- **OP-1** SLO dashboards (Prometheus + Grafana); latency heatmaps; error budgets.
- **OP-2** Slow query killer; archived tiering; Helm chart params for budgets/concurrency.
- **OP-3** OPA policy bundles; SCIM sync stub; WebAuthn/FIDO2 toggle; JWT hardening.

### 2.5 QA, Data, and Docs
- **QA-1** Golden dataset pack (CSV/JSON + fixtures) for ingest→ER→analysis e2e.
- **QA-2** Contract tests: connectors, GraphQL, Cypher sandbox; k6 perf scripts.
- **DOC-1** Operator playbook; analyst quick‑start; security & privacy guide v0.

---
## 3) Sprint Backlog (User Stories with AC & Est.)
> Scoring: **S** (1), **M** (3), **L** (5), **XL** (8). Target: ~80 points across team.

### FE — Tri‑Pane & NL Query (28 pts)
1. **As an analyst**, I can see Graph/Timeline/Map panes with synchronized time‑brush.  
   **AC:** Brush in timeline filters graph & map; p95 redraw < 200ms; saved view persists. (**L**)
2. **As an analyst**, I can right‑click a node to open actions (expand/pin/path) via jQuery context menu.  
   **AC:** Menu accessible by keyboard; no XSS via labels; actions emit Redux events. (**M**)
3. **As an analyst**, I can type NL query and preview generated **Cypher** with an estimated row/cost budget.  
   **AC:** ≥95% syntactically valid Cypher on test prompts; cost estimate ±20% of actual rows; blocked if over budget, with reason. (**XL**)
4. **As an analyst**, I can snapshot current tri‑pane view to Report Studio and export with provenance.  
   **AC:** Export HTML/PDF includes hash manifest & citations placeholders. (**M**)

### BE — Ingest, ER, GraphQL, NL→Cypher (34 pts)
5. **As a data steward**, I can map CSV → canonical schema with PII flags and license selection.  
   **AC:** Mapping saved; PII fields marked; license saved; lineage recorded on import. (**L**)
6. **As a platform**, I enrich documents with GeoIP/language/hash and queue for ER.  
   **AC:** 10k docs in <5m E2E on demo rig; failed jobs retried 3x; DLQ metrics visible. (**L**)
7. **As a reviewer**, I can view ER candidates with scores & feature deltas; approve/merge or split.  
   **AC:** Decisions recorded; undo supported; audit entries created. (**L**)
8. **As a developer**, I have GraphQL schema & resolvers for Canonical Model with ABAC checks.  
   **AC:** 100% mutations covered by authZ tests; depth/complexity limits enforced. (**M**)
9. **As an analyst**, I can safely run generated Cypher in a sandbox with bounded resources.  
   **AC:** Time limit + row limit + memory limit enforced; explain denial reasons. (**M**)

### PG — Provenance & Guardrails (12 pts)
10. **As a case owner**, I can export a provenance bundle (manifest + transforms + license terms).  
    **AC:** External verifier script validates manifest; tamper triggers failure. (**M**)
11. **As an ombuds**, I see blocked export attempts with human‑readable policy reasons and appeal path.  
    **AC:** Reason‑for‑access prompts logged; appeal workflow stub. (**M**)

### OP — SLO, Budgets, Security (10 pts)
12. **As SRE**, I can see p95 graph query latency & ingest throughput on Grafana with error budgets.  
    **AC:** Dashboards live; alerts on breach; runbook links. (**M**)
13. **As a platform**, I kill slow queries and suggest cheaper alternatives (budget hints).  
    **AC:** Killer threshold configurable; hints logged; regression test. (**M**)

### QA/DOC — Tests & Guides (8 pts)
14. **As QA**, I run k6 perf + Jest + Supertest; Playwright E2E for tri‑pane flows.  
    **AC:** CI gates on thresholds; screenshots archived. (**M**)
15. **As a user**, I follow a quick‑start from ingest to report in <30 min.  
    **AC:** Dogfooding session passes; feedback captured. (**S**)

---
## 4) Architecture Snapshots (Scaffolds)

### 4.1 Repo Structure (additions)
```

server/ src/ graphql/ schema.graphql resolvers/ index.ts authz.ts ingest/ mapping.ts pii.ts enrichers/{geoip.ts,language.ts,hash.ts,exif.ts} er/ rules.ts probabilistic.ts explain.ts nl2cypher/ engine.ts cost.ts sandbox.ts provenance/ manifest.ts export.ts ops/ metrics.ts budgets.ts tests/ e2e/ contract/ apps/web/ src/ store/ components/ TriPane/ GraphCanvas/ ReportStudio/ features/nlquery/ public/ ops/ helm/ grafana/ k6/

````

### 4.2 GraphQL Schema (core excerpt)
```graphql
# schema.graphql
scalar DateTime

type EntityID { id: ID!, type: String! }

type Person { id: ID!, name: String!, aliases: [String!]!, claims: [Claim!]!, policy: PolicyLabel! }
# ... Org, Asset, Account, Location, Event, Document, Case

type Claim { id: ID!, subject: EntityID!, predicate: String!, object: String!,
             source: Source!, confidence: Float!, license: String!,
             observedAt: DateTime!, recordedAt: DateTime! }

type Source { id: ID!, name: String!, hash: String!, transformChain: [String!]! }

type Query {
  entity(id: ID!): EntityID
  searchEntities(q: String!, limit: Int = 50): [EntityID!]!
  path(a: ID!, b: ID!, k: Int = 3): [EntityID!]!
}

type Mutation {
  ingestMappingCreate(input: IngestMappingInput!): IngestMapping!
  ingestRun(mappingId: ID!, sourceUrl: String!): Job!
  erDecision(input: ERDecisionInput!): ERResult!
  exportProvenance(caseId: ID!): ExportBundle!
}
````

### 4.3 Apollo Server + Neo4j (TypeScript)

```ts
// server/src/index.ts
import 'dotenv/config'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import express from 'express'
import neo4j, { Driver } from 'neo4j-driver'
import { readFileSync } from 'fs'
import resolvers from './graphql/resolvers'
import { authzPlugin } from './graphql/resolvers/authz'

const typeDefs = readFileSync('server/src/graphql/schema.graphql', 'utf8')
const app = express()

const driver: Driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
)

const server = new ApolloServer({ typeDefs, resolvers, plugins: [authzPlugin()] })
await server.start()
app.use('/graphql', express.json(), expressMiddleware(server, {
  context: async ({ req }) => ({
    user: req.user, // from upstream authn
    abac: req.abac, // attributes for OPA
    driver
  })
}))

app.listen(4000, () => console.log('GraphQL on :4000'))
```

### 4.4 NL → Cypher Engine (sketch)

```ts
// server/src/nl2cypher/engine.ts
import { estimateCost } from './cost'
import { runSandbox } from './sandbox'

export async function nlToCypher(prompt: string, schemaHint: string) {
  // Call LLM with schema/system prompts kept server‑side; strip PII via regex/allowlist
  const cypher = await generateCypher(prompt, schemaHint)
  const estimate = await estimateCost(cypher)
  return { cypher, estimate }
}

export async function executeSandbox(cypher: string, budget: { rows: number; ms: number; memoryMB: number }) {
  if (!withinBudget(budget)) throw new Error('BudgetExceeded')
  return await runSandbox(cypher, budget)
}
```

### 4.5 ER Scoring (rules + probabilistic)

```ts
// server/src/er/probabilistic.ts
export function scoreCandidate(a: any, b: any) {
  const features = {
    nameJaro: jaro(a.name, b.name),
    emailExact: +(a.email && b.email && a.email === b.email),
    phoneEdit: editDistance(a.phone, b.phone)
  }
  const w = { nameJaro: 0.5, emailExact: 0.9, phoneEdit: -0.1 }
  const score = w.nameJaro*features.nameJaro + w.emailExact*features.emailExact + w.phoneEdit*Math.min(features.phoneEdit, 3)
  return { score, features }
}
```

### 4.6 Provenance Manifest (Merkle)

```ts
// server/src/provenance/manifest.ts
import { createHash } from 'crypto'

export interface ManifestItem { path: string; hash: string }
export interface Manifest { algo: 'sha256'; items: ManifestItem[]; merkleRoot: string }

export function buildManifest(files: Buffer[], paths: string[]): Manifest {
  const items = files.map((buf, i) => ({ path: paths[i], hash: sha256(buf) }))
  const merkleRoot = merkle(items.map(i => i.hash))
  return { algo: 'sha256', items, merkleRoot }
}

function sha256(b: Buffer) { return createHash('sha256').update(b).digest('hex') }
function merkle(leaves: string[]) {
  let layer = leaves
  while (layer.length > 1) {
    const next: string[] = []
    for (let i = 0; i < layer.length; i += 2) next.push(sha256(Buffer.from((layer[i]||'') + (layer[i+1]||''))))
    layer = next
  }
  return layer[0] || ''
}
```

### 4.7 jQuery Enchants for Graph Canvas

```js
// apps/web/src/components/GraphCanvas/jquery-hooks.js
$(function(){
  $('#graph').on('contextmenu', '.node', function(e){
    e.preventDefault();
    const id = $(this).data('id')
    $('#ctx').css({ top: e.pageY, left: e.pageX }).show().data('id', id)
  })
  $('#ctx .action').on('click', function(){
    const action = $(this).data('action')
    const id = $('#ctx').data('id')
    window.dispatchEvent(new CustomEvent('graph:action', { detail: { action, id } }))
    $('#ctx').hide()
  })
})
```

### 4.8 OPA Policy (export gate)

```rego
package intelgraph.export

default allow = false

allow {
  input.user.role == "case_owner"
  input.export.license in {"MIT","CC-BY","CONSENTED"}
  not blocked_selector[input]
}

blocked_selector[input] {
  some i
  input.export.fields[i] == "sensitive.biometric"
}
```

### 4.9 Helm Values (budgets)

```yaml
# ops/helm/values.yaml
server:
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"
  queryBudget:
    rows: 200000
    ms: 2000
    memoryMB: 512
  slowQueryKiller:
    enabled: true
    thresholdMs: 5000
```

### 4.10 k6 Perf Smoke

```js
import http from 'k6/http'
import { sleep, check } from 'k6'
export const options = { vus: 10, duration: '2m' }
export default function(){
  const res = http.post('http://localhost:4000/graphql', JSON.stringify({
    query: '{ searchEntities(q:"acme", limit:20){ type } }'
  }), { headers: { 'Content-Type': 'application/json' }})
  check(res, { 'status 200': r => r.status === 200 })
  sleep(1)
}
```

---

## 5) Delivery Plan & Milestones

- **Day 1–2:** Ingest Wizard backend + FE form; mapping save; PII flags; lineage stamps.
- **Day 3–4:** ETL enrichers + ER rules/probabilistic; reconcile queue UI.
- **Day 5–6:** Tri‑pane shell; jQuery context menu; saved views.
- **Day 7–8:** NL→Cypher engine + cost estimator; sandbox executor; denial reasons.
- **Day 9:** Provenance export bundle; OPA export gate; Report Studio snapshot/export.
- **Day 10:** SLO dashboards; slow query killer; k6 + E2E tests; demo polish.

**Milestone Demos:**

- M1 (D4): Ingest→ER walk‑through with scorecards.
- M2 (D8): NL→Cypher with budget preview and sandbox run.
- M3 (D10): Report export with manifest + policy gate.

---

## 6) Risks & Mitigations

- **Cypher generation accuracy** — Mitigate with schema‑aware prompts + unit golden tests; always preview + sandbox.
- **ER false merges/splits** — Human‑in‑loop review; explainability panel; reversible merges with audit.
- **Perf regressions** — Budgets + killer; k6 perf gates; cost hints.
- **Policy drift** — OPA bundles versioned; dry‑run simulator; ombuds review queue.

---

## 7) Metrics & Telemetry

- p95 GraphQL resolver latency; Cypher sandbox exec time; ingest throughput; ER queue age; slow‑query kill count; export denials by reason; user task time for common flows; error budgets consumed.

---

## 8) Definition of Ready (DoR)

- User story has AC, test notes, data fixtures, security/privacy notes, and rollout plan.
- Feature flags identified; failure modes noted; owner + reviewer assigned.

---

## 9) Team & Ownership

- **FE:** Owner A (Tri‑pane, NL panel), Owner B (Report Studio).
- **BE:** Owner C (Ingest/ETL), Owner D (ER/GraphQL), Owner E (NL→Cypher).
- **PG:** Owner F (Provenance/Export Gate).
- **OP:** Owner G (SLO, killer, Helm).
- **QA/DOC:** Owner H (tests), Owner I (docs).

---

## 10) Test Matrix (excerpt)

| Area      | Test                                | Tool             | Gate         |
| --------- | ----------------------------------- | ---------------- | ------------ |
| Ingest    | Mapping → lineage → ER queue        | Jest + Supertest | CI required  |
| ER        | Score calc + explainability payload | Jest             | CI required  |
| GraphQL   | AuthZ depth/complexity              | Jest             | CI required  |
| NL→Cypher | Validity ≥95% on prompts            | Jest             | CI required  |
| UI        | Tri‑pane E2E flows                  | Playwright       | CI required  |
| Perf      | p95 latency, ingest E2E             | k6               | CI required  |
| Export    | Manifest verify (hash, merkle)      | Node script      | Release gate |

---

## 11) Release Artifacts

- **ADR-012:** NL→Cypher sandbox design.
- **ADR-013:** Provenance manifest format.
- **RFC-021:** License/Authority Compiler MVP.
- **Runbooks:** Ingest On‑Call; ER Triage; Export Gate Appeals.
- **Docs:** Analyst Quick‑Start; Security & Privacy Guide v0; Operator SLO dashboards.

---

## 12) Out‑of‑Scope (next sprint)

- Full Graph‑XAI counterfactuals; Zero‑knowledge federation; Advanced simulations; Offline/edge kits; Selective disclosure wallets.

```
```
