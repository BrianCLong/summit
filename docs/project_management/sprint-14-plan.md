# IntelGraph — Sprint 14 Plan (Aug 29–Sep 12, 2025)

> Objective: Ship a thin, end‑to‑end, production‑ready slice that proves **provenanced evidence export**, **policy‑enforced access**, and a **tri‑pane analyst UI** with **NL→Cypher sandbox**. This aligns to GA‑Core and Near‑Term roadmap goals.

---

## 0) Meta

- **Duration:** 10 working days
- **Release tag:** `v0.14.0`
- **Branch:** `release/0.14.0` (feature branches per story)
- **Environments:** dev → stage (preview PR envs) → prod
- **Teams:** Core Graph, Prov‑Ledger, Platform Security, Web, SRE/DevEx, QA
- **Definition of Ready (DoR):** user story has AC, design notes, data contracts, test plan, demo script stub
- **Definition of Done (DoD):** all AC pass; unit/integration/e2e tests added; dashboards updated; docs + demo

---

## 1) Sprint Goal

Deliver a **prov‑ledger beta vertical** + **ABAC/OPA** gate at GraphQL + **tri‑pane UX skeleton** + **NL Graph Query sandbox** and **Ops SLO + Cost Guard MVP**.

---

## 2) Scope & Deliverables

**D1. Provenance & Claim Ledger — Beta Vertical (E2E)**

- Evidence registration API (`/evidence/register`) capturing checksum, license, chain‑of‑transforms
- Claim parsing → `Claim` nodes with contradiction links
- **Disclosure Bundle** export with a signed **manifest (hash tree)**
- External **Verifier CLI** to validate bundle integrity
- Minimal Web UI: show provenance tooltip + one‑click bundle export (case scope)

**D2. Security & Governance — ABAC/RBAC via OPA**

- GraphQL field‑level authz (persisted queries + policy labels)
- **Reason‑for‑Access** prompts; audit events
- **Authority Binding** scaffolding: attach legal basis to queries

**D3. Frontend — Tri‑Pane Skeleton + NL→Cypher Sandbox**

- React app shell (Graph/Map/Timeline) with synchronized brushing
- Provenance tooltips and confidence opacity in Graph view
- NL prompt → generated Cypher **preview** and **sandbox execute** (sandbox database)

**D4. Ops — SLO Dashboards + Cost Guard MVP**

- Prometheus/OTEL wiring for p95 graph query SLO & latency heatmaps
- Query **budgeter** + **slow‑query killer** (read‑only paths)

**Out of Scope (explicitly)**

- Predictive suite UI, advanced simulations, marketplace, mobile

---

## 3) Stories & Acceptance Criteria (BDD)

### S1. Register Evidence & Export Verifiable Bundle

**As** an analyst **I can** export a disclosure bundle for a case **so that** an external party can verify authenticity.

- **Given** a case with ≥1 evidence doc
- **When** I click _Export → Disclosure Bundle_
- **Then** the system produces a `.zip` containing data, `manifest.json` with hashes and transform chain, and a signature
- **And** running `verifier verify bundle.zip` returns _Valid_

### S2. Claim Graph & Contradictions

**As** an analyst **I can** see claims and contradictions **so that** I understand evidence conflicts.

- **Given** two sources asserting conflicting facts
- **When** I view Claim pane
- **Then** I see `supports`/`contradicts` edges and source provenance

### S3. ABAC/OPA Field‑Level Authz

**As** a tenant admin **I can** apply policies at field/type level **so that** users see only permitted data.

- **Given** a policy that hides `sensitivity=restricted`
- **When** user with role `analyst` runs a persisted query
- **Then** restricted fields are elided; audit contains user, reason‑for‑access

### S4. Reason‑for‑Access Prompting

- **Given** a query touching `need_to_know=case-X`
- **When** the user executes
- **Then** a modal prompts for justification and persists to immutable audit

### S5. NL→Cypher Sandbox

- **Given** a natural language prompt
- **When** I submit it
- **Then** I see generated Cypher with **cost/row estimate** and a **Run in sandbox** button
- **And** invalid Cypher never hits prod DB; sandbox results are labeled and ephemeral

### S6. Tri‑Pane Skeleton & Provenance Tooltip

