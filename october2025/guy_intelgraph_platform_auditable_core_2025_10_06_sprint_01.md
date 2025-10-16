# Guy • IntelGraph Platform Workstream — **Auditable Core** (Sprint 01)

**Slug:** `guy-intelgraph-platform-auditable-core-2025-10-06-sprint-01`  
**Window:** Oct 6–Oct 17, 2025 (10 biz days)  
**Cadence alignment:** matches company Sprint 18 (per Q4’25 plan) with MC release gates (SBOM, SLSA, DPIA when applicable, rollback, disclosure pack).  
**Repo base:** `summit-main/` (apps/web, server, prov-ledger, graph-xai, helm, terraform).

---

## 0) Deep Review → Gap Map (in my lane)

**What’s clearly present**

- `apps/web` (Next14/React18) with Cytoscape-driven widgets; some jQuery hooks present.
- `server` (Node/TS) with GraphQL scaffolding and RAG services.
- `graph-xai` (Py) and `prov-ledger` (Py/FastAPI) with real code + tests.
- IaC: `helm/`, `terraform/`; policies exist in `SECURITY/policy/opa/*.rego`.

**Gaps vs. sprint goals & wishbooks**

1. **Tri‑pane Analyst UI (Graph+Timeline+Map)**: no consolidated `tri-pane/` feature; multiple components exist but not unified.
2. **NL→Cypher**: only in salvage/archives; no production service bound to GraphQL policy/cost preview.
3. **Provenance wiring**: `prov-ledger` is present, but no `server` integration middleware (claims on nodes/edges, export manifests on Report Studio).
4. **Report Studio & Case Spaces**: feature stubs missing in `apps/web`.
5. **OPA/ABAC in resolvers**: `.rego` present, but GraphQL resolvers do not enforce/query-time policy; no reason‑for‑access logging path.
6. **SLO/Telemetry**: Prom/OTEL bits exist, but no p95 graph‑query heatmap dashboards wired to demo path.
7. **Ingest Wizard MVP**: schema mapping/PII flags UI missing; backend enrichers exist.

**Quality debt (blocking Definition of Done)**

- Missing authZ tests covering **100% of GraphQL mutations** (per DoD).
- Canary/rollback workflow defined, but not parameterized per service in Helm values.
- No k6 load profiles for typical tri‑pane interactions.

---

## 1) Sprint Goal (my workstream)

Ship the **Auditable Intelligence Core** surface area: a working **tri‑pane** UI hooked to **policy‑enforced** GraphQL, **NL→Cypher** with **cost/row preview** and **sandbox execute**, and **provenance manifests** on export.

**Victory Conditions**

- Demo path: **CSV→Map→ER queue→Tri‑pane→NL→Cypher sandbox→Report export (with provenance)** runs end‑to‑end.
- **OPA/ABAC** enforced at resolvers with reason‑for‑access prompts; denials show human‑readable rule.
- **SLO dashboards** show p95 graph query < 1.5s on demo dataset; ingestion E2E < 5m for 10k docs.

---

## 2) Backlog (Stories → Acceptance)

### A. UI/UX

1. **Tri‑Pane Shell** (`apps/web/src/features/tri-pane/`)
   - _AC:_ Graph, Timeline, Map share selection and time‑brushing; pinboards; filter chips; A11y pass.
2. **Report Studio v0.1** (`apps/web/src/features/report-studio/`)
   - _AC:_ Compose exhibits from snapshot; export → calls `prov-ledger` to embed manifest; redaction presets honored.
3. **Ingest Wizard UI v0.1** (`apps/web/src/features/ingest-wizard/`)
   - _AC:_ CSV/JSON mapper, PII flags, license notices before import.

### B. Services

4. **NL→Cypher Service (Node)** (`server/src/ai/nl2cypher/`)
   - _AC:_ Prompt→generated Cypher (95% syntactic validity), **row/cost estimates**, **sandbox execute**.
5. **Provenance Hook** (`server/src/middleware/provenance/`)
   - _AC:_ All materialized artifacts attach claim IDs; exports hit `/prov-ledger/api/v1/bundle` and return hash tree.
6. **OPA Gate on GraphQL** (`server/src/policy/opa/`)
   - _AC:_ ABAC decision per resolver with reason‑for‑access; **deny → explain**; audit log event emitted.

### C. Ops & Observability

7. **SLO Dashboards** (`helm/observability` + Grafana)
   - _AC:_ p95 graph query latency panels, ingest E2E timer, cost guard triggers.
8. **Canary/Rollback Values** (`helm/*/values*.yaml`)
   - _AC:_ 10% canary slice per service; auto‑rollback on SLO/security/policy breach.
