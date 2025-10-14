# Performance & Benchmarking Pack — Cost‑per‑Insight, Scaling & Tuning

> End‑to‑end performance harness to quantify **cost per insight** across NL→Cypher → Analytics/Pattern → Runbook → Report, with datasets from Tiny→Large, Neo4j/GDS tuning, k6 wave tests, Grafana dashboards, and optimization playbooks. Includes repeatable profiles (local Docker and K8s), caching, and guardrails.

---

## 0) Repo Layout
```
intelgraph/
├─ perf/
│  ├─ profiles/
│  │  ├─ tiny.yaml           # 1k nodes / 5k rels
│  │  ├─ demo.yaml           # 5k / 30k
│  │  ├─ large.yaml          # 50k / 300k
│  │  └─ xlarge.yaml         # 200k / 1.5M (K8s only)
│  ├─ k6/
│  │  ├─ wave-nl2c.js
│  │  ├─ wave-analytics.js
│  │  ├─ wave-runbook.js
│  │  └─ storm-mix.js
│  ├─ neo4j/
│  │  ├─ gds-tuning.cypher   # memory/pagecache/graph projections
│  │  └─ indexes.cypher      # schema indexes/constraints
│  ├─ scripts/
│  │  ├─ run-suite.ts        # orchestrates all waves & captures metrics
│  │  ├─ export-metrics.ts   # snapshots Prom → JSON/CSV
│  │  ├─ summarize.ts        # computes cost per insight KPIs
│  │  └─ cache-warm.ts       # pre-warm projections & caches
│  ├─ dashboards/
│  │  ├─ cost-per-insight.json
│  │  └─ neo4j-gds-health.json
│  └─ README.md
└─ ops/
   └─ grafana/provisioning/dashboards/ (symlink or copy of dashboards)
```

---

## 1) Definitions — What we measure
- **Insight**: any successful, provenance‑stamped analytic or pattern result that meets acceptance (non‑empty + explain panel).
- **Cost per insight (CPI)**: `(infra $ + compute time + cache misses) / insights produced` over test window.
- **Latency**: p50/p90/p95 for NL→Cypher, Analytics, Pattern, Runbook, Report.
- **Throughput**: insights/minute under wave load.
- **Resource**: CPU, RSS, page cache, GDS mem, GC pauses.

---

## 2) Neo4j/GDS Tuning
```cypher
// perf/neo4j/indexes.cypher
CREATE INDEX ent_id IF NOT EXISTS FOR (n:Entity) ON (n.id);
CREATE INDEX rel_flag IF NOT EXISTS FOR ()-[r:RELATES]-() ON (r.weight);
```

```cypher
// perf/neo4j/gds-tuning.cypher
CALL gds.graph.drop('ig_pr', false);
CALL gds.graph.project('ig_pr','Entity','RELATES',{ relationshipProperties:['weight'] });
CALL gds.graph.drop('ig_louvain', false);
CALL gds.graph.project('ig_louvain','Entity','RELATES');
```

---

## 3) k6 Waves
```js
// perf/k6/wave-nl2c.js
import http from 'k6/http'; import { sleep } from 'k6';
export const options = { stages:[{duration:'1m',target:10},{duration:'2m',target:50},{duration:'1m',target:0}] };
export default function(){
  http.post('http://localhost:7000/graphql', JSON.stringify({query:'mutation($i:NLQueryInput!){ generateCypher(input:$i){ estimateMs cypher }}', variables:{ i:{ text:'top 50 nodes by pagerank' }}}), { headers:{ 'content-type':'application/json' }});
  sleep(1);
}
```

```js
// perf/k6/wave-analytics.js
import http from 'k6/http'; import { sleep } from 'k6';
export const options = { vus: 30, duration: '3m' };
export default function(){
  http.post('http://localhost:7000/graphql', JSON.stringify({query:'mutation{ runAnalytics(name:"pagerank"){ name }}'}), { headers:{ 'content-type':'application/json' }});
  sleep(0.5);
}
```

```js
// perf/k6/wave-runbook.js
import http from 'k6/http'; import { sleep } from 'k6';
export const options = { stages:[{duration:'30s',target:5},{duration:'2m',target:20},{duration:'30s',target:0}] };
export default function(){
  const rb = { id:'R7',name:'Community Snapshot',nodes:[{id:'nl',type:'nl2cypher',params:{ text:'community detection' }},{id:'an',type:'analytics',params:{ name:'louvain' }}] };
  http.post('http://localhost:7008/run', JSON.stringify(rb), { headers:{ 'content-type':'application/json' }});
  sleep(1);
}
```

```js
// perf/k6/storm-mix.js
import http from 'k6/http'; import { sleep } from 'k6';
export const options = { vus: 60, duration: '5m' };
export default function(){
  const r = Math.random();
  if(r<0.3){ http.post('http://localhost:7000/graphql', JSON.stringify({query:'mutation{ runAnalytics(name:"pagerank"){ name }}'}), { headers:{ 'content-type':'application/json' }}); }
  else if(r<0.6){ http.post('http://localhost:7000/graphql', JSON.stringify({query:'mutation($i:NLQueryInput!){ generateCypher(input:$i){ cypher }}',variables:{i:{text:'shortest path from A to D'}}}), { headers:{ 'content-type':'application/json' }}); }
  else { http.post('http://localhost:7004/pattern/cotravel', JSON.stringify({ withinHours:6 }), { headers:{ 'content-type':'application/json' }}); }
  sleep(0.3);
}
```

