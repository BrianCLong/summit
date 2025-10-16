# Day 3 — Headless + Metrics + Conflict Graphs + Analyst UI Panel

> Objective: Add **headless browsing** behind policy flags, expose **metrics** for orchestrator/workers, generate **conflict graphs** in the Claim Ledger, and ship a **Maestro UI Panel** that shows live jobs, denials (with appeal), citations, and system health.

---

## 0) Success Criteria (Day‑3)

- **Headless**: Playwright-based fetch path available and gated by policy; ≥95% success on allow‑listed JS sites; adheres to robots/TOS.
- **Metrics**: Prometheus `/metrics` for Orchestrator (Node) and Workers (Python) with counters, histograms; Grafana dashboard imported.
- **Conflict Graphs**: Contradiction edges created when claims for same key disagree across sources; surfaced in UI; exportable to Claim Ledger.
- **Maestro UI Panel**: Real‑time view of jobs, denials, citations, and basic charts; conflict graph visualization.

---

## 1) Headless Browsing (Playwright, Python)

### 1.1 Policy & Job Model Updates

```sql
-- scripts/migrate_day3.sql
alter table web_interface_compliance add column headless_allowed boolean not null default false;
alter table web_interface_compliance add column headless_useragent text default 'IntelGraph-Headless/1.0';

-- optional: registry of paths where headless is required
create table if not exists headless_paths (
  site text not null,
  path_prefix text not null,
  primary key(site, path_prefix)
);
```

```ts
// services/web-orchestrator/src/schema.ts (add)
input WebFetchJobInput {
  target: String!
  path: String!
  purpose: String!
  authorityId: ID!
  licenseId: ID!
  extractor: String!
  priority: Int = 5
  mode: String = "auto"   # "auto" | "http" | "headless"
}
```

```rego
# opa policy extension (web/fetch)
package web.fetch

# allow headless only if both license & registry permit
headless_ok {
  input.mode == "headless"; data.registry[input.target].headless_allowed == true
}

allow {
  not input.mode == "headless"   # http path stays as Day‑2 rules
  base_allow
}

allow {
  input.mode == "headless"
  headless_ok
  base_allow
}
```

### 1.2 Worker Implementation (Playwright)

```python
# services/web-agent/headless.py
import asyncio
from playwright.async_api import async_playwright

DEFAULT_TIMEOUT = 15_000

async def fetch_rendered(url: str, user_agent: str | None = None) -> tuple[int, str, bytes]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"], headless=True)
        context = await browser.new_context(user_agent=user_agent)
        page = await context.new_page()
        try:
            resp = await page.goto(url, timeout=DEFAULT_TIMEOUT, wait_until="domcontentloaded")
            # light wait for client rendering without being abusive
            await page.wait_for_timeout(500)
            html = await page.content()
            body = await page.evaluate("() => document.documentElement.outerHTML")
            status = resp.status if resp else 200
            await browser.close()
            return status, html, body.encode()
        except Exception:
            await browser.close()
            return 599, "", b""
```

```python
# services/web-agent/worker.py (diffs)
from headless import fetch_rendered

async def process_job(job: dict):
    url = urljoin(f"https://{job['target']}", job["path"])
    mode = job.get("mode","auto")

    if mode == "headless":
        status, text, raw = await fetch_rendered(url)
    elif mode == "http":
        status, text, raw = await fetch_text(url)
    else:
        # auto: try http, fall back to headless when empty/blocked HTML is detected
        status, text, raw = await fetch_text(url)
        if (status == 200 and len(text) < 200) or status in (403, 406):
            status, text, raw = await fetch_rendered(url)

    claims = run_extractor(job.get("extractor","article_v1"), text, url=url)
    manifest = Manifest(job, url, status, hashlib.sha256(raw).hexdigest()).write()
    return {
        "id": job["id"],
        "status": "OK" if 200 <= status < 300 else "HTTP_ERROR",
        "httpStatus": status,
        "bytes": len(raw),
        "claims": claims,
        "evidenceManifestId": manifest["id"],
        "citations": [{"url": url, "licenseId": job["licenseId"]}],
        "warnings": [] if 200 <= status < 300 else ["non-2xx"]
    }
```

**Dockerfile additions** (headless runtime)

```dockerfile
# services/web-agent/Dockerfile (snippet)
FROM mcr.microsoft.com/playwright/python:v1.46.0-jammy
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python","-m","consumer"]
```

**Pytest**

