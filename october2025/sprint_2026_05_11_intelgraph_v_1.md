````markdown
# IntelGraph — Narrative Studio, Timelines & Court‑Ready Exports Sprint (v1.11.0)

**Slug:** `sprint-2026-05-11-intelgraph-v1-11`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-05-11 → 2026-05-22 (10 business days)  
**Theme:** **Tell the Story, Prove the Facts** — collaborative Narrative Studio with tracked changes, case timelines, citation‑locked facts, and court‑ready PDF/DOCX exports that honor redaction & chain‑of‑custody.

---

## 0) North Stars & DoD

- **Single Source of Truth:** Every narrative sentence can be **fact‑bound** to graph claims/provenance; redactions propagate to narrative and exports.
- **Timeline First:** Case events auto‑assembled from graph (entities/claims/evidence) with manual edits and version history.
- **Court‑Ready:** Exports (PDF/DOCX) contain exhibits, figure numbers, page‑anchored citations, signatures, and custody manifests.
- **Ops SLOs:** p95 narrative save < 200ms; export render < 5s; timeline build < 1.2s on 50k events; zero Sev‑1.

**DoD Gate:**

1. Demo: author a narrative, attach facts/citations → render timeline & exhibit list → export to PDF/DOCX with redactions and custody appendix → verifier validates bundle.
2. Track changes + reviewer mode with comment threads; approvals recorded; out‑of‑policy content flagged.
3. SLO dashboards show narrative latency, export duration, and citation coverage ≥ 95% for facts.

---

## 1) Epics → Objectives

1. **Narrative Studio (NAR‑E1)** — Rich editor, tracked changes, comment threads, fact‑binding, and reviewer workflow.
2. **Case Timelines (TIM‑E2)** — Auto‑build from graph; manual events; merge/sort; zoom; exhibit pins.
3. **Citation & Redaction (CIT‑E3)** — Fact→claim binding, citation chips, redaction propagation to text & figures.
4. **Court‑Ready Exports (EXP‑E4)** — PDF/DOCX renderer, exhibit pagination, figure captions, signatures, custody appendix.
5. **Ops/QA/Docs (OPS‑E5)** — Telemetry, quotas, golden narrative set, operator/analyst guides.

---

## 2) Swimlanes

### Frontend (React + MUI + jQuery)

- Narrative Studio: ProseMirror/TipTap editor wrapper; jQuery hooks for citations, redaction badges, and resolve‑comment actions.
- Timeline: virtualized list + zoom slider; drag‑to‑reorder manual events; exhibit pins; keyboard shortcuts.
- Export preview: pagination, mask diff toggle, exhibit table of contents.

### Backend (Node/Express + Apollo + Neo4j + Postgres + Export workers)

- Narrative service: sections, revisions, tracked changes, comment threads; fact binding and coverage metrics.
- Timeline builder: Cypher → events; dedupe/merge; sort; manual override storage.
- Export service: HTML→PDF/DOCX pipeline; figure/exhibit resolver; custody appendix compiler; signer & verifier.
- Policy/OPA integration: forbidden phrases, PII checks; redaction propagation; approval gates.

### Ops/SRE & Security

- Queues for exports; rate limits; size caps for exhibits; Prometheus histograms; audit logs for edits/approvals.

### QA/Docs

- Golden narratives with expected citations; timeline merge fixtures; export visual diff; style guide & courtroom checklist.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### Narrative Studio (32 pts)

1. Rich editor + tracked changes & comments.  
   **AC:** Insert/edit/delete tracked; accept/reject; comments with @mentions; keyboard shortcuts. (**L**)
2. Fact binding & coverage meter.  
   **AC:** Highlight sentence → bind to 1..N claims; coverage % shown; unbound facts flagged. (**L**)
3. Reviewer workflow & approvals.  
   **AC:** Submit for review → approvals recorded; policy violations highlighted w/ reasons. (**M**)

### Timeline (22 pts)

4. Auto‑builder from graph.  
   **AC:** Events from claims/evidence; merge duplicates; p95 build < 1.2s@50k; filters; zoom. (**L**)
5. Manual events & pins.  
   **AC:** Create/edit/delete; drag‑reorder; pins link to exhibits; version history. (**M**)

### Citation/Redaction (18 pts)

6. Citation chips + inspector.  
   **AC:** Inline chips show source, confidence, chain; opens inspector; copyable citation. (**M**)
7. Redaction propagation.  
   **AC:** Masked fields in claims cause `[REDACTED]` in bound sentences; export respects masks. (**L**)

### Exports (16 pts)

8. PDF/DOCX renderer + exhibits.  
   **AC:** Styles, figure numbers, cover, TOC; custody appendix; e‑signature; verifier passes. (**L**)

### QA/Docs (4 pts)

9. Golden set & visual diffs.  
   **AC:** Pixel diff threshold < 2%; courtroom checklist; analyst/operator guides. (**S**)

