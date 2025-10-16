# Guy • IntelGraph Platform Workstream — **Analyst Assist v0.2** (Sprint 02)

**Slug:** `guy-intelgraph-platform-analyst-assist-2025-10-20-sprint-02`  
**Window:** Oct 20–Oct 31, 2025 (10 biz days)  
**Cadence alignment:** Company Sprint 19 (Q4’25). Builds directly on Sprint 01 “Auditable Core.”  
**Repo base:** `summit-main/` (apps/web, server, prov-ledger, graph-xai, helm, terraform).

---

## 0) Continuity & Delta from Sprint 01

**Shipped in S01:** Tri‑pane UI, OPA/ABAC on resolvers, NL→Cypher (cost/row preview + sandbox), provenance bundles on export, initial SLO dashboards, k6 profiles, canary/rollback values.

**Remaining gaps / new objectives:**

1. **Ingest Wizard v0.2**: AI-assisted schema mapping, PII/PD handling (DPIA-lite), license/usage restriction capture.
2. **Report Studio v0.2**: Redaction rules UI, timeline storyboards, artifact lineage view from provenance bundle.
3. **Graph‑XAI overlays**: Community detection, anomaly scores, influence (PageRank/Betweenness) overlays in tri‑pane with toggle controls.
4. **NL→Cypher safety & schema-awareness**: Live schema introspection, guardrails (allow‑list patterns), explain‑why for rejected queries.
5. **OPA QoS**: Decision cache with TTL & audit trail compaction.
6. **Observability expansion**: Per‑resolver p95 panels, errors budget burn, ingest quality signals (duplicate rate, PII suppression counts).

---

## 1) Sprint Goal

Deliver **Analyst Assist v0.2**: faster, safer analysis flows through AI‑assisted ingest, smarter overlays, redaction‑aware reporting, and schema‑aware NL→Cypher—all within auditable controls and visible SLOs.

**Victory Conditions**

- AI suggests correct field mappings on 80%+ of common CSVs (person/org/event/geo) with one‑click accept.
- Redaction presets applied at export time, verifiably recorded in provenance manifest.
- Tri‑pane overlays: community clusters, anomalies, and influence metrics toggle instantly (<300ms UI update on demo dataset).
- NL→Cypher rejects unsafe patterns with human‑readable rationale; passes allow‑listed patterns with p95 < 1.2s.
- OPA decision cache reduces policy call overhead ≥ 50% on hot resolvers without stale‑allow incidents.

---

## 2) Backlog (Stories → Acceptance)

### A. Ingest & Governance

1. **AI Schema Mapping** (`apps/web/src/features/ingest-wizard/ai-mapper.ts` + `server/src/ingest/mapping`)  
   _AC:_ Model suggests column→property/label/rel; analyst can accept/override; confidence shown; PII columns flagged; DPIA checklist stored.
2. **DPIA‑Lite & License Capture** (`apps/web/src/features/ingest-wizard/dpia.tsx`)  
   _AC:_ Source purpose, legal basis, retention, usage restrictions captured; embedded in provenance; export blocks if missing mandatory fields.

### B. Reporting

3. **Redaction Rules UI** (`apps/web/src/features/report-studio/redaction.tsx`)  
   _AC:_ Role‑aware presets (Public, Partner, Internal); preview highlights; export logs redaction set → provenance.
4. **Timeline Storyboards** (`apps/web/src/features/report-studio/storyboards.tsx`)  
   _AC:_ Drag snapshots to storyboard; annotate; export to PDF/JSON with references.

### C. Analytics & AI

5. **Graph‑XAI Overlays** (`apps/web/src/features/tri-pane/overlays.ts`)  
   _AC:_ PageRank, Louvain communities, anomaly score badges rendered as Cytoscape styles; jQuery channel `ig:overlay:toggle`.
6. **NL→Cypher Schema Guardrails** (`server/src/ai/nl2cypher/guard.ts`)  
   _AC:_ Neo4j schema introspection; allow‑list templates; denial explains matched block rule; unit coverage.

### D. Policy & Observability

7. **OPA Decision Cache** (`server/src/policy/opa/cache.ts`)  
   _AC:_ Configurable TTL (default 15s), keyed by (user, action, vars_hash); emits cache hit/miss metrics.
8. **Resolver p95 & Error Budget** (`helm/observability/dashboards/resolvers.json`)  
   _AC:_ Per‑resolver latency and burn rate; alerts wired.