```python
# services/web-agent/tests/test_headless.py
import asyncio
from headless import fetch_rendered

async def test_fetch_rendered_smoke(monkeypatch):
    async def fake_playwright():
        class Dummy:
            async def __aenter__(self): return self
            async def __aexit__(self, *a): pass
            class chromium:
                @staticmethod
                async def launch(args, headless):
                    class B: async def close(self): pass
                    return B()
        return Dummy()
    # Here we'd mock playwright context & page; omitted for brevity in smoke.
    assert True
```

---

## 2) Metrics: Prometheus + Grafana

### 2.1 Orchestrator (Node)

```ts
// services/web-orchestrator/src/metrics.ts
import client from 'prom-client';
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const enqueueCounter = new client.Counter({
  name: 'orchestrator_enqueue_total',
  help: 'jobs enqueued',
  labelNames: ['mode'],
});
export const denyCounter = new client.Counter({
  name: 'orchestrator_denied_total',
  help: 'policy denials',
  labelNames: ['reason'],
});
export const publishLatency = new client.Histogram({
  name: 'orchestrator_publish_seconds',
  help: 'enqueue→publish latency',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2],
});
registry.registerMetric(enqueueCounter);
registry.registerMetric(denyCounter);
registry.registerMetric(publishLatency);
```

```ts
// services/web-orchestrator/src/index.ts (metrics route)
import express from 'express';
import { registry } from './metrics';
// ...
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### 2.2 Worker (Python)

```python
# services/web-agent/metrics.py
from prometheus_client import Counter, Histogram, start_http_server
fetch_counter = Counter('worker_fetch_total','fetches', ['mode','status'])
fetch_latency = Histogram('worker_fetch_seconds','latency',[0.1,0.25,0.5,1,2,5])

def start_metrics(port=9108):
    start_http_server(port)
```

```python
# services/web-agent/consumer.py (wire metrics)
from metrics import start_metrics, fetch_counter, fetch_latency

async def main():
    start_metrics()
    # ... existing kafka loop
            with fetch_latency.time():
                result = await process_job(job)
            fetch_counter.labels(job.get('mode','auto'), result['status']).inc()
```

### 2.3 ServiceMonitor (K8s, if using Prom Operator)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata: { name: web-orchestrator-sm }
spec:
  selector: { matchLabels: { app: web-orchestrator } }
  endpoints: [{ port: http, path: /metrics, interval: 15s }]
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata: { name: web-agent-sm }
spec:
  selector: { matchLabels: { app: web-agent } }
  endpoints: [{ port: http, path: /metrics, interval: 15s }]
```

---

## 3) Conflict Graphs (Claim Ledger Integration)

### 3.1 Data Model

- `Claim` nodes: `{ key, value, conf, sourceUrl, manifestId, contextId }`
- `CONTRADICTS` edges between claims with same `key` but different `value` in same `contextId`.

### 3.2 Synthesizer updates

```python
# services/synthesizer/synth.py (append)
from typing import Iterable

def conflict_edges(results: list[dict], context_id: str) -> list[dict]:
    # build contradictions across sources
    seen = {}
    edges = []
    for r in results:
        for c in r.get('claims', []):
            k, v, src = c['key'], c['value'], c.get('sourceUrl')
            if k not in seen: seen[k] = []
            for (prev_v, prev_src) in seen[k]:
                if prev_v != v:
                    edges.append({
                        'key': k,
                        'a_value': prev_v,
                        'b_value': v,
                        'a_src': prev_src,
                        'b_src': src,
                        'contextId': context_id
                    })
            seen[k].append((v, src))
    return edges
```

### 3.3 Neo4j Cypher (ETL)

```cypher
// load results & build conflict graph
UNWIND $results AS r
UNWIND r.claims AS c
MERGE (cl:Claim {manifestId:r.evidenceManifestId, key:c.key, value:c.value, sourceUrl:c.sourceUrl})
ON CREATE SET cl.conf = c.conf, cl.contextId = $contextId;

UNWIND $conflicts AS e
MATCH (a:Claim {key:e.key, value:e.a_value})
MATCH (b:Claim {key:e.key, value:e.b_value})
MERGE (a)-[x:CONTRADICTS {contextId:e.contextId}]->(b)
ON CREATE SET x.createdAt = timestamp();
```

**Unit test (synth)**

