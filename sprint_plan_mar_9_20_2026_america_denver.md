# Sprint 20 — "Governed Sharing, Reports, Mobile Read-Only" (Mar 9–20, 2026 — America/Denver)

> **Context:** Turn insights into shareable, governed outcomes. Ship scoped share links with policy attestation, a report builder with provenance and watermarking, and a mobile read-only experience tuned for tri-pane snapshots while tightening auditability and redaction.

---

## 1) Sprint Goals

- **Scoped Share Links (MVP):** Generate short-lived URLs for saved views/cases with role/policy scopes and purpose strings.
- **Report Builder:** WYSIWYG + templates (Case Summary, Risk Brief, Incident Timeline) → HTML/PDF with auto-manifest.
- **Mobile Read-Only:** Responsive tri-pane snapshot (graph image, timeline strip, evidence list) with pinch/zoom and comments.
- **Policy Attestation:** Require per-share attestation (basis, purpose, retention); log immutable receipt.
- **Ops/Compliance:** Watermarking, redaction overlays, and audit coverage on every share/view/download.

---

## 2) Epics → Stories (Definition of Done)

### Epic A — Scoped Sharing

- **A1. Tokenized Share Links:** `POST /share` → `{url, expiresAt, scopes}`; supports `view:case:*`, `view:slice`, `download:report`.
  - **DoD:** Tokens JWT-signed, audience=workspace; default TTL ≤7 days; revocation works instantly.
- **A2. Purpose & Basis Prompt:** Modal collects reason, basis (license/authority), retention; stored on token.
  - **DoD:** Share attempt without purpose is blocked; audit shows who/what/why/when.
- **A3. Policy Enforcement Gateway:** OPA check at resolve-time; redaction policy bound to token scopes/role.
  - **DoD:** Redacted views never leak blocked fields; denial returns actionable rationale.

### Epic B — Report Builder

- **B1. Template System:** JSON + Handlebars sections (`title`, `summary`, `graph`, `timeline`, `evidence`, `metrics`).
  - **DoD:** Three templates shipped; render ≤1.5s on demo case.
- **B2. WYSIWYG Editor:** Insert/pin snapshots (graph/timeline/map), add captions, drag evidence; auto-citations to manifest.
  - **DoD:** Editing autosaves; a11y pass on toolbar; undo/redo.
- **B3. Exporter:** HTML/PDF with watermark, page numbers, QR back-link, embedded `manifest.json` (sources, licenses, redactions).
  - **DoD:** Checksum/hashes included; PDF ≤10 MB for demo case.

### Epic C — Mobile Read-Only (PWA Shell)

- **C1. Responsive Layout:** Single-column cards: Snapshot, Findings, Evidence, Comments; sticky header actions.
  - **DoD:** Lighthouse PWA ≥90; TTI ≤2s on mid device; offline cache of last 3 reports.
- **C2. Graph Snapshot Service:** Server renders PNG/SVG with highlighted selection + legend; tap to zoom.
  - **DoD:** 2K-node snapshot renders ≤1s server-side; mobile zoom is smooth.
- **C3. Read-Only Comments:** Mention support, deep-link to anchors; rate-limited to prevent spam.
  - **DoD:** Comments appear under 300ms p95; abuse throttle works.

### Epic D — Compliance & Watermarking

- **D1. Visual Watermarks:** Token id + viewer id + timestamp burned in; optional red banner for restricted.
  - **DoD:** Watermark survives print/screenshot legibly.
- **D2. Redaction Overlays:** Field/row redactions surfaced as inline badges; hover shows policy clause.
  - **DoD:** 100% redacted fields labeled; overlays consistent in HTML/PDF/mobile.

### Epic E — Ops & Audit

- **E1. Immutable Receipts:** Per share/view/download writes a receipt `{token, viewer, docHash, ip, ua}` to append-only log.
  - **DoD:** Tamper-evident (hash chain); queryable by token and case.