---

## 4) Scaffolds & Code

### 4.1 GraphQL — Narrative, Facts, Comments

```graphql
# server/src/graphql/narrative.graphql
scalar DateTime

type Narrative {
  id: ID!
  caseId: ID!
  title: String!
  sections: [Section!]!
  coverage: Float!
  status: String!
  updatedAt: DateTime!
}
type Section {
  id: ID!
  heading: String!
  blocks: [Block!]!
}
interface Block {
  id: ID!
}
type Paragraph implements Block {
  id: ID!
  text: String!
  facts: [FactBinding!]!
  redacted: Boolean!
}
type FactBinding {
  claimId: ID!
  confidence: Float!
  citation: String!
}
type Comment {
  id: ID!
  blockId: ID!
  author: User!
  text: String!
  resolved: Boolean!
  createdAt: DateTime!
}

extend type Query {
  narrative(caseId: ID!): Narrative!
}
extend type Mutation {
  narrativeUpsert(input: NarrativeInput!): Narrative!
  bindFacts(blockId: ID!, claims: [ID!]!): Paragraph!
  commentAdd(blockId: ID!, text: String!): Comment!
  commentResolve(id: ID!): Comment!
}
```
````

### 4.2 Narrative Service — Tracked Changes (TypeScript)

```ts
// server/src/narrative/track.ts
export type Change = {
  id: string;
  kind: 'ins' | 'del' | 'edit';
  author: string;
  ts: number;
  range: [number, number];
  payload?: any;
};
export function applyChanges(text: string, changes: Change[]) {
  // naive apply; real impl stores ranges anchored by block version
  let t = text;
  for (const c of changes) {
    if (c.kind === 'ins')
      t = t.slice(0, c.range[0]) + c.payload.text + t.slice(c.range[0]);
    if (c.kind === 'del') t = t.slice(0, c.range[0]) + t.slice(c.range[1]);
    if (c.kind === 'edit')
      t = t.slice(0, c.range[0]) + c.payload.text + t.slice(c.range[1]);
  }
  return t;
}
```

### 4.3 Fact Binding & Redaction Propagation

```ts
// server/src/narrative/facts.ts
export async function bindFacts(blockId: string, claimIds: string[], ctx: any) {
  const claims = await ctx.driver.executeQuery(
    'MATCH (c:Claim) WHERE c.id IN $ids RETURN c',
    { ids: claimIds },
  );
  const chips = claims.records.map((r: any) => ({
    claimId: r.get('c').properties.id,
    confidence: r.get('c').properties.confidence || 0.9,
    citation: makeCitation(r.get('c').properties),
  }));
  await ctx.db.insertBindings(blockId, chips);
  await propagateRedactions(blockId, ctx);
  return { id: blockId, facts: chips };
}
async function propagateRedactions(blockId: string, ctx: any) {
  // if any bound claim is masked, mark paragraph redacted
  const redacted = await ctx.db.anyBoundMasked(blockId);
  if (redacted) await ctx.db.markParagraphRedacted(blockId);
}
function makeCitation(c: any) {
  return `${c.source || 'source'}:${c.id}`;
}
```

### 4.4 Timeline Builder (Cypher + TypeScript)

```ts
// server/src/timeline/build.ts
export async function buildTimeline(caseId: string, ctx: any) {
  const cy = `MATCH (c:Claim)<-[:YIELDED]-(e) WHERE c.caseId=$caseId AND c.observedAt IS NOT NULL
             RETURN c.id AS id, c.observedAt AS t, c.predicate AS k, c.object AS o ORDER BY t ASC LIMIT 50000`;
  const res = await ctx.driver.executeQuery(cy, { caseId });
  const events = res.records.map((r: any) => ({
    id: r.get('id'),
    t: r.get('t'),
    kind: r.get('k'),
    obj: r.get('o'),
  }));
  return mergeNear(events, 5 * 60); // 5 min window
}
function mergeNear(evts: any[], windowSec: number) {
  const out: any[] = [];
  let cur: any = null;
  for (const e of evts) {
    if (!cur) cur = e;
    else if (Math.abs(e.t - cur.t) <= windowSec)
      cur = { ...e, id: cur.id + ',' + e.id };
    else {
      out.push(cur);
      cur = e;
    }
  }
  if (cur) out.push(cur);
  return out;
}
```

### 4.5 Export Pipeline (HTML→PDF/DOCX)