9. **Ingest Quality Signals** (`server/src/ingest/metrics.ts`)  
   _AC:_ Duplicate rate, PII suppression count; Grafana panels added.

---

## 3) Jira Subtasks CSV (import‑ready)

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,AI Schema Mapper,"Implement mapping suggester with confidence, accept/override, and PII flags.",High,ingest,web;server,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-23,IG-<parent>
Sub-task,IG,DPIA-Lite & License,"DPIA form, validation, and provenance embedding.",High,compliance,web;server,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-24,IG-<parent>
Sub-task,IG,Redaction Rules UI,"Role-based presets, preview, and export logging.",High,reporting,web,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-27,IG-<parent>
Sub-task,IG,Storyboards,"Timeline storyboard builder + export.",Medium,reporting,web,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-28,IG-<parent>
Sub-task,IG,Graph-XAI Overlays,"PageRank, communities, anomaly badges with toggle bus.",High,analytics,web;server,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-26,IG-<parent>
Sub-task,IG,NL→Cypher Guardrails,"Schema introspection, allow-list, and explain-deny.",High,nl2cypher,server,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-25,IG-<parent>
Sub-task,IG,OPA Cache,"TTL cache for decisions + metrics.",Medium,security,server,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-22,IG-<parent>
Sub-task,IG,Resolver p95 & Burn,"Dashboards + alerts.",Medium,telemetry,gov-ops,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-24,IG-<parent>
Sub-task,IG,Ingest Quality Metrics,"Duplicate rate + PII suppression panels.",Medium,telemetry,server;ops,,guy@intelgraph.dev,2025.10.r2,"Sprint 19 (Oct 20–31, 2025)",2025-10-23,IG-<parent>
```

---

## 4) Git Branching & PR Template

- Branch: `feature/analyst-assist-v0.2`
- Integration branches:
  - `feat/ingest-ai-mapper`
  - `feat/report-redaction`
  - `feat/graph-xai-overlays`
  - `feat/nl2cypher-guardrails`
  - `feat/opa-decision-cache`

**PR Template** (`.github/pull_request_template.md`)

```md
## Summary

## Screenshots / Demos

## Risk & Mitigation

- [ ] Policy impact reviewed
- [ ] Provenance recorded

## Tests

- [ ] Unit
- [ ] Contract
- [ ] E2E

## SLO

- [ ] p95 unaffected or improved
```

---

## 5) Architecture (ASCII) — Additions in Sprint 02

```text
Tri‑pane UI
  ├─ Overlays (PR, Louvain, Anomaly)
  └─ Report Studio (Redaction, Storyboards)
      │
      ▼
Server (Node/TS)
  ├─ ingest/ai-mapping  ← new
  ├─ ai/nl2cypher/guard ← new
  ├─ policy/opa/cache   ← new
  └─ ingest/metrics     ← new
      │
Prov‑Ledger (bundle now includes: DPIA form, redaction profile, storyboard refs)
Neo4j (algo jobs) · Postgres (ledger) · Redis (OPA cache) · OTEL/Prom/Grafana
```

---

## 6) Code Scaffolding (drop‑in files)

### 6.1 Web — Ingest AI Mapper (React + jQuery event bus)

```tsx
// apps/web/src/features/ingest-wizard/ai-mapper.tsx
import React, { useEffect, useState } from 'react';
import $ from 'jquery';
import { Button } from '@mui/material';

type Suggestion = {
  column: string;
  target: string;
  confidence: number;
  pii?: boolean;
};