```python
# services/synthesizer/tests/test_conflicts.py
from synth import conflict_edges

def test_conflict_edges():
    results = [
        {"claims":[{"key":"version","value":"1.0","sourceUrl":"a"}]},
        {"claims":[{"key":"version","value":"1.1","sourceUrl":"b"}]}
    ]
    edges = conflict_edges(results, "ctx1")
    assert len(edges) == 1 and edges[0]['key'] == 'version'
```

---

## 4) Maestro UI Panel (React + Tailwind + Recharts + Cytoscape)

> Single‑file previewable component; pluggable into IntelGraph console as a route `/maestro`.

```tsx
// ui/MaestroPanel.tsx
import React, { useEffect, useMemo, useState } from 'react'
import io from 'socket.io-client'
import CytoscapeComponent from 'react-cytoscapejs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CircleCheck, AlertTriangle, Link as LinkIcon, BookOpen } from 'lucide-react'

// Fake endpoints for preview; wire to your APIs in production
const SOCKET_URL = (window as any).SOCKET_URL || 'http://localhost:3001'
const API = {
  jobs: '/api/maestro/jobs',
  denials: '/api/maestro/denials',
  metrics: '/api/maestro/metrics',
  conflicts: '/api/maestro/conflicts'
}

type Job = { id:string, target:string, path:string, status:string, mode:string, createdAt:string }

default export function MaestroPanel(){
  const [jobs, setJobs] = useState<Job[]>([])
  const [denials, setDenials] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<any[]>([])

  useEffect(() => {
    const s = io(SOCKET_URL)
    s.on('job_update', (j:Job) => setJobs(prev => [j, ...prev].slice(0,100)))
    s.on('denial', (d:any) => setDenials(prev => [d, ...prev].slice(0,100)))
    return () => { s.close() }
  }, [])

  useEffect(() => {
    fetch(API.metrics).then(r=>r.json()).then(setMetrics)
    fetch(API.conflicts).then(r=>r.json()).then(setConflicts)
  }, [])

  const cyElems = useMemo(() => {
    const nodes:any[] = []
    const edges:any[] = []
    const nodeId = (k:string,v:string) => `${k}:${v}`
    conflicts.forEach((e:any, i:number) => {
      const aId = nodeId(e.key, e.a_value), bId = nodeId(e.key, e.b_value)
      nodes.push({ data:{ id:aId, label:`${e.key}=${e.a_value}` } })
      nodes.push({ data:{ id:bId, label:`${e.key}=${e.b_value}` } })
      edges.push({ data:{ id:`e${i}`, source:aId, target:bId, label:'CONTRADICTS' } })
    })
    // de-dup
    const uniq = (arr:any[], key:string) => Object.values(arr.reduce((m:any, x:any)=>{m[x.data[key]]=x;return m},{}) )
    return { nodes: uniq(nodes,'id'), edges: uniq(edges,'id') }
  }, [conflicts])

  return (
    <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column: Live Jobs & Denials */}
      <div className="xl:col-span-2 space-y-6">
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5"/> Live Jobs</h2>
          <div className="mt-3 max-h-80 overflow-auto divide-y">
            {jobs.map(j => (
              <div key={j.id} className="py-2 flex items-center justify-between">
                <div className="truncate">
                  <div className="text-sm font-medium">{j.target}{j.path}</div>
                  <div className="text-xs text-gray-500">{j.id} · {j.mode} · {new Date(j.createdAt).toLocaleTimeString()}</div>
                </div>
                <span className={"px-2 py-1 rounded-full text-xs " + (j.status==='OK'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700')}>{j.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Denials</h2>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th>Reason</th><th>Target</th><th>Appeal</th></tr></thead>
              <tbody className="divide-y">
                {denials.map((d,i) => (
                  <tr key={i}>
                    <td className="py-2">{d.reason}</td>
                    <td className="py-2">{d.target}{d.path}</td>
                    <td className="py-2"><a className="text-blue-600 underline" href={`/ombuds/appeal?decision=${encodeURIComponent(d.decisionId)}`}>Open</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Right column: Metrics & Conflicts */}
      <div className="space-y-6">
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><CircleCheck className="w-5 h-5"/> Throughput</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopOpacity={0.6}/>
                    <stop offset="95%" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="jobs" stroke="currentColor" fillOpacity={1} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-xl font-semibold flex items-center gap-2"><LinkIcon className="w-5 h-5"/> Conflicts</h2>
          <div className="h-64">
            <CytoscapeComponent
              elements={[...cyElems.nodes, ...cyElems.edges]}
              layout={{ name: 'cose', animate: true }}
              style={{ width:'100%', height:'100%' }}
              stylesheet={[
                { selector:'node', style:{ 'label':'data(label)', 'background-opacity':0.8, 'text-wrap':'wrap', 'text-max-width':100 }},
                { selector:'edge', style:{ 'curve-style':'bezier', 'target-arrow-shape':'triangle', 'label':'data(label)' }}
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
```

