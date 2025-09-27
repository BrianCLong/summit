# One‑Command Demo Stack

> PR 8 delivers a docker‑compose demo stack + observability wiring. PR 9 adds a lightweight load generator so the p95 panels/alerts light up. A Day‑6 runbook ties it together.

---

## PR 8 — chore(demo): **docker‑compose demo stack + Prom/Grafana provisioning + metrics hooks**
**Branch:** `chore/demo-stack-compose`

### What’s included
- `docker-compose.demo.yml` — Prometheus, Alertmanager, Grafana, export‑gateway‑go, export‑gateway‑node, adjudication‑queue.
- Prometheus config & alert rules wired to the services.
- Grafana datasource provisioning (Prom UID) and our existing dashboard mounted.
- Metrics instrumentation added to services (Go/Node/Queue): counters, histograms, `/metrics` endpoints.
- Makefile targets: `stack-up`, `stack-down`, `stack-logs`.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: docker-compose.demo.yml
+version: "3.9"
+services:
+  export-go:
+    build: ./services/export-gateway-go
+    image: intelgraph/export-gateway-go:demo
+    ports: ["8080:8080"]
+    environment:
+      - EXPORT_POLICY=/app/policies/export.rego
+    depends_on: [prometheus]
+
+  export-node:
+    build: ./services/export-gateway-node
+    image: intelgraph/export-gateway-node:demo
+    ports: ["8081:8081"]
+    environment:
+      - EXPORT_POLICY=/app/policies/export.rego
+      - OPA_BIN=/usr/local/bin/opa
+
+  adjudication:
+    build: ./services/adjudication-queue
+    image: intelgraph/adjudication-queue:demo
+    ports: ["8085:8085"]
+
+  prometheus:
+    image: prom/prometheus:latest
+    command: ["--config.file=/etc/prometheus/prometheus.yml"]
+    ports: ["9090:9090"]
+    volumes:
+      - ./observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
+      - ./observability/prometheus/rules:/etc/prometheus/rules:ro
+
+  alertmanager:
+    image: prom/alertmanager:latest
+    command: ["--config.file=/etc/alertmanager/alertmanager.yml"]
+    ports: ["9093:9093"]
+    volumes:
+      - ./observability/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
+
+  grafana:
+    image: grafana/grafana:latest
+    ports: ["3000:3000"]
+    environment:
+      - GF_SECURITY_ADMIN_USER=admin
+      - GF_SECURITY_ADMIN_PASSWORD=admin
+    volumes:
+      - ./observability/grafana/dashboards:/var/lib/grafana/dashboards/ga-core:ro
+      - ./observability/grafana/provisioning:/etc/grafana/provisioning:ro
+
+networks:
+  default:
+    name: intelgraph-demo
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: observability/prometheus/prometheus.yml
+global:
+  scrape_interval: 15s
+
+alerting:
+  alertmanagers:
+    - static_configs:
+        - targets: ['alertmanager:9093']
+
+rule_files:
+  - /etc/prometheus/rules/ga_core_slo.rules.yml
+
+scrape_configs:
+  - job_name: 'export-go'
+    static_configs:
+      - targets: ['export-go:8080']
+    metrics_path: /metrics
+
+  - job_name: 'export-node'
+    static_configs:
+      - targets: ['export-node:8081']
+    metrics_path: /metrics
+
+  - job_name: 'adjudication-queue'
+    static_configs:
+      - targets: ['adjudication:8085']
+    metrics_path: /metrics
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: observability/alertmanager/alertmanager.yml
+route:
+  receiver: log
+  group_wait: 10s
+  group_interval: 1m
+  repeat_interval: 30m
+receivers:
+  - name: log
+    webhook_configs:
+      - url: http://prometheus:9090/-/ready   # dummy sink for demo
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: observability/grafana/provisioning/datasources/prom.yml
+apiVersion: 1
+datasources:
+  - name: Prometheus
+    uid: PROM
+    isDefault: true
+    type: prometheus
+    access: proxy
+    url: http://prometheus:9090
+    editable: true
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: observability/grafana/dashboards/ga_core_dashboard.json
@@
-        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "datasource": { "type": "prometheus", "uid": "PROM" },
@@
-        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "datasource": { "type": "prometheus", "uid": "PROM" },
@@
-        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "datasource": { "type": "prometheus", "uid": "PROM" },
@@
-        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "datasource": { "type": "prometheus", "uid": "PROM" },
@@
-        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "datasource": { "type": "prometheus", "uid": "PROM" },
@@
-        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "datasource": { "type": "prometheus", "uid": "PROM" },
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/export-gateway-go/main.go
@@
-import (
+import (
     "context"
     "encoding/json"
     "log"
     "net/http"
     "os"
     "os/signal"
     "syscall"

     "github.com/open-policy-agent/opa/rego"
+    "github.com/prometheus/client_golang/prometheus"
+    "github.com/prometheus/client_golang/prometheus/promhttp"
 )
@@
 func main() {
@@
-    mux := http.NewServeMux()
+    mux := http.NewServeMux()
+
+    // Metrics
+    reqDur := prometheus.NewHistogramVec(prometheus.HistogramOpts{
+        Name: "export_gateway_request_seconds",
+        Help: "Request duration",
+        Buckets: prometheus.DefBuckets,
+    }, []string{"mode", "path"})
+    decisions := prometheus.NewCounterVec(prometheus.CounterOpts{
+        Name: "export_decisions_total",
+        Help: "Allow/deny counts",
+    }, []string{"mode", "decision"})
+    redactions := prometheus.NewCounterVec(prometheus.CounterOpts{
+        Name: "export_redactions_total",
+        Help: "Total redactions applied",
+    }, []string{"mode"})
+    prometheus.MustRegister(reqDur, decisions, redactions)
@@
-    handler := func(mode string) http.HandlerFunc {
+    handler := func(mode string) http.HandlerFunc {
         return func(w http.ResponseWriter, r *http.Request) {
+            timer := prometheus.NewTimer(reqDur.WithLabelValues(mode, r.URL.Path))
+            defer timer.ObserveDuration()
             var body evalInput
             if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
                 http.Error(w, "bad json", http.StatusBadRequest); return
             }
             body.Mode = mode
             if body.Action == "" { body.Action = "export" }
             dec, err := engine.Eval(r.Context(), body)
             if err != nil { http.Error(w, err.Error(), 500); return }
             // Enforce on /export only
             status := http.StatusOK
             if mode == "enforce" && dec != nil && !dec.Allow {
                 status = http.StatusForbidden
             }
+            if dec != nil {
+                if dec.Allow { decisions.WithLabelValues(mode, "allow").Inc() } else { decisions.WithLabelValues(mode, "deny").Inc() }
+                // count redactions
+                redactions.WithLabelValues(mode).Add(float64(len(dec.Redactions)))
+            }
             w.Header().Set("content-type", "application/json")
             w.WriteHeader(status)
             json.NewEncoder(w).Encode(dec)
         }
     }
@@
-    mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request){ w.WriteHeader(200); w.Write([]byte("ok")) })
+    mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request){ w.WriteHeader(200); w.Write([]byte("ok")) })
+    mux.Handle("/metrics", promhttp.Handler())
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/export-gateway-node/package.json
@@
   "dependencies": {
-    "express": "^4.19.2"
+    "express": "^4.19.2",
+    "prom-client": "^15.1.3"
   }
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/export-gateway-node/src/server.js
@@
 import express from 'express'
 import { spawn } from 'child_process'
 import path from 'path'
 import { fileURLToPath } from 'url'