- **Given** graph nodes with provenance
- **When** I hover a node
- **Then** a tooltip shows source, license, confidence, and last transform
- **And** timeline brushing filters map/graph synchronously

### S7. SLO Dashboard & Cost Guard

- **Given** live traffic
- **When** p95 graph query latency > SLO for 5m
- **Then** SLO burn alert fires in Slack
- **And** slow‑query killer cancels queries over budget with a user‑visible hint

---

## 4) Architecture & Implementation Notes

### 4.1 Services & Contracts

- **prov‑ledger** (new service): Node.js/Express GraphQL + Postgres for manifests; object store (S3‑compatible) for bundles; Kafka topic `prov.events`
- **gateway** (Apollo Server): persisted queries, cost estimator, OPA sidecar for authz
- **graph**: Neo4j 5.x; sandboxes via ephemeral Neo4j container per request (TTL)
- **web**: React 18 + Material UI; Cytoscape.js for graph; Mapbox GL for map; vis‑timeline for time; jQuery for DOM interactions/events in Cytoscape overlays

### 4.2 Data Model (additions)

- Node: `Claim { id, text, confidence, sources[], createdAt }`
- Edge: `contradicts`, `supports`
- Provenance: `Evidence { checksum, license, transforms[], signature }`
- Policy labels on nodes/edges: `sensitivity`, `clearance`, `need_to_know`, `legal_basis`

### 4.3 Security

- OPA sidecar, policy bundles via GitOps; reason‑for‑access modal writes immutable audit
- JWT (OIDC) + step‑up for exports; dual‑control for delete/purge remains locked behind feature flag

### 4.4 Cost Guard & SLO

- Query planner surfaces estimated cost; budgets per tenant; killer cancels on ≥N ms with hint
- OTEL traces span: `graphql.execute`, `neo4j.query`; Prometheus SLO panel, latency heatmap

---

## 5) Tasks & Hours (T‑shirt)

### Core Graph

- Cypher cost estimator + persisted queries (M)
- Sandbox execution path w/ ephemeral Neo4j (M)
- Claim schema & contradictions edges (S)

### Prov‑Ledger

- Evidence register API + Postgres schema (S)
- Manifest builder (hash tree) + signer (M)
- Verifier CLI (Python) (S)
- Bundle ZIP packager + S3 client (S)

### Platform Security

- OPA sidecar integration + policy pack (M)
- Reason‑for‑Access modal + audit append‑only log (S)
- Authority Binding stub (headers + context) (S)

### Web

- Tri‑pane shell (graph/map/timeline) (M)
- Provenance tooltip + confidence opacity (S)
- NL→Cypher UI, preview + run‑in‑sandbox (M)
- jQuery wiring for Cytoscape overlays & brushing (S)

### SRE/DevEx

- OTEL + Prometheus dashboards (S)
- Cost Guard killer + alerting (M)
- Helm charts & PR preview envs (S)

### QA

- Unit tests (Jest) + GraphQL contract tests (S)
- Playwright e2e path: import → claim → export → verify (M)
- K6 load: graph query SLO profile (S)

---

## 6) Test Plan (samples)

**Jest — GraphQL policy elision**

```ts
it('elides restricted fields under OPA', async () => {
  const res = await gqlPersisted(
    'CaseEntitiesRestricted',
    { id: 'C-1' },
    as('analyst'),
  );
  expect(res.errors).toBeFalsy();
  expect(res.data.entities.every((e) => e.sensitivity === undefined)).toBe(
    true,
  );
});
```

**Rego — deny restricted field**

```rego
package intelgraph.authz

deny[reason] {
  input.user.role == "analyst"
  some f
  input.query.fields[f] == "sensitivity"
  reason := "restricted field"
}
```

**Python — Verifier CLI (sketch)**

```python
import json, hashlib, zipfile, sys

with zipfile.ZipFile(sys.argv[1]) as z:
    manifest = json.loads(z.read('manifest.json'))
    for item in manifest['files']:
        data = z.read(item['path'])
        assert hashlib.sha256(data).hexdigest() == item['sha256']
print('Valid')
```

**k6 — SLO profile**

```js
import http from 'k6/http';
import { Trend } from 'k6/metrics';
const lat = new Trend('graph_latency');
export default function () {
  const r = http.post('https://gw/graphql', JSON.stringify({ query: '...' }));
  lat.add(r.timings.duration);
}
```