9. **k6 Profiles** (`tests/k6/`)
   - _AC:_ Load scripts emulate tri‑pane pivots & NL→Cypher preview.

---

## 3) Jira Subtasks CSV (import‑ready)

> Import after creating parent stories `IG‑####`; set real assignees/dates.

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Tests: Unit & Contract,"Add/extend unit + contract tests for resolvers, NL→Cypher, provenance hooks.",High,tests,server;web,,guy@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-12,IG-<parent>
Sub-task,IG,E2E: Golden Flow Validation,"CSV→Map→ER→Tri‑pane→NL→Cypher→Export. Screenshots + recordings.",High,e2e,server;web,,guy@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-15,IG-<parent>
Sub-task,IG,Docs: Spec & ADR,"NL→Cypher spec, OPA policy map, provenance bundle contract; 1–2 ADRs.",Medium,docs,docs,,guy@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-14,IG-<parent>
Sub-task,IG,Telemetry & SLO Wiring,"Prom/OTEL emitters, dashboards; p95 panels, ingest timers.",Medium,telemetry,gov-ops,,guy@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-11,IG-<parent>
Sub-task,IG,Security & Policy,"Resolver ABAC/OPA integration; reason‑for‑access logging; denial explainer.",High,security,server,,guy@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-10,IG-<parent>
Sub-task,IG,Demo Script,"2‑min demo path with safe synthetic data; disclosure pack build.",Medium,product,web,,guy@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-16,IG-<parent>
```

---

## 4) GitHub Projects v2 — `gh` bootstrap script

```bash
#!/usr/bin/env bash
set -euo pipefail
BOARD="IG Sprint 18 — Auditable Core"
REPO="BrianCLong/intelgraph"
PROJECT_ID=$(gh project create --title "$BOARD" --format json | jq -r '.id')
# Fields
gh project field-create $PROJECT_ID --name "Status" --data-type SINGLE_SELECT --options "Todo,In Progress,Blocked,Review,Done"
gh project field-create $PROJECT_ID --name "Type" --data-type SINGLE_SELECT --options "Story,Task,Bug,Chore"
gh project field-create $PROJECT_ID --name "Area" --data-type SINGLE_SELECT --options "Web,Server,ProvLedger,GraphXAI,Ops"
# Views
gh project view $PROJECT_ID --add-view "Kanban" --filter "Status!=Done"
# Add issues by label
for L in web server prov-ledger ops nl2cypher tri-pane; do gh project item-add $PROJECT_ID --owner "$REPO" --query "label:$L"; done
```

---

## 5) Architecture (ASCII)

```text
Browser (Tri‑pane UI)
  ├─ Graph (Cytoscape+jQuery)
  ├─ Timeline (VisX)
  └─ Map (MapboxGL)
      │
      ▼  GraphQL (Apollo)
Server (Node/TS)
  ├─ resolvers/ (OPA ABAC middleware → reason‑for‑access)
  ├─ ai/nl2cypher/ (prompt→cypher + cost/row + sandbox)
  ├─ rag/ (evidence‑first with citations)
  └─ provenance-mw/ (claim IDs on artifacts → prov‑ledger)
      │
      ▼