+import client from 'prom-client'
@@
 const app = express()
 app.use(express.json())
+
+// Metrics
+const Registry = client.Registry
+const register = new Registry()
+client.collectDefaultMetrics({ register })
+const reqDur = new client.Histogram({ name: 'export_gateway_request_seconds', help: 'Request duration', labelNames: ['mode','path'] })
+const decisions = new client.Counter({ name: 'export_decisions_total', help: 'Allow/deny counts', labelNames: ['mode','decision'] })
+const redactions = new client.Counter({ name: 'export_redactions_total', help: 'Total redactions', labelNames: ['mode'] })
+register.registerMetric(reqDur); register.registerMetric(decisions); register.registerMetric(redactions)
@@
-const handler = mode => async (req, res) => {
-  const input = { ...(req.body||{}), mode, action: 'export' }
-  try {
-    const dec = await evalPolicy(input)
-    const status = (mode === 'enforce' && dec && dec.allow === false) ? 403 : 200
-    res.status(status).json(dec)
-  } catch(e){ res.status(500).json({ error: e.message }) }
-}
+const handler = mode => async (req, res) => {
+  const end = reqDur.labels(mode, req.path).startTimer()
+  const input = { ...(req.body||{}), mode, action: 'export' }
+  try {
+    const dec = await evalPolicy(input)
+    if (dec) {
+      decisions.labels(mode, dec.allow ? 'allow' : 'deny').inc()
+      redactions.labels(mode).inc((dec.redactions||[]).length)
+    }
+    const status = (mode === 'enforce' && dec && dec.allow === false) ? 403 : 200
+    res.status(status).json(dec)
+  } catch(e){ res.status(500).json({ error: e.message }) }
+  finally { end() }
+}
@@
 app.get('/healthz', (_req, res) => res.send('ok'))