export default function AiMapper({
  sample,
}: {
  sample: Record<string, any>[];
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    $.ajax({
      url: '/api/ingest/mapping/suggest',
      method: 'POST',
      data: JSON.stringify({ sample }),
      contentType: 'application/json',
    }).done((resp) => setSuggestions(resp.suggestions || []));
  }, [sample]);
  return (
    <div className="p-3">
      {suggestions.map((s) => (
        <div
          key={s.column}
          className="flex items-center justify-between rounded-2xl p-2 shadow mb-2"
        >
          <div>
            <div className="font-semibold">
              {s.column} → {s.target}
            </div>
            <div className="text-sm">
              conf {Math.round(s.confidence * 100)}% {s.pii ? '• PII' : ''}
            </div>
          </div>
          <div>
            <Button
              variant="contained"
              onClick={() => $(document).trigger('ig:ingest:mapping:accept', s)}
            >
              Accept
            </Button>
            <Button
              variant="text"
              onClick={() => $(document).trigger('ig:ingest:mapping:edit', s)}
            >
              Edit
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 6.2 Server — Mapping Suggester Endpoint

```ts
// server/src/ingest/mapping/suggest.ts
import type { Request, Response } from 'express';
import { scoreMappings } from './suggester';

export async function suggest(req: Request, res: Response) {
  const { sample } = req.body || {};
  if (!Array.isArray(sample) || sample.length === 0)
    return res.status(400).json({ error: 'sample required' });
  const { suggestions } = await scoreMappings(sample);
  res.json({ suggestions });
}
```

### 6.3 Server — Mapping Heuristics + ML stub

```ts
// server/src/ingest/mapping/suggester.ts
import { createHash } from 'crypto';

const KNOWN = {
  person: [
    /^first.?name$/i,
    /^last.?name$/i,
    /^email$/i,
    /^dob|date.?of.?birth$/i,
  ],
  org: [/^company|employer|organization$/i],
  geo: [/^lat|latitude$/i, /^lon|lng|longitude$/i, /^country$/i],
};

export async function scoreMappings(sample: any[]) {
  const head = Object.keys(sample[0] || {});
  const suggestions = head.map((col) => {
    const lower = col.toLowerCase();
    let target = 'meta:Unknown';
    let conf = 0.5;
    let pii = /email|phone|dob|ssn|passport/i.test(lower);
    if (KNOWN.person.some((re) => re.test(lower))) {
      target = 'node:Person';
      conf = 0.88;
    }
    if (KNOWN.geo.some((re) => re.test(lower))) {
      target = 'prop:Geo';
      conf = 0.82;
    }
    return { column: col, target, confidence: conf, pii };
  });
  const dpiaKey = createHash('sha256')
    .update(JSON.stringify(head))
    .digest('hex');
  return { suggestions, dpiaKey };
}
```

### 6.4 Web — Redaction Rules UI

```tsx
// apps/web/src/features/report-studio/redaction.tsx
import React, { useState } from 'react';
import $ from 'jquery';
const PRESETS = {
  Public: ['mask:email', 'drop:geo_precision', 'mask:phone_last4'],
  Partner: ['mask:email', 'mask:phone_last4'],
  Internal: [],
};
export default function Redaction() {
  const [preset, setPreset] = useState<'Public' | 'Partner' | 'Internal'>(
    'Public',
  );
  return (
    <div className="p-3">
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as any)}
        className="rounded-2xl p-2 shadow"
      >
        {Object.keys(PRESETS).map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <button
        className="ml-3 rounded-2xl p-2 shadow"
        onClick={() =>
          $(document).trigger('ig:report:redaction:set', PRESETS[preset])
        }
      >
        Apply
      </button>
    </div>
  );
}
```

### 6.5 Tri‑pane — Graph‑XAI Overlays Toggle

```ts
// apps/web/src/features/tri-pane/overlays.ts
import $ from 'jquery';
export function registerOverlayBus(cy: any) {
  $(document).on('ig:overlay:toggle', (_e, overlay: string) => {
    if (overlay === 'pagerank')
      cy.style()
        .selector('node')
        .style('width', 'mapData(pagerank, 0, 1, 20, 60)')
        .update();
    if (overlay === 'community')
      cy.style()
        .selector('node')
        .style('background-color', 'data(communityColor)')
        .update();
    if (overlay === 'anomaly')
      cy.style()
        .selector('node')
        .style('border-width', 'mapData(anomaly, 0, 1, 0, 8)')
        .update();
  });
}
```

### 6.6 Server — NL→Cypher Guardrails

```ts
// server/src/ai/nl2cypher/guard.ts
import neo4j from 'neo4j-driver';
const ALLOW = [
  /^MATCH \(.*\)\-\[.*\]\-\>.* RETURN .*$/i,
  /^MATCH \(.*\) RETURN .*$/i,
];
export async function schemaIntrospect(driver: neo4j.Driver) {
  const s = await driver.session();
  const res = await s.run('CALL db.schema.visualization()');
  await s.close();
  return res.records.map((r) => r.toObject());
}
export function isAllowed(cypher: string) {
  return ALLOW.some((re) => re.test(cypher));
}
export function denyReason(cypher: string) {
  return `Query rejected by guardrails. Pattern not on allow-list. Snippet: ${cypher.slice(0, 80)}…`;
}
```

### 6.7 Policy — OPA Decision Cache

```ts
// server/src/policy/opa/cache.ts
import LRU from 'lru-cache';
const cache = new LRU<string, any>({
  max: 5000,
  ttl: process.env.OPA_CACHE_TTL_MS ? +process.env.OPA_CACHE_TTL_MS : 15000,
});
export function cacheKey(user: any, action: any, vars: any) {
  return JSON.stringify([user?.id, action, JSON.stringify(vars)]);
}
export function get(k: string) {
  return cache.get(k);
}
export function set(k: string, v: any) {
  cache.set(k, v);
}
```

### 6.8 Observability — Prom metrics (server)

```ts
// server/src/metrics/resolvers.ts
import client from 'prom-client';
export const resolverLatency = new client.Histogram({
  name: 'resolver_latency_ms',
  help: 'Resolver latency',
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2000],
  labelNames: ['name'],
});
export const opaCacheOps = new client.Counter({
  name: 'opa_cache_ops_total',
  help: 'OPA cache ops',
  labelNames: ['op'],
});
```

---

## 7) Tests & Quality Gates

- **Unit/Contract**:
  - Ingest suggester heuristics; guard against injection (no eval, strict JSON);
  - NL→Cypher guard `isAllowed/denyReason` coverage;
  - OPA cache hit/miss behaviors (TTL expiry).
- **E2E (Playwright)**:
  - CSV import → AI mapping → DPIA completion → provenance check.
  - Report export with Public preset → PII masked in PDF & manifest logs preset ID.
  - Overlay toggles update graph instantly; screenshots diff.
- **Perf (k6)**:
  - 50 VU tri‑pane toggling overlays;
  - 25 VU NL→Cypher preview bursts;
  - SLO assertions (p95 < 1.2s service, <300ms UI overlay apply).
- **Security**:
  - Redaction presets cannot be bypassed via client toggles (server enforces);
  - DPIA mandatory fields enforced server‑side;
  - OPA cache cannot elevate denied decisions.

---

## 8) CI/CD Deltas

```yaml
# .github/workflows/quality-gates.yml
name: quality-gates
on: [pull_request]
jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Rego unit tests
        run: opa test SECURITY/policy/opa -v
  perf-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: k6 smoke
        run: k6 run tests/k6/nl2cypher_preview_smoke.js
```

---

## 9) Helm Values (new)

```yaml
# helm/server/values.sprint19.yaml
policy:
  opaCacheTtlMs: 15000
features:
  ingestAiMapper: true
  reportRedaction: true
  overlays: ['pagerank', 'community', 'anomaly']
observability:
  enableResolverPanels: true
```

---

## 10) Grafana Dashboard (Resolvers & Burn)

```json
{
  "title": "IntelGraph — Resolver QoS",
  "panels": [
    {
      "type": "graph",
      "title": "p95 Resolver Latency (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(resolver_latency_ms_bucket[5m])) by (le,name))"
        }
      ]
    },
    {
      "type": "stat",
      "title": "OPA Cache Hit Ratio",
      "targets": [
        {
          "expr": "sum(increase(opa_cache_ops_total{op=\"hit\"}[15m]))/sum(increase(opa_cache_ops_total[15m]))"
        }
      ]
    }
  ]
}
```

---

## 11) ADRs

**ADR-0007: NL→Cypher Guardrails via Allow‑List + Schema Introspection**  
Decision: Safe subset; deny with explanation; revisit once formal verifier available.

**ADR-0008: OPA Decision Caching (Short TTL)**  
Decision: Cache ALLOW+DENY for 15s; include user+vars hash in key; emit cache metrics; failure path → miss.

---

## 12) Risk Register & Mitigations

- **False‑positive PII flags** → Provide “not PII” override; log overrides for review.
- **Redaction drift** between UI and export engine → Server‑side enforce + contract tests on export.
- **Overlay compute cost** on large graphs → Precompute on ingest; lazy update deltas; throttle UI redraw.
- **Cache poisoning** for OPA → Namespaced keys, short TTL, no cross‑tenant reuse.

---

## 13) Demo Script (2 min)

1. Import CSV → AI mapping auto‑suggests; accept all; DPIA minimal form completed.
2. Tri‑pane toggles “Community” → clusters appear; “Anomaly” → border thickness varies.
3. NL→Cypher: prompt safe → preview; unsafe prompt → denial message.
4. Report Studio: choose “Public,” export; open PDF (masked PII) and show manifest entries.

---

## 14) Handoff / Seeds to Sprint 03

- NL→Cypher formal template library + test corpus.
- Redaction rules per‑field lineage viewer.
- Overlay extensibility (temporal motifs, subgraph explanations with Graph‑XAI).