- **E2. Rate Limits & Quotas:** Per-user share caps; per-workspace download quotas; burst control.
  - **DoD:** Exceeding caps returns friendly error; Prom alerts wired.

---

## 3) Interfaces & Exemplars

**GraphQL — share and reports**

```graphql
scalar JSON

type ShareLink { url: String!, id: ID!, expiresAt: String!, scopes: [String!]!, redactionPolicyId: ID, purpose: String! }
type Report { id: ID!, title: String!, template: String!, data: JSON!, manifestId: ID!, createdAt: String! }
type Receipt { id: ID!, tokenId: ID!, viewer: ID!, action: String!, ts: String!, docHash: String! }

extend type Mutation {
  createShare(target: JSON!, scopes: [String!]!, ttlHours: Int = 168, purpose: String!, basis: String!, retentionDays: Int = 30, redactionPolicyId: ID): ShareLink!
  revokeShare(id: ID!): Boolean!
  createReport(title: String!, template: String!, data: JSON!): Report!
  exportReport(id: ID!, format: String!): String!   # returns download URL
}

extend type Query {
  receiptByToken(tokenId: ID!): [Receipt!]!
  report(id: ID!): Report!
}
```

**Node 18 — share token (scoped, purpose-bound)**

```javascript
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

export async function createShare({ target, scopes, ttlHours, purpose, basis, retentionDays, policyId, viewer, workspaceId }) {
  const id = uuid();
  const now = Math.floor(Date.now()/1000);
  const exp = now + Math.min(ttlHours, 24*7) * 3600; // cap at 7d
  const payload = {
    sub: viewer, tid: id, aud: `ws:${workspaceId}`, scp: scopes,
    pur: purpose, bas: basis, ret: retentionDays, pol: policyId, tgt: target
  };
  const token = jwt.sign(payload, process.env.SHARE_JWT_SECRET, { algorithm: 'HS512', expiresIn: exp - now });
  const url = `${process.env.PUBLIC_URL}/s/${token}`;
  await appendReceipt({ tokenId: id, viewer, action: 'create_share', docHash: hashTarget(target) });
  return { id, url, expiresAt: new Date(exp*1000).toISOString(), scopes, redactionPolicyId: policyId, purpose };
}
```

**Report templates (Handlebars fragment)**

```json
{
  "name": "incident_timeline",
  "sections": [
    { "type": "title", "value": "{{title}}" },
    { "type": "summary", "value": "{{summary}}" },
    { "type": "graph", "value": "{{{graphPng}}}" },
    { "type": "timeline", "value": "{{{timelineHtml}}}" },
    { "type": "evidence", "each": "{{#each evidence}}<li>{{this.title}} — {{this.source}}</li>{{/each}}" }
  ]
}
```

**Server graph snapshot (Cytoscape headless)**

