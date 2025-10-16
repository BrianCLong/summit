# Guy • IntelGraph Platform Workstream — **Explainable Analyst Assist v0.3** (Sprint 03)

**Slug:** `guy-intelgraph-platform-explainable-analyst-assist-2025-11-03-sprint-03`  
**Window:** Nov 3–Nov 14, 2025 (10 biz days)  
**Cadence alignment:** Company Sprint 20 (Q4’25). Builds on S01 “Auditable Core” and S02 “Analyst Assist v0.2”.  
**Repo base:** `summit-main/` (apps/web, server, prov-ledger, graph-xai, helm, terraform).

---

## 0) Continuity & Delta

**From S02 shipped:** AI ingest mapper + DPIA-lite, Report Studio redaction presets, Graph‑XAI overlays, NL→Cypher guardrails, OPA decision cache, resolver SLO dashboards, ingest quality metrics.  
**New focus in S03:** formalize query safety + explanations, deepen provenance/lineage, add temporal & motif analytics, and ship collaborative Case Spaces v0.1.

---

## 1) Sprint Goal

Deliver **Explainable Analyst Assist v0.3**: template‑verified NL→Cypher with human‑readable rationales, per‑field redaction lineage, temporal motif analytics, subgraph explanation cards, and Case Spaces (real‑time collab) — all policy‑enforced and observable.

**Victory Conditions**

- 95% of NL‑generated queries match a **Template Library** entry or are rejected with an actionable explanation.
- Report exports include a **Redaction Lineage** appendix (fields, rules, user, timestamp) embedded in the provenance bundle.
- Temporal motif finder produces explanations (e.g., bursty contacts in ≤ 7 days) and renders as overlay chips in < 400ms.
- Case Spaces: two analysts can co‑edit notes, pins, and filters with conflict‑free merges; audit trail shows who changed what/when.

---

## 2) Backlog (Stories → Acceptance)

### A. Explainable NL→Cypher

1. **Template Library & Verifier** (`server/src/ai/nl2cypher/templates/`)  
   _AC:_ YAML templates (intent → Cypher, parameter schema, safety notes); verifier enforces allow‑list; rich denial reasons.
2. **Rationale Builder** (`server/src/ai/nl2cypher/rationale.ts`)  
   _AC:_ For accepted queries, return why it matched (template id, slots); for denied, list mismatched patterns & blocked clauses.

### B. Provenance & Reporting

3. **Redaction Lineage** (`server/src/report/redaction/lineage.ts` + `apps/web/src/features/report-studio/lineage.tsx`)  
   _AC:_ Each masked field → rule id, source, user, time; manifest embeds lineage table; PDF appendix auto‑generated.

### C. Analytics

4. **Temporal Motif Finder v0.1** (`server/src/analytics/motifs/temporal.ts`)  
   _AC:_ Configurable windows (1–30 days), patterns (triads, bursts); returns scores & explanations; cached.
5. **Subgraph Explanation Cards** (`apps/web/src/features/tri-pane/explain-cards.tsx`)  
   _AC:_ Click cluster → card shows key stats (PR top‑k, anomalies, motifs) + “why this matters”.

### D. Collaboration

6. **Case Spaces v0.1** (`apps/web/src/features/case-space/` + `server/src/case-space/`)  
   _AC:_ Real‑time shared filters, notes, pins via Socket.IO; CRDT merge for text; OPA‑guarded permissions; audit trail to prov‑ledger.

### E. Observability & Policy

7. **Explainability Metrics** (`server/src/metrics/explain.ts`)  
   _AC:_ Template hit rate, denial rate, avg rationale size; Grafana panels added.
8. **Policy Hooks for Case Spaces** (`server/src/policy/opa/case.rego`)  
   _AC:_ Share/read/write rules; reason‑for‑access on shared artifacts.

---