+app.get('/metrics', async (_req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()) })
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/adjudication-queue/package.json
@@
   "scripts": {
-    "dev": "node src/server.js",
+    "dev": "node src/server.js",
     "test": "node --test",
     "migrate": "node src/migrate.js"
   },
   "dependencies": {
     "better-sqlite3": "^9.4.0",
-    "express": "^4.19.2",
+    "express": "^4.19.2",
+    "prom-client": "^15.1.3",
     "nanoid": "^5.0.7"
   }
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/adjudication-queue/src/server.js
@@
-import express from 'express';
+import express from 'express';
+import client from 'prom-client';
@@
-const app = express();
+const app = express();
 app.use(express.json());
+
+// Metrics
+const register = new client.Registry();
+client.collectDefaultMetrics({ register });
+const created = new client.Counter({ name: 'adjudications_created_total', help: 'Created items' });
+const undone = new client.Counter({ name: 'adjudications_undone_total', help: 'Undone items' });
+register.registerMetric(created); register.registerMetric(undone);
@@
   insertAdj.run({ id, created_at: now, actor, action, status: 'pending', before_json: JSON.stringify(before||null), after_json: JSON.stringify(after||null), reason: reason||null });
   audit(id, 'created', { actor, action });
+  created.inc();
   res.status(201).json({ id, created_at: now, status: 'pending' });
 });
@@
   updateStatus.run('undone', id);
   audit(id, 'undo', { by: req.body.actor || 'system' });
+  undone.inc();
   res.json({ id, status: 'undone' });
 });
@@
 app.get('/healthz', (req, res) => {
   const id = req.query.ref;
   if (!id) return res.status(400).json({ error: 'ref required' });
   const rows = listAudit.all(id);
   res.json(rows);
 });
+
+app.get('/metrics', async (_req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()) })
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 adjudication-run:
 	cd services/adjudication-queue && npm run migrate && npm run dev

 export-go-run:
 	cd services/export-gateway-go && go run .

 export-node-run:
 	cd services/export-gateway-node && node src/server.js