```javascript
import cytoscape from 'cytoscape';
import png from 'cytoscape-node-image'; png(cytoscape);

export function renderSnapshot(elements, highlightIds){
  const cy = cytoscape({ headless: true, elements });
  cy.elements().addClass('dim');
  highlightIds.forEach(function(id){ cy.$(`#${id}`).removeClass('dim').addClass('highlight'); });
  const dataUrl = cy.png({ output: 'base64', full: true, scale: 2 });
  return `data:image/png;base64,${dataUrl}`;
}
```

**Watermark HTML/CSS (applied to exports)**

```html
<div class="watermark">Viewer: {{viewer}} • Token: {{tid}} • {{ts}}</div>
<style>
.watermark {
  position: fixed; bottom: 24px; right: 24px; opacity: .25; font-size: 12px;
  transform: rotate(-10deg); pointer-events: none; user-select: none;
}
.restricted::after {
  content: "RESTRICTED"; position: fixed; top: 40%; left: 20%; font-size: 64px;
  opacity: .12; letter-spacing: .5rem; transform: rotate(-30deg);
}
</style>
```

**jQuery — share link creator with attestation**

```javascript
$(function(){
  $('#share-btn').on('click', function(){
    var payload = collectCurrentViewState(); // selection, filters, time range
    var purpose = $('#purpose').val(), basis = $('#basis').val();
    $.ajax({
      method:'POST', url:'/graphql', contentType:'application/json',
      data: JSON.stringify({ query:
        'mutation($t:JSON!,$s:[String!]!,$ttl:Int,$p:String!,$b:String!,$rd:Int){createShare(target:$t,scopes:$s,ttlHours:$ttl,purpose:$p,basis:$b,retentionDays:$rd){url,expiresAt}}',
        variables:{ t: payload, s: ['view:slice'], ttl: 168, p: purpose, b: basis, rd: 30 }
      })
    }).done(function(res){ $('#share-url').val(res.data.createShare.url); });
  });
});
```

**Immutable receipts (hash-chain sketch)**

```javascript
async function appendReceipt({ tokenId, viewer, action, docHash }){
  const prev = await receipts.last(); // get prior hash
  const rec = {
    id: crypto.randomUUID(), tokenId, viewer, action, docHash,
    ts: new Date().toISOString(), prevHash: prev?.hash || 'GENESIS'
  };
  rec.hash = sha256(JSON.stringify(rec));
  await receipts.insert(rec);
}
```

---

## 4) Acceptance & Demo

1. **Scoped Share:** Create a share link to a pinned tri-pane view with purpose/basis; open in incognito → redacted fields hidden; denial works when OPA flips.
2. **Report Builder:** Build “Incident Timeline” from a case; drag in graph snapshot + evidence list; export PDF (watermarked) with embedded manifest; QR back-link opens the report.
3. **Mobile Read-Only:** Open the share on a phone; see responsive snapshot with zoom; comments readable and mentionable; offline works for cached report.
4. **Audit:** Show receipts timeline (create → view → download) with hash chain; revoke share → link becomes invalid instantly.

---

## 5) Risks & Mitigations

- **Token leakage:** Short TTL + scoped permissions; watermarking with token id & viewer; instant revoke; logs exclude raw tokens.
- **Redaction gaps:** Server-side only; snapshot renderer applies overlays before image generation; PDF sanitizer strips hidden layers.
- **Mobile perf:** Pre-render snapshots; lazy-load evidence; cache headers tuned; disable heavy layouts on mobile.
- **Template sprawl:** Ship 3 curated templates; template lint; owners per template.

---

## 6) Tracking Artifacts

- **Branches:** `feature/scoped-sharing`, `feature/report-builder`, `feature/mobile-readonly`, `chore/watermark-audit`
- **Labels:** `area:sharing`, `area:export`, `area:mobile`, `area:compliance`, `needs:sec-review`, `needs:a11y`
- **CI/CD gates:** JWT scope tests; PDF snapshot golden tests; a11y checks on editor; k6 test for link/receipt throughput.

---

## 7) Exit Metrics

- **Sharing:** 100% share links require purpose/basis; revoke latency ≤5s; zero redaction leaks in audits.
- **Reports:** p95 export ≤1.5s; docs ≤10 MB; 100% exports include manifest + watermark.
- **Mobile:** Lighthouse PWA ≥90; TTI ≤2s; offline open ≤1s for cached report.
- **Audit/Ops:** 100% share/view/download recorded; hash-chain intact; alerts on anomalous share volume.

---

## 8) Clarifying Questions (for kickoff)

1. Which three report templates should be default (Case Summary, Risk Brief, Incident Timeline, something else)?
2. Any mandatory purpose/basis vocab we must enforce (e.g., approved categories, retention defaults)?
3. Mobile: iOS Safari and Android Chrome both in scope—any MDM/PWA constraints or SSO requirements for read-only links?

---

## 9) References (exemplar snippets)

- GraphQL interface, token generation, template fragments, watermark styles, share modal, and receipt hash-chain sketches included above for alignment with implementation.
