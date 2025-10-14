```markdown
# IntelGraph — Post‑GA Expansion Sprint (v1.1.0)
**Slug:** `sprint-2025-12-08-intelgraph-v1-1`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2025-12-08 → 2025-12-19 (10 business days)  
**Theme:** **Customer Onboarding, Insight Feeds & Reliability** — turnkey onboarding, guided data quality, analyst insights feed, and rock‑solid reliability at scale.

---
## 0) North Stars & DoD
- **Frictionless Start:** New orgs can ingest, resolve, and visualize within 30 minutes via guided onboarding and sample case.
- **Data Quality First:** DQ checks, schema linting, and remediation tips in the Ingest Wizard.
- **Actionable Insight Feed:** Daily/streaming digest of changes, anomalies, and watchlist hits with provenance.
- **Reliability:** p99 GraphQL < 1.8s; error budget respected; no Sev‑1 regressions.

**DoD Gate:**
1) A first‑run onboarding flow completes with a sample dataset and checklist all green.  
2) Data Quality panel flags issues (nulls, type drift, duplicates) and proposes fixes; accepted fixes update mappings.  
3) Insight Feed renders server‑generated “cards” (new community, rank jumpers, watchlist hits) with drill‑downs.  
4) SRE dashboard shows improved p99, zero Sev‑1, and clean error budgets.

---
## 1) Epics → Objectives
1. **Onboarding & Sample Case (ONB‑E1)** — First‑run wizard, sample data pack, role‑based tips, progress checklist.  
2. **Data Quality (DQ‑E2)** — DQ checks in ingest, schema lint/lints, remediation actions, acceptance gates.  
3. **Insight Feed (INS‑E3)** — Server jobs produce insight cards; feed UI with filters and subscriptions.  
4. **Reliability & Cost (REL‑E4)** — P99 tuning, query plan hints, cache warmers, cold start reductions.  
5. **Docs & Success (DOC‑E5)** — Customer‑facing quickstart, troubleshooting trees, and success telemetry.

---
## 2) Swimlanes
### Frontend (React + MUI + Cytoscape.js + jQuery)
- Onboarding wizard with stepper, progress, sample case loader, role tips.
- Ingest Wizard: DQ panel (issue list + fix actions), mapping diffs, acceptance gate.
- Insight Feed UI: cards, filters, saved subscriptions, toast/link to case.
- Reliability UI: budget hints, pre‑fetch cache toggle, retry toasts.

### Backend (Node/Express + Apollo + Redis + Neo4j)
- Onboarding service (sample case import, role seeding, checklist state machine).
- DQ service: null/uniqueness/type drift/regex checks; remediation generator; mapping patcher.
- Insight engine: daily batch + streaming rule evaluators producing `InsightCard` artifacts.
- Reliability: query plan advisor, overlay cache warmers, cold start registry.

### Ops/SRE & Security
- Dashboards: p99, cold‑start count, cache warm rate, DQ pass/fail, feed throughput.
- Error budget automation; rollbacks; dark‑launch feed jobs; cost telemetry.

### QA/Docs
- Playwright happy path (first‑run → feed), ingest DQ E2E, perf tests, customer success docs.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ 90 pts

### Onboarding (22 pts)
1. First‑run wizard + sample pack import.  
   **AC:** Creates org, roles, sample case; checklist persists; time‑to‑first‑insight < 30 min. (**L**)
2. Role‑based tips & task list (analyst/admin).  
   **AC:** Contextual callouts; dismissible; telemetry on completion. (**M**)
3. Sample case cleanup script.  
   **AC:** One‑click purge; provenance intact; audit entry. (**S**)

### Data Quality (28 pts)
4. DQ checks (nulls, uniqueness, regex, type drift).  
   **AC:** Results inline in mapping; p95 run < 20s for 100k rows. (**L**)
5. Remediation actions → mapping patches.  
   **AC:** Accept fix updates mapping; preview diff; reversible; audit. (**L**)
6. Acceptance gate for ingest.  
   **AC:** Block proceed on critical DQ failures; override w/ reason. (**M**)

### Insight Feed (28 pts)
7. InsightCard model + resolver.  
   **AC:** Cards: community‑change, rank‑jumper, watchlist‑hit, new‑entity; provenance links; pagination. (**L**)
8. Daily batch + streaming producer.  
   **AC:** Batch at 02:00 org‑local; streaming < 500ms fan‑out; backpressure metrics. (**L**)
9. Feed UI + subscriptions (toasts, email/webhook).  
   **AC:** Filters by type/severity; subscribe/unsubscribe; mute per case. (**M**)

### Reliability (12 pts)
10. Query plan advisor + cache warmers.  
    **AC:** p99 reduction ≥ 20%; warm rate ≥ 85% for overlays; hints logged. (**M**)
11. Cold start registry + preloader.  
    **AC:** Track cold starts; reduce by 50%; Grafana panel. (**M**)

### QA/Docs (4 pts)
12. First‑run + DQ + feed E2E; quickstart docs.  
    **AC:** Flake < 1%; 20‑min quickstart; screenshots. (**S**)

---
## 4) Scaffolds & Code Snippets

### 4.1 Onboarding Checklist (GraphQL + storage)
```graphql
# server/src/graphql/onboarding.graphql
type OnboardingChecklist { id: ID!, orgId: ID!, items: [OnboardingItem!]!, completed: Boolean! }
type OnboardingItem { key: String!, title: String!, done: Boolean!, ts: DateTime }
extend type Mutation {
  onboardingStart(orgId: ID!): OnboardingChecklist!
  onboardingCompleteItem(orgId: ID!, key: String!): OnboardingChecklist!
}
```

```ts
// server/src/onboarding/service.ts
export const defaultItems = [
  { key:'import_sample', title:'Import sample case' },
  { key:'create_users', title:'Invite teammates' },
  { key:'run_er', title:'Run entity resolution' },
  { key:'run_analytics', title:'Run analytics overlays' },
  { key:'export_report', title:'Export first report' }
]
```

### 4.2 DQ Checks & Remediation
```ts
// server/src/dq/checks.ts
export async function dqChecks(rows: any[], rules: any){
  const issues: any[] = []
  // null/blank
  for (const f of Object.keys(rows[0]||{})){
    const nulls = rows.filter(r=>r[f]==null||r[f]==='').length
    if (nulls>0) issues.push({ field:f, kind:'nulls', count:nulls })
  }
  // uniqueness
  for (const f of rules.unique||[]){
    const seen = new Set(); const dups = new Set()
    for (const r of rows){ const v=r[f]; if(seen.has(v)) dups.add(v); else seen.add(v) }
    if (dups.size>0) issues.push({ field:f, kind:'duplicates', count: Array.from(dups).length })
  }
  return issues
}