**Playwright — E2E happy path**

```ts
await page.goto('/cases/C-1');
await page.getByRole('button', { name: 'Export' }).click();
await page.getByText('Disclosure Bundle').click();
await expect(page.getByText('Export complete')).toBeVisible();
```

---

## 7) Dashboards & Alerts

- **SLO Panel:** p95 graph query < 1.5s; p99 < 3s
- **Heatmap:** Graph query latency by resolver
- **Alerts:** SLO burn, slow‑query killer activations, policy denials spike

---

## 8) Risks & Mitigations

- **Cypher generation validity <95%.** Mitigate: sandbox only + cost preview + regression tests.
- **Policy false positives.** Mitigate: dry‑run mode + feature flags + Ombuds review queue.
- **Bundle size growth.** Mitigate: streaming ZIP + dedupe + glacier tiering.
- **Brushing perf.** Mitigate: downsample timeline; debounced event bus.

---

## 9) Demo Script (Review 30 min)

1. Ingest sample → provenance recorded
2. NL prompt → Cypher preview → sandbox run
3. Tri‑pane brushing; provenance tooltip
4. Export disclosure bundle → run Verifier CLI live
5. Show SLO dashboard + slow‑query killer toast

---

## 10) Ops/Release Checklist

- Helm upgrades applied; OPA bundles published; PR envs green
- p95 SLO panel green for 24h on stage
- Security review: STRIDE diffs; secrets check
- Docs: runbooks, API, admin guide

---

## 11) Stretch (if time remains)

- Basic **Data License Registry** checks on export
- Minimal **Case Spaces** tasks pane (watchlist + @mentions)

---

## 12) RACI (condensed)

- **Responsible:** Core Graph (S1,S5), Prov‑Ledger (S1), Platform Security (S3,S4), Web (S6,S5), SRE (S7), QA (all)
- **Accountable:** Eng Lead
- **Consulted:** Ombuds, Legal, PM
- **Informed:** Exec sponsor

---

## 13) Backlog Candidates for Sprint 15

- STIX/TAXII connector + golden IO tests
- ER explainability panel
- Offline Expedition Kit v1 (sync, CRDT merges)
- Disclosure packager UI polish + right‑to‑reply fields

---

## 14) Jira/Linear Import Assets (CSV)

> Ready for Jira CSV import (Cloud/Server). Mapping: **Epic/Story/Sub-task**, **Story Points**, **Components**, **Labels**. If your Jira doesn’t accept `Sprint`, import first, then bulk-assign to the active sprint.

**SP mapping:** XS=1, S=3, M=8, L=13

