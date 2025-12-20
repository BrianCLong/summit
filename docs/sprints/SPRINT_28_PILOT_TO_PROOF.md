# Sprint 28 — “Pilot to Proof: Feedback, Migrations, SLG”

**Window:** Mon, Jun 29 → Fri, Jul 10, 2026 (10 business days)
**Theme:** Win customer pilots decisively. Ship **in-product feedback & analytics**, **migration/import tooling** (Maltego/CSV/Neo4j), **pricing & plan enforcement polish**, **pen-test remediation & security headers**, and **sales/go-live enablement** (playbooks, dashboards, SLAs).

---

## 1) Sprint Goals

* **Feedback & Product Analytics (privacy-safe)**: in-app surveys, NPS, funnel/feature telemetry; per-workspace opt-in.
* **Migration Tooling (MVP)**: Maltego CSV → Canonical; Neo4j → IntelGraph export/import; dedupe & ER assist.
* **Pricing/Plans Polish**: metering accuracy, soft/hard caps UX, trials→paid conversion flows.
* **Security Hardening**: pen-test fixes, CSP/COOP/COEP headers, SSO session lifetime controls, cookie/CSRF tighten.
* **Pilot Enablement**: success dashboard, playbooks (POCs), go-live checklist, support SLOs surfaced.

---

## 2) Epics → Stories (Definition of Done included)

### Epic A — Feedback & Analytics

* **A1. NPS + Microsurveys**: modal on milestone events; 0 PII; workspace opt-in; export CSV.
  **DoD:** response rate, score trends visible; opt-out respected.
* **A2. Funnel & Feature Telemetry**: events for onboarding steps, search→open→case, report exports.
  **DoD:** per-workspace dashboard; sampling + anonymization on by default.
* **A3. Feedback Inbox**: triage labels (bug/feature/praise); link to issues.
  **DoD:** SLA tags (P1/P2/P3); weekly digest email stub.

### Epic B — Migration Tooling

* **B1. Maltego/CSV Importer**: map columns → canonical entities/edges; PII/License tagging; lineage.
  **DoD:** 10k-row import ≤5 min; mapping presets saved.
* **B2. Neo4j Export/Import**: `apoc.export.json`/CSV → transform → load; property/type mapping; ID stability.
  **DoD:** round-trip on sample graph keeps IDs and labels; diff <1% mismatch.
* **B3. Dedupe + ER Assist**: simhash/Jaro-Winkler suggestions pre-load; human review merge queue.
  **DoD:** ≥0.95 precision on gold pairs; all merges audited.

### Epic C — Pricing/Plans & Trials

* **C1. Billing Reconciliation**: counters↔invoices agree ±1%; preview bill page.
  **DoD:** admin sees forecast vs. cap; anomalies flagged.
* **C2. Trial→Paid Flow**: paywall screen, proration logic, grace window, email stubs.
  **DoD:** upgrade/downgrade safe; audit all changes.
* **C3. Over-Cap UX**: soft limits (warnings) → hard caps with “request bump”; background jobs pause safely.
  **DoD:** no data loss; clear remediation.

### Epic D — Security Hardening

* **D1. Pen-Test Remediation**: fix findings list; add regression tests.
  **DoD:** all P1/P2s closed; attestation note generated.
* **D2. Browser Security**: CSP (script-src allowlist), COOP/COEP, HSTS, SameSite=Strict cookies, CSRF tokens.
  **DoD:** headers verified; breaking changes feature-flagged.
* **D3. SSO Session Controls**: max session age, inactivity timeout, step-up TTL; admin policy.
  **DoD:** enforced in stage; logs show expirations.

### Epic E — Pilot Enablement

* **E1. Success Dashboard**: per-pilot KPIs (TTFW, active users, queries/day, cases, exports, NPS).
  **DoD:** color-coded; shareable to execs; no PII.
* **E2. POC Playbooks**: “30-Day Adoption” and “Risk Brief in 3 Steps” (pinned views, Studio template).
  **DoD:** one-click install; tracked completion.
* **E3. Go-Live Checklist & SLOs**: in-app checklist; support SLOs (first response/restore times) visible.
  **DoD:** checklist exportable; green/yellow/red status cards.

---

## 3) Interfaces & Exemplars

**GraphQL — feedback & analytics**