## 3) Jira Subtasks CSV (import‑ready)

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Template Library,"Define YAML templates, loader, and verifier.",High,nl2cypher,server,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-05,IG-<parent>
Sub-task,IG,Rationale Builder,"Accepted/denied rationales with actionable details.",High,nl2cypher,server,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-06,IG-<parent>
Sub-task,IG,Redaction Lineage,"Per-field lineage in manifest + PDF appendix.",High,reporting,web;server,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-08,IG-<parent>
Sub-task,IG,Temporal Motifs,"Windowed motifs with explanations and caching.",High,analytics,server,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-10,IG-<parent>
Sub-task,IG,Explain Cards,"Cluster/subgraph cards in tri‑pane.",Medium,analytics,web,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-11,IG-<parent>
Sub-task,IG,Case Spaces,"Realtime collab with CRDT + audit.",High,collab,web;server,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-12,IG-<parent>
Sub-task,IG,Explainability Metrics,"Template hit/deny and rationale metrics.",Medium,telemetry,server;ops,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-07,IG-<parent>
Sub-task,IG,Case OPA Policies,"ABAC for case-space operations.",High,security,server,,guy@intelgraph.dev,2025.11.r1,"Sprint 20 (Nov 3–14, 2025)",2025-11-06,IG-<parent>
```

---

## 4) Branching Plan

- Branch: `feature/explainable-analyst-assist-v0.3`
- Integration branches: `feat/nl2cypher-templates`, `feat/nl2cypher-rationale`, `feat/report-lineage`, `feat/temporal-motifs`, `feat/explain-cards`, `feat/case-spaces`.

---

## 5) Architecture Delta (ASCII)

```text
Tri‑pane UI
  ├─ Explain Cards (stats + why-matters)
  └─ Case Space (shared filters/pins/notes via Socket.IO + CRDT)
      │
      ▼
Server (Node/TS)
  ├─ ai/nl2cypher/templates (YAML + verifier)
  ├─ ai/nl2cypher/rationale
  ├─ analytics/motifs/temporal
  ├─ case-space/ (Socket.IO + OPA hooks + audit)
  └─ report/redaction/lineage
      │
Prov‑Ledger (record: template id, rationales, lineage, case audit)
Neo4j (temporal scans) · Redis (Socket rooms + caches) · OTEL/Prom/Grafana
```

---

## 6) Code Scaffolding (drop‑in)

### 6.1 NL→Cypher Templates (YAML + loader)

```yaml
# server/src/ai/nl2cypher/templates/contacts_in_window.yaml
id: contacts_in_window
intent: 'people who contacted each other in <days> days'
params:
  days: { type: integer, min: 1, max: 30 }
cypher: |
  MATCH (a:Person)-[r:CONTACTED]->(b:Person)
  WHERE r.when >= datetime() - duration({days: $days})
  RETURN a,b,r LIMIT 200
notes:
  safety: ['bounded time window', 'no write clauses', 'LIMIT present']
```

```ts
// server/src/ai/nl2cypher/templates/index.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
export type Template = {
  id: string;
  intent: string;
  params: any;
  cypher: string;
  notes?: any;
};
export function loadTemplates(
  dir = path.join(process.cwd(), 'server/src/ai/nl2cypher/templates'),
): Template[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map(
      (f) => yaml.load(fs.readFileSync(path.join(dir, f), 'utf8')) as Template,
    );
}
export function verify(template: Template) {
  if (!/\bRETURN\b/i.test(template.cypher)) throw new Error('Missing RETURN');
  if (!/\bLIMIT\b/i.test(template.cypher)) throw new Error('Missing LIMIT');
  if (/\bCREATE|MERGE|DELETE|SET\b/i.test(template.cypher))
    throw new Error('Write clause not allowed');
}
```

### 6.2 Rationale Builder

```ts
// server/src/ai/nl2cypher/rationale.ts
export function acceptanceRationale(tplId: string, slots: Record<string, any>) {
  return {
    status: 'accepted',
    template: tplId,
    slots,
    why: [`matched template '${tplId}'`, 'safety checks passed'],
  };
}
export function denialRationale(reasons: string[], snippet: string) {
  return { status: 'denied', reasons, snippet: snippet.slice(0, 120) };
}
```

### 6.3 Redaction Lineage (server)

```ts
// server/src/report/redaction/lineage.ts
export type Lineage = {
  field: string;
  rule: string;
  userId: string;
  ts: string;
};
export function recordLineage(fields: Lineage[]) {
  return {
    lineage: fields,
    summary: {
      count: fields.length,
      rules: [...new Set(fields.map((f) => f.rule))],
    },
  };
}
```

### 6.4 Temporal Motifs (skeleton)

```ts
// server/src/analytics/motifs/temporal.ts
import dayjs from 'dayjs';
export type Motif = {
  name: string;
  windowDays: number;
  score: number;
  explanation: string;
};
export async function findBursts(
  events: { when: string; src: string; dst: string }[],
  days: number,
): Promise<Motif[]> {
  const cutoff = dayjs().subtract(days, 'day');
  const windowed = events.filter((e) => dayjs(e.when).isAfter(cutoff));
  const score = Math.min(1, windowed.length / 100);
  return [
    {
      name: 'bursty-contacts',
      windowDays: days,
      score,
      explanation: `${windowed.length} contacts in last ${days} days`,
    },
  ];
}
```

### 6.5 Case Spaces (server Socket.IO + audit hooks)

```ts
// server/src/case-space/index.ts
import { Server } from 'socket.io';
import { abac } from '../policy/opa/abac';
export function attachCaseSpaces(httpServer: any) {
  const io = new Server(httpServer, { path: '/ws/case' });
  io.use(async (socket, next) => {
    // TODO: call OPA for join permission using abac() logic or explicit policy fn
    next();
  });
  io.on('connection', (socket) => {
    socket.on('join', ({ caseId }) => socket.join(`case:${caseId}`));
    socket.on('note:update', (msg) =>
      io.to(`case:${msg.caseId}`).emit('note:update', msg),
    );
    socket.on('pin:set', (msg) =>
      io.to(`case:${msg.caseId}`).emit('pin:set', msg),
    );
  });
  return io;
}
```

### 6.6 Explain Cards (web)

```tsx
// apps/web/src/features/tri-pane/explain-cards.tsx
import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function ExplainCards() {
  const [card, setCard] = useState<any>(null);
  useEffect(() => {
    $(document).on('ig:cluster:select', (_e, payload) => setCard(payload));
    return () => $(document).off('ig:cluster:select');
  }, []);
  if (!card) return null;
  return (
    <div className="fixed bottom-4 right-4 rounded-2xl shadow p-3 bg-white">
      <div className="font-bold">{card.title}</div>
      <div className="text-sm">PR top‑k: {card.prTop?.join(', ')}</div>
      <div className="text-sm">Anomalies: {card.anomalyCount}</div>
      <div className="text-sm">
        Motifs: {card.motifs?.map((m: any) => m.name).join(', ')}
      </div>
      <div className="text-xs mt-2 opacity-70">
        Why this matters: {card.why}
      </div>
    </div>
  );
}
```

---

## 7) Tests & Quality Gates

- **Unit/Contract**: template loader/verifier; rationale builder; lineage recorder; temporal motifs scoring; Socket events auth guard.
- **E2E**: NL prompt → accepted/denied with rationale; Report export → lineage appendix present; two browsers co‑edit Case Space; Explain Cards show correct stats.
- **Perf (k6)**: 30 VU Explain Cards toggling and cluster selects (<400ms); 25 VU template‑verified previews (p95 <1.0s service).
- **Security**: OPA case policies enforced; lineage cannot be dropped; Socket auth replay protection.

---

## 8) CI/CD Deltas

```yaml
# .github/workflows/explainability.yml
name: explainability
on: [pull_request]
jobs:
  nl2cypher-templates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node server/scripts/validate-templates.mjs
  report-lineage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test --workspaces -- server/src/report/redaction