Prov‑Ledger (Py/FastAPI) ──> bundle(manifest.json + hash tree)
Neo4j (graph) · Postgres (ledger) · Redis (cache)
Observability: OTEL traces → Prom metrics → Grafana SLO boards
```

---

## 6) Code Scaffolding (drop‑in files)

### 6.1 Web — Tri‑Pane Shell (React + jQuery interop)

```tsx
// apps/web/src/features/tri-pane/TriPane.tsx
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import $ from 'jquery';
const Cytoscape = dynamic(() => import('react-cytoscapejs'), { ssr: false });
export default function TriPane() {
  const [selection, setSelection] = useState(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // jQuery bridge: broadcast selection to timeline & map
    $(document).on('ig:graph:select', (_e, payload) => setSelection(payload));
    return () => $(document).off('ig:graph:select');
  }, []);
  return (
    <div className="grid grid-cols-12 gap-3 p-3">
      <div className="col-span-6 rounded-2xl shadow">
        <Cytoscape
          elements={[]}
          stylesheet={[]}
          cy={(cy) => {
            cy.on('select', 'node', (e) =>
              $(document).trigger('ig:graph:select', e.target.data()),
            );
          }}
        />
      </div>
      <div className="col-span-3 rounded-2xl shadow" ref={timelineRef}>
        {/* timeline binds to selection via jQuery */}
      </div>
      <div id="map" className="col-span-3 rounded-2xl shadow" />
    </div>
  );
}
```

### 6.2 Server — OPA ABAC middleware

```ts
// server/src/policy/opa/abac.ts
import { createRequire } from 'module';
import { execFile } from 'child_process';
import type { Request, Response, NextFunction } from 'express';
const require = createRequire(import.meta.url);
export function abac(
  policyPath = process.env.OPA_POLICY || 'SECURITY/policy/opa/abac.rego',
) {
  return async function enforce(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    const input = {
      user: req.user,
      action: req.body?.operationName,
      vars: req.body?.variables,
    };
    execFile(
      'opa',
      [
        'eval',
        `data.abac.allow`,
        '--format=json',
        `-i`,
        '/dev/stdin',
        policyPath,
      ],
      { input: JSON.stringify(input) },
      (err, stdout) => {
        if (err) return next(err);
        const result = JSON.parse(stdout);
        const allow = result?.result?.[0]?.expressions?.[0]?.value;
        if (!allow)
          return next(
            Object.assign(new Error('Access denied by policy'), {
              status: 403,
              policy: result,
            }),
          );
        next();
      },
    );
  };
}
```

### 6.3 Server — NL→Cypher skeleton

```ts
// server/src/ai/nl2cypher/index.ts
import type { Request, Response } from 'express';
import { estimateCost } from './planner';
export async function genCypher(req: Request, res: Response) {
  const { prompt } = req.body;
  // TODO: call model; sanitize schema-aware generation
  const cypher = `MATCH (p:Person)-[r:CONTACTED]->(q:Person) RETURN p,q LIMIT 25`;
  const preview = await estimateCost(cypher);
  res.json({ cypher, preview, sandboxToken: 'ttl-60s' });
}
```

### 6.4 Prov‑Ledger — bundle contract (client)

```ts
// server/src/middleware/provenance/bundle.ts
import fetch from 'node-fetch';
export async function buildBundle(payload: any) {
  const resp = await fetch(process.env.PROV_LEDGER_URL + '/api/v1/bundle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Prov‑ledger bundle failed: ${resp.status}`);
  return await resp.json();
}
```

### 6.5 OPA policy (rego) — ABAC starter

```rego
# SECURITY/policy/opa/abac.rego
package abac
import future.keywords.in

default allow = false

allow if {
  input.user.role in {"Analyst","Admin"}
  input.action in {"Query","Export","Mutate"}
}

reason[msg] {
  not allow
  msg := sprintf("Denied: role=%v action=%v", [input.user.role, input.action])
}
```

---

## 7) Tests & Quality

- **Unit/Contract** (Jest): resolvers, NL→Cypher planner, provenance bundle client.
- **E2E** (Playwright): golden demo flow; screenshot diffs for tri‑pane state.
- **Perf** (k6): pivot and NL→Cypher preview profiles; p95 targets.
- **Security**: authZ tests for **all** mutations; actionlint/CodeQL; policy simulation tests.

---

## 8) CI/CD (reusable workflow)

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  build:
    uses: ./.github/workflows/reusable-ci.yml
  canary:
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-canary.yml
    with:
      slice: 10
      rollback_on: SLO_BREACH,SECURITY_FINDING,POLICY_DENIAL
```

---

## 9) Helm values (canary/rollback & SLOs)

```yaml
# helm/server/values.sprint18.yaml
replicaCount: 3
canary:
  enabled: true
  trafficSlice: 10
slo:
  p95QueryMs: 1500
  ingestE2EMin: 5
policy:
  opaPolicyPath: '/policies/abac.rego'
```

---

## 10) Observability Dashboards (Grafana JSON)

```json
{
  "title": "IntelGraph — Analyst Core SLOs",
  "panels": [
    {
      "type": "graph",
      "title": "p95 Graph Query (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(graph_query_latency_ms_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "type": "graph",
      "title": "Ingest E2E (min)",
      "targets": [{ "expr": "ingest_e2e_minutes" }]
    }
  ]
}
```

---

## 11) Release Checklist (MC Gate)

- ✅ SBOM & SLSA provenance attached (server, web, prov‑ledger).
- ✅ Security scans pass; authZ coverage ≥ 95% of mutations.
- ✅ SLO dashboards green on demo dataset.
- ✅ Demo & Disclosure Pack (provenance bundle) published.

---

## 12) Risks & Mitigations

- **Schema drift** between NL→Cypher and Neo4j → _Mitigation:_ snapshot schema introspection before generation; unit tests.
- **OPA latency** in hot resolvers → _Mitigation:_ input minimization + cache allow decisions (short TTL).
- **Provenance bundle size** → _Mitigation:_ streaming manifests + audience‑filtered bundle.

---

## 13) Next Sprint Seeds (handoff)

- Ingest Wizard v0.2 (AI mapping suggestions, DPIA checklist automation).
- Report Studio v0.2 (timeline storyboards, redact-on-export rules UI).
- Graph‑XAI overlays in tri‑pane.