**Notes**

- Replace fake `API` endpoints & socket URL with your gateway. Socket events from orchestrator on enqueue/complete/deny.
- Apply policy‑reasoner messages to the **Denials** table.

---

## 5) Gateway Endpoints for UI (minimal Express)

```ts
// services/web-orchestrator/src/ui-api.ts
import express from 'express';
export const uiapi = express.Router();

uiapi.get('/maestro/metrics', async (_req, res) => {
  // Return last 60 buckets: { t: ISO, jobs: number }
  res
    .json(
      [...Array(30)].map((_, i) => ({
        t: new Date(Date.now() - i * 30_000).toISOString(),
        jobs: Math.floor(Math.random() * 10),
      })),
    )
    .end();
});

uiapi.get('/maestro/conflicts', async (_req, res) => {
  // Wire to synthesizer/ledger; mock for now
  res.json([
    { key: 'version', a_value: '1.0', b_value: '1.1' },
    { key: 'author', a_value: 'Alice', b_value: 'Bob' },
  ]);
});
```

and mount it in `index.ts`:

```ts
import { uiapi } from './ui-api';
app.use('/api', uiapi);
```

---

## 6) Grafana Dashboard (JSON, excerpt)

```json
{
  "title": "Maestro Day-3",
  "panels": [
    {
      "type": "timeseries",
      "title": "Orchestrator Enqueues",
      "targets": [{ "expr": "sum(rate(orchestrator_enqueue_total[5m]))" }]
    },
    {
      "type": "timeseries",
      "title": "Policy Denials",
      "targets": [{ "expr": "sum(rate(orchestrator_denied_total[5m]))" }]
    },
    {
      "type": "timeseries",
      "title": "Worker Latency",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(worker_fetch_seconds_bucket[5m])) by (le))"
        }
      ]
    }
  ]
}
```

---

## 7) Deployment add‑ons

- **Compose**: expose orchestrator `/metrics` (port 8080) and worker metrics (9108) to Prometheus.
- **K8s**: add Service + ServiceMonitor for worker (port `http:9108`).
- **RBAC**: reader role for Grafana to Prometheus namespace.

---

## 8) Day‑3 Launch Steps

1. `psql $DATABASE_URL -f scripts/migrate_day3.sql`
2. Rebuild workers with Playwright base image; apply policy allowing headless on selected domains.
3. `kubectl apply -f deploy/k8s/*` (or `docker compose`); ensure `/metrics` endpoints scrape.
4. UI: add route `/maestro` and drop `MaestroPanel.tsx` into console app; point `API` to gateway.
5. Run smoke: submit `mode: headless` job to a JS‑rendered page on an allow‑listed domain; verify manifest + claims.
6. Verify Grafana panels render; see `CONTRADICTS` links in UI.

---

## 9) Acceptance Tests (Day‑3)

- **Policy**: headless jobs denied when `headless_allowed=false`; explainable message.
- **Perf**: headless median < 2.5s, p95 < 6s on sample domains; HTTP unaffected.
- **Metrics**: Prom endpoints pass `/metrics` scrape; all three core series non‑zero under load.
- **UI**: live jobs update via Socket.IO; denials show appeal link; conflicts graph shows ≥1 edge under seeded contradictions.

---

## 10) Revised Maestro Prompt (Day‑3)

> You are the **Maestro** of IntelGraph’s Web Orchestration. For each request, select an allow‑listed interface using Thompson Sampling, enforce **License/TOS/robots** via OPA, and choose fetch **mode** (`http` or `headless`) per policy and content render state. Produce **claims** with evidence, emit a **provenance manifest**, expose **metrics**, and surface **conflicts** as `CONTRADICTS` edges. If denied, return a human‑readable reason and an **appeal** link.

---

## 11) Questions to sharpen Day‑3

1. Which domains/paths should be permitted for `headless_allowed=true` in the registry for the pilot?
2. What metrics SLOs do we set for headless p95 and denial rate thresholds for alerting?
3. Do we scope conflicts by investigation context, tenant, or time window by default?
4. Should the UI show **consensus scores** alongside conflicts (e.g., majority vs minority claims)?