```ts
// server/src/export/render.ts
import { createWriteStream } from 'fs';
import { JSDOM } from 'jsdom';
export async function renderExport(
  narrative: any,
  exhibits: any[],
  fmt: 'pdf' | 'docx',
) {
  const html = renderHtml(narrative, exhibits);
  if (fmt === 'pdf') return htmlToPdf(html);
  return htmlToDocx(html);
}
function renderHtml(n: any, ex: any[]) {
  // compose sections, figure numbers, citation anchors, custody appendix
  return `<html><body><h1>${n.title}</h1>${n.sections.map((s) => `<h2>${s.heading}</h2>${s.blocks.map((b) => `<p>${escape(b.text)} ${b.redacted ? '[REDACTED]' : ''} ${b.facts.map((f: any) => `<sup>[${f.citation}]</sup>`).join('')}</p>`).join('')}`).join('')}</body></html>`;
}
```

### 4.6 Verifier (Custody Appendix)

```ts
// server/src/export/verify.ts
import crypto from 'crypto';
export function verifyBundle(bundle: any) {
  // verify each exhibit hash and manifest chain
  return (
    bundle.exhibits.every((x: any) => sha256(x.bytes) === x.hash) &&
    verifyMerkle(bundle.custody.merkle)
  );
}
function sha256(b: Buffer) {
  return crypto.createHash('sha256').update(b).digest('hex');
}
```

### 4.7 OPA — Narrative Policy (forbidden content & PII)

```rego
package intelgraph.narrative

default allow = true

violation[msg] {
  some i
  re_match("(?i)classified|secret|no\s+distribution", input.text)
  msg := {"kind":"forbidden_phrase","reason":"Contains restricted markers"}
}

violation[msg] {
  input.contains_pii
  msg := {"kind":"pii","reason":"PII present without mask"}
}
```

### 4.8 jQuery — Editor Hooks (facts, comments, approvals)

```js
// apps/web/src/features/narrative/jquery-editor.js
$(function () {
  $(document).on('mouseup', '.paragraph', function () {
    const sel = window.getSelection().toString();
    if (sel.length > 0) {
      $('#fact-bind').data('range', sel).show();
    }
  });
  $('#fact-bind').on('click', function () {
    const ids = getSelectedClaimIds();
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `mutation{ bindFacts(blockId:"${currentBlockId()}", claims:${JSON.stringify(ids)}){ facts{ claimId } } }`,
      }),
    });
  });
  $(document).on('click', '.approve-doc', function () {
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `mutation{ narrativeApprove(id:"${$('#nid').val()}") }`,
      }),
    });
  });
});
```

### 4.9 Timeline UI (jQuery)

```js
// apps/web/src/features/timeline/jquery-timeline.js
$(function () {
  $('#timeline-zoom').on('input', function () {
    $('#timeline').attr('data-zoom', this.value);
  });
  $('#rebuild-timeline').on('click', function () {
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `{ timeline(caseId:"${window.caseId}"){ id t kind } }`,
      }),
    });
  });
});
```

### 4.10 k6 — Export Load & Narrative Latency

```js
import http from 'k6/http';
export const options = {
  vus: 40,
  duration: '3m',
  thresholds: { http_req_duration: ['p(95)<5000'] },
};
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query: 'mutation{ exportNarrative(caseId:"c1", fmt:PDF){ id } }',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Narrative editor shell + tracked changes/comments; timeline builder baseline.
- **D3–D4:** Fact binding & coverage meter; citation chips & inspector; redaction propagation.
- **D5–D6:** Export pipeline (HTML→PDF/DOCX) + exhibits & custody appendix; verifier hook.
- **D7:** Reviewer workflow & approvals; policy checks; SLO dashboards.
- **D8–D10:** Golden narratives, visual diffs, perf tuning, docs, demo polish.

---

## 6) Risks & Mitigations

- **Unbound facts** → coverage meter, review gates, required citations for publish.
- **Export brittleness** → golden visual diffs, deterministic fonts, page‑anchored anchors.
- **Redaction leaks** → propagation tests, deny‑by‑default export gate, verifier in CI.
- **Timeline overload** → virtualized rendering, merge windows, filters & search.

---

## 7) Metrics

- Narrative save p95; export duration p95; citation coverage %; policy violations; comment resolution SLA; timeline build p95.

---

## 8) Release Artifacts

- **ADR‑042:** Narrative data model & tracked changes.
- **ADR‑043:** Fact binding & redaction propagation.
- **RFC‑036:** Court‑ready export spec (PDF/DOCX) & custody appendix.
- **Runbooks:** Export failures; policy violation triage; timeline rebuild slowness.
- **Docs:** Narrative authoring; Citation how‑to; Court‑ready checklist.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Draft narrative; bind facts to claims; watch coverage meter hit ≥95%.
2. Build timeline; add manual events; pin exhibits; zoom & filter.
3. Export PDF/DOCX; open custody appendix; run verifier; show redaction propagation.
4. Reviewer approves; policy panel shows clean; dashboards display SLOs & coverage.

---

## 11) Out‑of‑Scope (backlog)

- Multilingual narrative translation memory; automatic figure callout generation; Word plugin; real‑time collaborative cursors.

```

```