// server/src/dq/remediation.ts
export function patchMapping(mapping: any, issue: any){
  if(issue.kind==='nulls') mapping.transforms[issue.field] = { fill:'UNKNOWN' }
  if(issue.kind==='duplicates') mapping.keys = Array.from(new Set([...(mapping.keys||[]), issue.field]))
  return mapping
}
```

### 4.3 Insight Engine — Card Producer
```ts
// server/src/insights/producer.ts
import { Queue } from 'bullmq'
export type Card = { id:string, org:string, caseId:string, type:'community_change'|'rank_jumper'|'watchlist_hit'|'new_entity', severity:'low'|'med'|'high', summary:string, data:any, provenance:string[], createdAt:string }
export async function produceDaily(org: string){
  // stub: compute diffs from overlays & watchlists
  return [{ id:uid(), org, caseId:'c1', type:'rank_jumper', severity:'med', summary:'Node X moved into top‑10 PageRank', data:{ id:'X', delta:+0.12 }, provenance:['overlay:pagerank:2025-12-08'], createdAt:new Date().toISOString() }]
}
```

### 4.4 Insight Feed Resolver & Subscription
```ts
// server/src/graphql/resolvers/insight.ts
export default {
  Query: {
    insights: async (_:any, { caseId, type, after, limit }:{ caseId:string, type?:string, after?:string, limit?:number }, ctx:any) => {
      return ctx.db.listInsights({ caseId, type, after, limit: limit||50 })
    }
  },
  Subscription: {
    insightStream: { subscribe: (_:any, { caseId }:{ caseId:string }, { pubsub }:any) => pubsub.asyncIterator(`insight:${caseId}`) }
  }
}
```

### 4.5 jQuery UI — DQ Panel & Feed
```js
// apps/web/src/features/dq/jquery-dq.js
$(function(){
  $(document).on('click', '#dq-run', function(){
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ dqRun(mappingId:"${$('#mapId').val()}"){ issues{ field, kind, count } } }` }) })
  })
  $(document).on('click', '.dq-accept-fix', function(){
    const issue = $(this).data('issue')
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ dqAcceptFix(issue:"${issue}"){ ok } }` }) })
  })
})
```

```js
// apps/web/src/features/insights/jquery-feed.js
$(function(){
  const socket = io({ auth:{ token: window.jwt } })
  socket.emit('join', { room: `insight:${window.caseId}` })
  socket.on('insight', function(card){
    $('#feed').prepend(`<div class="card ${card.severity}"><h4>${card.type}</h4><p>${card.summary}</p></div>`) })
})
```

### 4.6 Reliability — Cache Warmer & Advisor
```ts
// server/src/reliability/warm.ts
export async function warmOverlays(caseId:string, driver:any){
  await driver.executeQuery('MATCH (n:Entity { caseId:$caseId }) RETURN n LIMIT 1', { caseId })
  await driver.executeQuery('CALL gds.util.asNode(0) YIELD node RETURN 1') // touch GDS cache
}

