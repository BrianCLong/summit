```markdown
# IntelGraph — Threat Intel & Detection Engineering Sprint (v1.9.0)
**Slug:** `sprint-2026-04-13-intelgraph-v1-9`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-04-13 → 2026-04-24 (10 business days)  
**Theme:** **Threat Intelligence, IOC Matching & Sigma→Cypher** — ingest STIX/TAXII feeds with license controls, normalize to the canonical graph, run real‑time IOC matching against cases, translate Sigma rules into policy‑aware Cypher queries, and wire alerts into watchlists and the Insight Feed.

---
## 0) North Stars & DoD
- **High‑fidelity Intel:** STIX 2.1 objects normalized with provenance, license, confidence & TLP color; dedup/ER with explainability.
- **Fast, Safe Detection:** IOC matching & Sigma→Cypher alerts run within budgets and respect data policies (license/ABAC/purpose).
- **Operational Excellence:** Operator can see connector health, rule hit‑rates, false‑positive labels, and cost controls.
- **SLOs:** p95 TAXII pull < 1.2s per page; IOC match p95 < 400ms on cached indices; alert fan‑out < 500ms; zero Sev‑1.

**DoD Gate:**
1) Demo: add TAXII feed (TLP:AMBER) → ingest STIX → normalized graph with provenance & license → IOC hits create alerts in a case → Sigma rule translated to Cypher yields policy‑filtered results and a Report Studio section.  
2) Operator dashboards show connector throughput, match rates, and alert latency; denials show OPA reasons; overrides audited.

---
## 1) Epics → Objectives
1. **STIX/TAXII Ingestion (TIX‑E1)** — TAXII 2.1 client, collection polling, STIX→canonical mapping, license/TLP propagation.
2. **IOC Matching (IOC‑E2)** — Indexed matchers for IP/URL/domain/hash/email/user‑agent; false‑positive labeling & suppression windows.
3. **Sigma→Cypher (SIG‑E3)** — Parse Sigma rules to policy‑aware Cypher with budgets; rule packs, canary rollouts, hit triage.
4. **Alerting & Insight Feed (ALT‑E4)** — Rule hits → InsightCards + watchlist toasts; dedup, severity, and escalation.
5. **Ops, FinOps & QA (OPS‑E5)** — Health panels, quotas, perf tests, golden corpora, operator playbooks.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- TAXII Connector wizard (URL, creds, collections, TLP, license).
- IOC dashboard (match rates, top IOCs, FP labels) + suppression editor.
- Sigma Rule Studio (import, validate, translate preview, rollout %, hit history).
- Alert center: filters, escalate, annotate, link to cases; watchlist toasts.

### Backend (Node/Express + Apollo + Neo4j + Postgres + Redis + Python helpers)
- TAXII client & polling scheduler; STIX mapper; ER pass with scorecards.
- IOC indexer & matcher (Redis/PG indices) with ABAC/purpose filters; suppression windows.
- Sigma parser → Cypher generator; budgets; sandbox executor; hit writer.
- Alert pipeline (jobs), Insight feed connector, escalation hooks (webhooks/email).

### Ops/SRE & Security
- Grafana panels: connector lag/throughput, match rate, hit latency; quotas per feed; error budgets.
- OPA policies: feed license/TLP gating; rule enablement approvals; provenance required for exports.

### QA/Docs
- Golden STIX bundles and IOC corpora; Sigma packs; E2E scenarios; operator & analyst guides.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### STIX/TAXII (26 pts)
1. TAXII 2.1 polling + pagination.  
   **AC:** Auth (basic/APIKey); collection select; incremental since cursor; retries + DLQ. (**L**)
2. STIX→canonical mapping + license/TLP propagation.  
   **AC:** Indicators/Observables → Entities/Claims; `tlp` & `marking` on sources; provenance chain. (**L**)
3. ER on indicators (dedup) + explainability.  
   **AC:** Merge by value/type; scorecards; reversible; audit entries. (**M**)

### IOC Matching (26 pts)
4. IOC indices (IP/URL/domain/hash/email/UA).  
   **AC:** Indexed in Redis/PG; ABAC filters; p95 < 400ms. (**L**)
5. Match pipeline → alerts + suppression.  
   **AC:** Severity mapping; suppression window by IOC/case; FP label hides for 30d; audit trail. (**L**)
6. IOC dashboard UI.  
   **AC:** Rates, top hits, FP controls; keyboard accessible. (**M**)

### Sigma→Cypher (28 pts)
7. Sigma parser & validation.  
   **AC:** Parse v2 rules incl. logsource; validation errors with line/col; tests. (**L**)
8. Translator to policy‑aware Cypher + budgets.  
   **AC:** Preview Cypher; sandbox run; denial reasons; accuracy on golden ≥ 90%. (**L**)
9. Rule rollout & hit history.  
   **AC:** Canary %, disable on FP surge; history chart; export to Report Studio. (**M**)

### Ops/QA (12 pts)
10. Dashboards/quotas & docs.  
    **AC:** Panels live; feed quotas; operator + analyst guides; E2E tests pass. (**M**)

---
## 4) Scaffolds & Code

### 4.1 TAXII Client (TypeScript)
```ts
// server/src/taxii/client.ts
import axios from 'axios'
export async function pollCollection(base:string, collectionId:string, since?:string, token?:string){
  const headers:any = { Accept:'application/taxii+json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  let next = `${base}/collections/${collectionId}/objects/?limit=200${since?`&added_after=${encodeURIComponent(since)}`:''}`
  const pages:any[] = []
  while(next){
    const { data } = await axios.get(next, { headers, timeout: 8000 })
    pages.push(data)
    next = data.more ? data.next : ''
  }
  return pages.flatMap(p=>p.objects||[])
}
```

### 4.2 STIX → Canonical Mapping
```ts
// server/src/taxii/map.ts
export function mapStix(obj:any){
  switch(obj.type){
    case 'indicator': return mapIndicator(obj)
    case 'observed-data': return mapObserved(obj)
    case 'malware': return mapMalware(obj)
    default: return null
  }
}
function mapIndicator(ind:any){
  return {
    entity: { type:'Indicator', id: ind.id, name: ind.name, tlp: ind.object_marking_refs||[], license: pickLicense(ind) },
    claims: parsePatterns(ind.pattern, ind.valid_from)
  }
}
```

### 4.3 IOC Indexer & Matcher
```ts
// server/src/ioc/index.ts
import { createHash } from 'crypto'
const idx = { ip:new Map(), domain:new Map(), url:new Map(), hash:new Map(), email:new Map(), ua:new Map() }
export function indexIOC(kind:string, value:string, ref:{source:string,id:string}){
  const k = key(value); const m = (idx as any)[kind]; if(!m) return; if(!m.has(k)) m.set(k,[]); m.get(k).push(ref)
}
export function matchIOC(kind:string, value:string){
  const m = (idx as any)[kind]; return m?.get(key(value))||[]
}
function key(v:string){ return createHash('sha1').update(v.toLowerCase()).digest('hex') }
```

### 4.4 Sigma → Cypher Translator (excerpt)
```ts
// server/src/sigma/translate.ts
export function sigmaToCypher(rule:string){
  // extremely simplified: translates `selection: domain|contains: "evil.com"` to Cypher
  if (/contains: \"(.*)\"/.test(rule)){
    const val = rule.match(/contains: \"(.*)\"/)![1]
    return `MATCH (e:Event) WHERE e.domain CONTAINS '${val}' RETURN e LIMIT 100`
  }
  return 'MATCH (e:Event) RETURN e LIMIT 1'
}
```

### 4.5 Policy Gate for Feeds & Rules (OPA)
```rego
package intelgraph.threat

default allow_feed = false

a llow_feed {
  input.feed.tlp in {"WHITE","GREEN","AMBER"}
  not (input.feed.license == "Prohibited")
}

default allow_rule = false

allow_rule {
  input.user.role in {"secops","case_owner"}
  input.rule.budget.ms <= 1500
}
```

### 4.6 Alert Fan‑out
```ts
// server/src/alerts/threat.ts
import axios from 'axios'
export async function fanout(io, alert){
  io.to(`case:${alert.caseId}`).emit('alert', alert)
  for (const url of alert.webhooks||[]) try { await axios.post(url, alert, { timeout: 1200 }) } catch {}
}
```

### 4.7 jQuery — Sigma Rule Studio Hooks
```js
// apps/web/src/features/sigma/jquery-studio.js
$(function(){
  $('#sigma-import').on('change', function(){
    const text = this.files[0]; text.text().then(src => $('#sigma-src').val(src))
  })
  $('#sigma-preview').on('click', function(){
    const src = $('#sigma-src').val()
    $.ajax({ url:'/graphql', method:'POST', contentType:'application/json', data: JSON.stringify({ query:`mutation{ sigmaPreview(src:${JSON.stringify(src)}){ cypher, budgetMs } }` }) })
  })
})
```

### 4.8 Grafana Panels (YAML)
```yaml
panels:
  - title: TAXII lag (s)
    query: max_over_time(taxii_collection_lag_seconds[5m])
  - title: IOC match rate
    query: sum(rate(ioc_matches_total[5m])) by (kind)
  - title: Alert fan‑out p95
    query: histogram_quantile(0.95, sum(rate(alert_ms_bucket[5m])) by (le))
  - title: Sigma FP ratio
    query: sum(delta(sigma_fp_total[1d])) / (sum(delta(sigma_tp_total[1d])) + 1)
```

### 4.9 Helm — Connector Concurrency & Quotas
```yaml
# ops/helm/values.threat.yaml
connectors:
  taxii:
    pollSeconds: 120
    concurrency: 2
    quotas:
      maxObjectsPerDay: 200000
      maxBandwidthMB: 500
```

### 4.10 k6 — TAXII + IOC Match Load
```js
import http from 'k6/http'
export const options = { vus: 40, duration: '3m' }
export default function(){
  http.get('http://localhost:4000/api/taxii/poll?collection=indicators')
  http.post('http://localhost:4000/graphql', JSON.stringify({ query:'{ iocMatch(kind:"domain", value:"evil.com"){ source id } }' }), { headers:{ 'Content-Type':'application/json' } })
}
```

---
## 5) Delivery Timeline
- **D1–D2:** TAXII client + mapper + license/TLP propagation.  
- **D3–D4:** IOC indices & matcher + alert pipeline; dashboard skeleton.  
- **D5–D6:** Sigma parser→Cypher + sandbox budgets; Rule Studio UI.  
- **D7:** Watchlist/Insight integration; suppression & FP labeling.  
- **D8–D10:** Perf, quotas, docs, golden corpora, demo polish.

---
## 6) Risks & Mitigations
- **Low‑quality intel** → source scoring, confidence thresholds, FP suppression windows.  
- **Policy/licensing conflicts** → strict OPA gates, visible reasons, license registry.  
- **Rule explosions** → canary rollout, budgets, kill‑switch, hit‑rate caps.  
- **Cost spikes** → quotas, backoff, sampling, cache indices.

---
## 7) Metrics
- TAXII lag/throughput; IOC match rate & latency; Sigma precision/recall on golden; alert fan‑out p95; FP labels; SLO compliance.

---
## 8) Release Artifacts
- **ADR‑038:** STIX/TAXII ingestion & mapping.  
- **ADR‑039:** IOC indices & matching strategy.  
- **RFC‑034:** Sigma→Cypher translation & rollout policy.  
- **Runbooks:** TAXII failures; IOC FP triage; rule rollback; alert storm handling.  
- **Docs:** Threat intel setup; IOC dashboard; Sigma rule authoring.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Configure a TAXII feed (TLP:AMBER) → ingest indicators; show provenance & license.  
2) Open a case with matching artifacts → IOC dashboard shows hits → label one as FP (suppressed).  
3) Import a Sigma rule → preview Cypher & budget → canary to 25% → hits appear with toasts + Insight cards.  
4) Review dashboards: TAXII lag, IOC match rate, alert fan‑out p95; show a policy denial reason on over‑budget rule.

---
## 11) Out‑of‑Scope (backlog)
- ATT&CK technique mapping visualizations; YARA integration at scale; UEBA models; automated intel source scoring; cross‑tenant intel sharing.
```