```csv
Issue Type,Summary,Description,Priority,Labels,Story Points,Components,Epic Name,Epic Link,Sprint,Due Date
Epic,IG Sprint 14 Vertical,"Prov-ledger beta, ABAC/OPA, tri-pane skeleton, NL→Cypher sandbox, SLO+Cost Guard",Highest,"sprint-14,vertical",,"Graph;Web;Security;Prov-Ledger;SRE;QA",IG Sprint 14 Vertical,,,2025-09-12
Story,S1: Register Evidence & Export Verifiable Bundle,"Export bundle with manifest (hash tree) + signature; external Verifier CLI validates.",High,"sprint-14,prov-ledger,export",13,"Prov-Ledger;Web;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-05
Task,S1-T1: Evidence Register API,"POST /evidence/register → checksum, license, transforms; Postgres schema+migration.",Medium,"prov-ledger,api",5,"Prov-Ledger",,IG Sprint 14 Vertical,Sprint 14,2025-09-01
Task,S1-T2: Manifest Builder & Signer,"Build Merkle tree manifest; sign with KMS; attach to bundle.",Medium,"prov-ledger,crypto",5,"Prov-Ledger",,IG Sprint 14 Vertical,Sprint 14,2025-09-03
Task,S1-T3: Bundle Packager + S3 Client,"Stream ZIP; content-addressed paths; upload to S3-compatible store.",Medium,"prov-ledger,storage",3,"Prov-Ledger",,IG Sprint 14 Vertical,Sprint 14,2025-09-04
Task,S1-T4: Verifier CLI,"Python tool `verifier verify bundle.zip` with SHA-256 checks.",Medium,"cli,qa",3,"QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-05
Story,S2: Claim Graph & Contradictions,"Claim nodes; supports/contradicts edges; UI pane.",Medium,"graph,claims,ui",8,"Graph;Web;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-06
Task,S2-T1: Schema + Migrations,"Create Claim node, edges, indexes.",Medium,"graph,cypher",3,"Graph",,IG Sprint 14 Vertical,Sprint 14,2025-09-02
Task,S2-T2: Ingest Mapper,"Derive claims from evidence fields; link sources.",Medium,"ingest,graph",3,"Graph",,IG Sprint 14 Vertical,Sprint 14,2025-09-04
Task,S2-T3: UI Claim Pane,"List claims, provenance badges, conflict chips.",Medium,"web,ui",2,"Web",,IG Sprint 14 Vertical,Sprint 14,2025-09-06
Story,S3: ABAC/OPA Field-Level Authz,"OPA sidecar; persisted queries; field elision; audit.",High,"security,opa,authz",8,"Security;Gateway;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-09
Task,S3-T1: OPA Sidecar + Bundles,"Wire Rego policies; GitOps policy bundles.",Medium,"security,opa",3,"Security",,IG Sprint 14 Vertical,Sprint 14,2025-09-03
Task,S3-T2: Field-Level Elision,"Gateway evaluates policy→ hides restricted fields.",Medium,"gateway,security",3,"Security;Gateway",,IG Sprint 14 Vertical,Sprint 14,2025-09-06
Task,S3-T3: Audit Events,"Immutable append-only audit stream.",Medium,"audit,security",2,"Security",,IG Sprint 14 Vertical,Sprint 14,2025-09-09
Story,S4: Reason-for-Access Prompt,"User justification modal; persist to audit.",Medium,"security,ux",5,"Web;Security;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-08
Task,S4-T1: Modal + Flow,"Prompt on sensitive queries; cancel/continue.",Medium,"web,ux",2,"Web",,IG Sprint 14 Vertical,Sprint 14,2025-09-07
Task,S4-T2: Audit Write,"Attach reason to audit log entries.",Medium,"security,audit",2,"Security",,IG Sprint 14 Vertical,Sprint 14,2025-09-08
Story,S5: NL→Cypher Sandbox,"LLM-generated Cypher preview; run in sandbox DB; cost/row estimate.",High,"nlp,cypher,sandbox",13,"Graph;Web;Gateway;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-11
Task,S5-T1: UI Prompt→Preview,"Text input → generated Cypher + cost.",Medium,"web,nlp",3,"Web",,IG Sprint 14 Vertical,Sprint 14,2025-09-08
Task,S5-T2: Sandbox Executor,"Ephemeral Neo4j per run; TTL; results labeled ephemeral.",Medium,"graph,sandbox",5,"Graph",,IG Sprint 14 Vertical,Sprint 14,2025-09-10
Task,S5-T3: Cost Estimator,"Explain plan parse; budget preview.",Medium,"gateway,perf",3,"Gateway",,IG Sprint 14 Vertical,Sprint 14,2025-09-10
Story,S6: Tri‑Pane Skeleton & Provenance Tooltip,"Graph/Map/Timeline sync; provenance hover tooltip; brushing.",Medium,"web,graph,ux",8,"Web;Graph;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-10
Task,S6-T1: Shell + Layout,"3-pane layout; resizable; hotkeys.",Medium,"web,layout",3,"Web",,IG Sprint 14 Vertical,Sprint 14,2025-09-02
Task,S6-T2: Brushing Sync,"Timeline brush filters map/graph.",Medium,"web,events",3,"Web;Graph",,IG Sprint 14 Vertical,Sprint 14,2025-09-06
Task,S6-T3: Provenance Tooltip,"Source, license, confidence, last transform.",Medium,"web,ui",2,"Web",,IG Sprint 14 Vertical,Sprint 14,2025-09-09
Story,S7: SLO Dashboard & Cost Guard,"Prometheus/OTEL p95/p99; slow-query killer; Slack alerts.",High,"sre,observability,cost",8,"SRE;Gateway;QA",,IG Sprint 14 Vertical,Sprint 14,2025-09-12
Task,S7-T1: OTEL + Prom Dash,"Traces + panels; latency heatmap.",Medium,"observability",3,"SRE",,IG Sprint 14 Vertical,Sprint 14,2025-09-09
Task,S7-T2: Query Killer,"Budget-based cancel + user hint.",Medium,"gateway,perf",3,"Gateway",,IG Sprint 14 Vertical,Sprint 14,2025-09-11
Task,S7-T3: Alerts,"SLO burn → Slack; denials spike.",Medium,"alerts,sre",2,"SRE",,IG Sprint 14 Vertical,Sprint 14,2025-09-12
```