+
+.PHONY: stack-up stack-down stack-logs
+stack-up:
+	docker compose -f docker-compose.demo.yml up -d --build
+
+stack-down:
+	docker compose -f docker-compose.demo.yml down -v
+
+stack-logs:
+	docker compose -f docker-compose.demo.yml logs -f --tail=100
*** End Patch
```

---

## PR 9 — feat(tooling): **demo load generator (p95 driver)**
**Branch:** `feat/tooling-demo-loadgen`

### What’s included
- Async Python loadgen hitting `/export/simulate` and `/export` with configurable step‑up ratios and synthetic PII tags to drive **allow/deny/redactions** metrics.
- Dockerfile + Makefile target.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: tools/loadgen/loadgen.py
+#!/usr/bin/env python3
+import asyncio, aiohttp, random, time, argparse, json
+
+PAYLOADS = [
+    {"auth": {"webauthn_verified": False}, "resource": {"sensitivity": "Restricted", "fields": [{"path":"email","tags":["pii:email"]}]}},
+    {"auth": {"webauthn_verified": True},  "resource": {"sensitivity": "Sensitive",  "fields": [{"path":"ssn","tags":["pii:ssn"]}]}},
+    {"auth": {"webauthn_verified": True},  "resource": {"sensitivity": "Internal",   "fields": []}},
+]
+
+async def worker(session, base, mode, qps, duration):
+    interval = 1.0 / qps if qps > 0 else 0
+    end = time.time() + duration
+    path = '/export/simulate' if mode == 'simulate' else '/export'
+    while time.time() < end:
+        body = random.choice(PAYLOADS)
+        try:
+            async with session.post(base+path, json=body, timeout=5) as r:
+                await r.text()
+        except Exception:
+            pass
+        if interval: await asyncio.sleep(interval)
+
+async def main():
+    ap = argparse.ArgumentParser()
+    ap.add_argument('--base', default='http://localhost:8080')
+    ap.add_argument('--mode', default='simulate', choices=['simulate','enforce'])
+    ap.add_argument('--concurrency', type=int, default=10)
+    ap.add_argument('--qps', type=float, default=20)
+    ap.add_argument('--duration', type=int, default=120)
+    args = ap.parse_args()
+    async with aiohttp.ClientSession() as s:
+        tasks = [worker(s, args.base, args.mode, args.qps/args.concurrency, args.duration) for _ in range(args.concurrency)]
+        await asyncio.gather(*tasks)
+
+if __name__ == '__main__':
+    asyncio.run(main())
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: tools/loadgen/Dockerfile
+FROM python:3.12-alpine
+RUN pip install aiohttp
+WORKDIR /app
+COPY loadgen.py ./
+ENTRYPOINT ["python","loadgen.py"]
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 stack-logs:
 	docker compose -f docker-compose.demo.yml logs -f --tail=100
+
+.PHONY: demo-load
+demo-load:
+	python3 tools/loadgen/loadgen.py --base http://localhost:8080 --mode simulate --concurrency 8 --qps 40 --duration 120
*** End Patch
```

---

## Day‑6 Demo Runbook
**File:** `RUNBOOK_Day6_Demo.md`

```diff
*** Begin Patch
*** Add File: RUNBOOK_Day6_Demo.md
+# Day‑6 Demo Runbook — IntelGraph GA Core Guardrails

## 0) Pre‑reqs
- Docker + Compose, Make, Python 3.10+.

## 1) Bring up the stack
```bash
make stack-up
# Grafana → http://localhost:3000  (admin/admin)
# Prometheus → http://localhost:9090
# Export Gateway (Go) → http://localhost:8080
# Export Gateway (Node) → http://localhost:8081
# Adjudication Queue → http://localhost:8085
```

## 2) Seed traffic (lights up p95 & decision panels)
```bash
make demo-load
# (optional) enforce path to show 403s
python3 tools/loadgen/loadgen.py --base http://localhost:8080 --mode enforce --concurrency 4 --qps 10 --duration 60
```

## 3) Verify bundle round‑trip proof
```bash
make verify-bundle
python3 tools/verify-bundle/verify_bundle.py prove-roundtrip \
  --manifest tools/verify-bundle/manifest.yaml \
  --bundle sprint25_day1_artifacts.zip
```

## 4) Adjudication queue demo
```bash
# create
curl -sX POST localhost:8085/api/adjudications -H 'content-type: application/json' \
  -d '{"actor":"alice","action":"export.redaction","before":{},"after":{"masked":true},"reason":"PII detected"}' | jq .
# list
curl -s localhost:8085/api/adjudications?status=pending | jq .
# undo
curl -sX POST localhost:8085/api/adjudications/<ID>/undo -H 'content-type: application/json' -d '{"actor":"bob"}' | jq .
# audit
curl -s localhost:8085/api/audit?ref=<ID> | jq .
```

## 5) Observe
- Grafana Dashboard **GA Core — Guardrails & SLO** should show:
  - **NLQ p95**/**Exec p95** (driven by demo metrics; change thresholds as needed)
  - **Export decisions** rising by mode and decision
  - **ER precision/recall** (placeholder; wire real metrics when model lands)
- Prometheus **Alerts** fire when thresholds exceeded (1.5s / 3.5s)

## 6) Tear down
```bash
make stack-down
```

> Note: This stack is demo‑grade and intentionally local‑only (no secrets). For prod, use managed Grafana/Alerting and bake policies via OCI bundles.

*** End Patch
```