// server/src/reliability/advisor.ts
export function hintForQuery(cypher:string){
  if(/\*\*/.test(cypher)) return 'Avoid cartesian products; add relationship pattern.'
  if(/-\[:RELATED\*\d+..\d+\]-/.test(cypher)) return 'Cap variable‑length expansions (e.g., *1..3) and add filters.'
  return null
}
```

### 4.7 k6 — p99 Focus
```js
import http from 'k6/http'
import { Trend } from 'k6/metrics'
const p99 = new Trend('gql_p99')
export const options = { vus: 60, duration: '4m' }
export default function(){
  const res = http.post('http://localhost:4000/graphql', JSON.stringify({ query:'{ searchEntities(q:"acme", limit:50){ type } }' }), { headers:{ 'Content-Type':'application/json' } })
  p99.add(res.timings.duration)
}
```

### 4.8 Docs — Troubleshooting Tree (excerpt)
```md
**Ingest fails DQ gate** → Review null/duplicate issues → Accept suggested mapping patches → Re‑run → If override is needed, record justification.
```

---
## 5) Delivery Timeline
- **D1–D2:** Onboarding wizard + sample import + checklist state.  
- **D3–D4:** DQ checks and remediation; acceptance gate in Ingest Wizard.  
- **D5–D6:** Insight engine (batch + stream) + Feed UI.  
- **D7:** Reliability work (advisor, warmers, cold start registry).  
- **D8:** QA passes, docs, telemetry dashboards, demo polish.

---
## 6) Risks & Mitigations
- **False DQ positives** → preview diffs, reversible patches, allow override w/ reason.  
- **Feed noise** → severity thresholds, per‑case mutes, backpressure & aggregation.  
- **P99 regressions** → advisor hints, cache warmers, rate limits & budgets.

---
## 7) Metrics
- Onboarding completion rate/time; DQ issue density & remediation rate; feed throughput/latency & mute rate; p99 GraphQL; cold start count; error budget usage.

---
## 8) Release Artifacts
- **ADR‑022:** DQ framework & acceptance gates.  
- **ADR‑023:** Insight card taxonomy & lifecycle.  
- **RFC‑026:** Reliability advisor & cache warming strategy.  
- **Runbooks:** Onboarding resets; DQ override; feed backpressure; p99 regression playbook.  
- **Docs:** First‑run quickstart; DQ guide; Insights overview.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) New org → first‑run wizard → sample import → checklist turns green.  
2) Ingest a CSV with DQ issues → accept remediation patches → proceed past gate.  
3) Show Insight Feed: rank jumpers and watchlist hits; subscribe + mute; follow‑up drill‑down.  
4) Review SRE dashboard: p99 down, cold starts reduced; show advisor hints in NL→Cypher panel.

---
## 11) Out‑of‑Scope (backlog)
- Multi‑tenant templates marketplace; auto‑tuning query planner; semantic DQ (ML); feed summarization emails with LLM.
```