> **Linear users**: import the same CSV; map `Epic Name` to a parent project/epic; `Components` → labels.

---

## 15) GitHub Issues & Project (automation scripts)

**Create labels**

```bash
# one-time
for L in sprint-14 prov-ledger abac tri-pane nl-cypher ops graph web security sre qa gateway cli export sandbox opa observability cost; do
  gh label create "$L" -c "#ededed" || true
 done
```

**Create issues (Stories)**

```bash
# assumes gh is authenticated and repo: BrianCLong/intelgraph
repo=BrianCLong/intelgraph
mk(){ gh issue create -R $repo -t "$1" -b "$2" -l "$3" -p "Sprint 14"; }
mk "S1: Register Evidence & Export Verifiable Bundle" "Export bundle with manifest/signature; external CLI verifies." "sprint-14,prov-ledger,export"
mk "S2: Claim Graph & Contradictions" "Claim nodes; supports/contradicts edges; UI pane." "sprint-14,graph"
mk "S3: ABAC/OPA Field-Level Authz" "OPA sidecar; persisted queries; field elision; audit." "sprint-14,abac,security,gateway"
mk "S4: Reason-for-Access Prompt" "Modal + audit binding for sensitive queries." "sprint-14,security,web"
mk "S5: NL→Cypher Sandbox" "Preview Cypher; sandbox execution; cost estimate." "sprint-14,nl-cypher,sandbox,graph"
mk "S6: Tri‑Pane Skeleton & Provenance Tooltip" "Graph/Map/Timeline sync; tooltips; brushing." "sprint-14,web,graph,tri-pane"
mk "S7: SLO Dashboard & Cost Guard" "OTEL/Prom SLOs; slow-query killer; alerts." "sprint-14,ops,observability,cost,sre"
```

**Create tasks as checklists via issue body** (paste into each Story):

```md
- [ ] T1: … API / schema / UI
- [ ] T2: … tests (unit/integration/e2e)
- [ ] T3: … docs + demo notes
```

**Create a Project (v2) and views**

```bash
gh project create --owner BrianCLong --title "IntelGraph Sprint 14"
# Add fields: Status, Story Points
# Then add issues to the project:
for n in $(gh issue list -R $repo -s open -l sprint-14 -L 100 --json number -q '.[].number'); do
  gh project item-add 1 --owner BrianCLong --url https://github.com/$repo/issues/$n
 done
```

---

## 16) Branching, PR Template, and CI hooks

**Branches**

- `release/0.14.0`
- `feature/prov-ledger-bundle`
- `feature/abac-opa`
- `feature/tri-pane-shell`
- `feature/nl-to-cypher-sandbox`
- `feature/slo-cost-guard`

**PR Template (.github/pull_request_template.md)**

```md
## What & Why

## Acceptance Criteria

- [ ] Tests added/updated
- [ ] Dashboards updated (if applicable)
- [ ] OPA policy reviewed (if applicable)

## Risk & Rollback

## Demo Notes
```

**CI gates** (high level)

- Lint + unit tests → build → Docker images (tags: sha, `v0.14.0-rc{n}`)
- Spin up PR preview env via Helmfile overlay
- Post OPA dry-run report as PR comment

---

## 17) Calendar & Ceremonies (America/Denver)

- **Sprint start:** Fri, Aug 29, 2025
- **Standup:** Mon–Fri 9:30–9:45 AM MDT (Slack huddle + daily board sweep)
- **Mid-sprint review + risk check:** Wed, Sep 3, 3:00–3:30 PM MDT
- **Code freeze / hardening:** Thu, Sep 11, 12:00 PM MDT
- **Sprint review & live demo:** Fri, Sep 12, 10:00–10:30 AM MDT
- **Retro:** Fri, Sep 12, 3:30–4:00 PM MDT

---