```graphql
scalar JSON

type NpsResponse { id: ID!, score: Int!, comment: String, ts: String!, workspaceId: ID! }
type FunnelPoint { name: String!, value: Int!, period: String! }
type PilotKPI { ttfwMin: Int!, dau: Int!, queries: Int!, cases: Int!, exports: Int!, nps: Float! }

extend type Mutation {
  submitNps(score: Int!, comment: String): Boolean!
  recordEvent(name: String!, props: JSON): Boolean!           # sampled, PII-scrubbed
  startTrial(plan: String!, days: Int = 14): Boolean!
  upgradePlan(plan: String!): Boolean!
}

extend type Query {
  funnel(period: String! = "7d"): [FunnelPoint!]!
  pilotKpis(workspaceId: ID!): PilotKPI!
}
```

**Frontend — NPS modal (jQuery)**

```javascript
$(function(){
  if(window.flags.npsEnabled){
    setTimeout(function(){
      $('#nps').removeClass('hidden');
    }, 8000);
  }
  $('#nps-submit').on('click', function(){
    var score = parseInt($('input[name="nps"]:checked').val(),10);
    var comment = $('#nps-comment').val();
    $.ajax({
      method:'POST', url:'/graphql', contentType:'application/json',
      data: JSON.stringify({ query:'mutation($s:Int!,$c:String){submitNps(score:$s,comment:$c)}',
                             variables:{ s: score, c: comment }})
    }).done(function(){ $('#nps').addClass('hidden'); toast('Thanks for the feedback!'); });
  });
});
```

**CSV/Maltego mapper (server sketch)**

```javascript
import Papa from 'papaparse';
export async function mapCsvToGraph(csvText, mapping){
  const rows = Papa.parse(csvText, { header: true }).data;
  const out = { entities: [], edges: [], lineage: [] };
  rows.forEach(function(r, i){
    const e = { type: mapping.entityType, key: `${mapping.keyPrefix}:${r[mapping.keyCol]}`, props: {} };
    mapping.propMap.forEach(function(m){ if(r[m.from]) e.props[m.to] = r[m.from]; });
    out.entities.push(e);
    if(mapping.edgeFrom && mapping.edgeTo){
      out.edges.push({ type: mapping.edgeType, from: `${mapping.edgeFrom.prefix}:${r[mapping.edgeFrom.col]}`,
                       to: `${mapping.edgeTo.prefix}:${r[mapping.edgeTo.col]}`, props: { source: 'csv-import' }});
    }
    out.lineage.push({ row: i, source: 'csv', mappingVersion: mapping.version });
  });
  return out;
}
```

**Neo4j import (CLI outline)**

```bash
intelgraph-migrate neo4j \
  --apoc-json bundle.json \
  --map mapping.yaml \
  --workspace $WS \
  --dry-run
# Outputs: diff summary (create/update), ER suggestions, policy flags
```

**Security headers (Express)**

```javascript
app.use(require('helmet')({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'","'unsafe-inline'","https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "https://api.intelgraph.example"]
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
```

**Pilot success dashboard (GraphQL + example card)**

```graphql
type SuccessCard { label: String!, value: String!, status: String!, hint: String }
extend type Query { pilotSuccess(workspaceId: ID!): [SuccessCard!]! }
```

```javascript
// simple renderer
$(function(){
  $.ajax({
    method:'POST', url:'/graphql', contentType:'application/json',
    data: JSON.stringify({ query:'query($w:ID!){pilotSuccess(workspaceId:$w){label,value,status,hint}}',
                           variables:{ w: window.activeWorkspace }})
  }).done(function(res){
    (res.data.pilotSuccess||[]).forEach(function(c){
      $('#pilot-cards').append('<div class="card '+c.status+'"><h4>'+c.label+'</h4><div>'+c.value+'</div><small>'+ (c.hint||'') +'</small></div>');
    });
  });
});
```

**Plan over-cap UX (server guard)**

```javascript
function enforceCap(ctx, metric, value){
  const cap = ctx.plan?.caps?.[metric];
  if(cap && value > cap.hard) throw new Error(`Plan cap reached for ${metric}. Contact support to increase.`);
  if(cap && value > cap.soft) return { warning: true, message: `Approaching ${metric} cap (${value}/${cap.hard}).` };
  return { warning: false };
}
```