```

---

## 9) Helm Values (S20)

```yaml
# helm/server/values.sprint20.yaml
features:
  explainCards: true
  caseSpaces: true
nl2cypher:
  templates:
    enabled: true
observability:
  explainability: true
```

---

## 10) Grafana Panels (Explainability)

```json
{
  "title": "IntelGraph — Explainability",
  "panels": [
    {
      "type": "stat",
      "title": "Template Hit Rate",
      "targets": [
        {
          "expr": "sum(rate(nl2cypher_template_hits_total[15m])) / sum(rate(nl2cypher_requests_total[15m]))"
        }
      ]
    },
    {
      "type": "stat",
      "title": "Denial Rate",
      "targets": [
        {
          "expr": "sum(rate(nl2cypher_denials_total[15m])) / sum(rate(nl2cypher_requests_total[15m]))"
        }
      ]
    }
  ]
}
```

---

## 11) OPA Policy — Case Spaces (rego skeleton)

```rego
# SECURITY/policy/opa/case.rego
package case

import future.keywords.in

default allow = false

allow if {
  input.user.role in {"Analyst","Admin"}
  input.action in {"CaseJoin","CaseWrite","CaseRead"}
  input.resource.caseId != ""
}
```

---

## 12) Demo Script (2 min)

1. Prompt: “people who contacted each other in 7 days” → accepted (template `contacts_in_window`), rationale shows slots.
2. Prompt: “create node …” → denied with write‑clause reason.
3. Select cluster → Explain Card slides in with PR top‑k, anomalies, motifs.
4. Two browsers join same Case Space; one adds a note and pin, the other sees it live; export report with redaction lineage appendix.

---

## 13) Risks & Mitigations

- **Template coverage gaps** → fallback to curated prompts; capture denied prompts corpus for next sprint expansion.
- **Temporal scans cost** → window bounds + sampling; cache scores; background precompute.
- **Collab auth** → strict OPA checks on join/write; per‑event audit to prov‑ledger; JWT rotation.

---

## 14) Seeds for Sprint 04

- Template expansion pack + evaluation harness.
- Case Spaces presence indicators, comments threads, and @mentions.
- Motif library: temporal triangles, venue co‑occurrence, cross‑channel bursts.