---

## 4) Orchestrator — Run the Suite & Capture CPI
```ts
// perf/scripts/run-suite.ts
import { execSync } from 'child_process';
import fs from 'fs';
function run(cmd:string){ console.log('> '+cmd); execSync(cmd,{ stdio:'inherit' }); }
function scrape(){ execSync('node perf/scripts/export-metrics.ts', { stdio:'inherit' }); }

const profile = process.env.PROFILE||'demo';
const waves = ['wave-nl2c','wave-analytics','wave-runbook','storm-mix'];
run('node perf/scripts/cache-warm.ts');
for(const w of waves){ run(`docker run --network host -i grafana/k6 run - < perf/k6/${w}.js`); scrape(); }
run('node perf/scripts/summarize.ts');
```

```ts
// perf/scripts/export-metrics.ts
import fs from 'fs'; import fetch from 'node-fetch';
const prom = process.env.PROM_URL||'http://localhost:9090';
const Q = (q:string)=>`${prom}/api/v1/query?query=${encodeURIComponent(q)}`;
async function main(){
  const metrics = {} as any;
  async function grab(name:string,q:string){ metrics[name] = await (await fetch(Q(q))).json(); }
  await grab('analytics_latency_ms','histogram_quantile(0.95, sum(rate(http_server_duration_bucket{service="analytics-service"}[5m])) by (le))');
  await grab('gateway_rps','sum(rate(http_requests_total{service="gateway-graphql"}[5m]))');
  await grab('neo4j_pagecache_hit_ratio','avg(neo4j_page_cache_hit_ratio)');
  fs.writeFileSync('perf-metrics.json', JSON.stringify(metrics,null,2));
}
main();
```

```ts
// perf/scripts/summarize.ts
import fs from 'fs';
const m = JSON.parse(fs.readFileSync('perf-metrics.json','utf8'));
function val(x:any){ return Number(x.data.result?.[0]?.value?.[1]||0); }
const p95 = val(m.analytics_latency_ms);
const rps = val(m.gateway_rps);
const hit = val(m.neo4j_pagecache_hit_ratio);
const insights = Math.max(1, Math.round(rps*60*0.4)); // crude: 40% of requests yield insights
const infraCost = 0.25; // $/min placeholder for local; override in K8s with real cost exporter
const cpi = (infraCost/Math.max(insights,1)).toFixed(4);
console.log(JSON.stringify({ p95_ms:p95, rps, pagecache_hit:hit, insights_per_min:insights, cost_per_insight:cpi }));
```

```ts
// perf/scripts/cache-warm.ts
import fetch from 'node-fetch';
(async()=>{
  await fetch('http://localhost:7474',{}).catch(()=>{});
  await fetch('http://localhost:7000/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'mutation{ runAnalytics(name:"pagerank"){ name }}'})});
})();
```

---

## 5) Grafana Dashboards
- **cost-per-insight.json**:
  - CPI (gauge), insights/min (stat), p95 latency (time series), RPS, cache hit ratio, slow‑query kills, budget denies.
- **neo4j-gds-health.json**:
  - Page cache %, heap used, GDS graph count, projection build times, query heatmap.

Place JSON under `ops/grafana/provisioning/dashboards/` for auto‑load.

---

## 6) Make Targets
```make
perf-demo:
	node perf/scripts/run-suite.ts

perf-large:
	PROFILE=large node perf/scripts/run-suite.ts

perf-k8s:
	# assumes Prom endpoint set via PROM_URL and real cost exporter (kubecost) bound
	PROM_URL=http://prometheus:9090 node perf/scripts/run-suite.ts
```

---

## 7) Optimization Playbook
- **Neo4j**: add `:RELATES(id)` relationship index if path queries dominate; prefer projections for repeat analytics.
- **GDS**: persist in‑memory projections; batch updates; schedule heavy analytics off‑peak.
- **Gateway**: enable LRU on NL→Cypher results; debounce identical analytic requests per tenant/case.
- **Budget Guard**: adapt budgets by profile (tiny/demo/large/xlarge) to avoid noisy aborts.
- **Cache**: claim manifests cached in Redis; invalidate on new claims.

---

## 8) Pass/Fail Gates
- **P95 analytics < 1500 ms** on demo profile.
- **CPI ≤ $0.005** (local placeholder) or **≤ target set per env**.
- **Page cache hit ratio ≥ 0.9** during waves.
- **Zero** failed provenance verifications.

---

## 9) CI Hook (optional)
```yaml
# .github/workflows/perf-check.yaml
name: perf-check
on: [workflow_dispatch]
jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.dev.yaml up -d --build
      - run: node perf/scripts/run-suite.ts
      - run: node -e "const o=require('./perf-metrics.json'); console.log('OK')"
```

---

## 10) Outputs
- `perf-metrics.json`: raw Prom snapshots.
- `summary.json`: CPI & KPI summary (stdout of summarize.ts captured).
- Grafana panels updated; screenshots embedded in PR.

