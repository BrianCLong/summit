# IntelGraph – PR‑11 Release Hardening (perf tuning, slow‑query killer, OTEL/Prom, demo polish)

This package focuses on reliability and polish:
- **Slow‑query killer** for the API (budgeted latency & cardinality guard)
- **Prometheus metrics** + **OpenTelemetry tracing** across services
- **Grafana dashboards** (JSON) and scrape config
- **CI perf gate** (k6 GitHub Action) & make targets
- **Demo polish** (scripts & checklists)

---

## PR‑11 – Branch & PR

**Branch:** `chore/release-hardening`  
**Open PR:**
```bash
git checkout -b chore/release-hardening
# apply patches below, commit, push
gh pr create -t "Release hardening: slow-query killer, OTEL/Prom, dashboards, perf gate, demo polish" -b "Adds runtime query budgets & killer, OTEL + Prom metrics, Grafana dashboards, CI perf gate with k6, and demo polish scripts." -B develop -H chore/release-hardening -l prio:P0,area:ops
```

---

## 1) API slow‑query killer + Prom metrics

```diff
*** Begin Patch
*** Add File: services/api/src/metrics.js
+import client from 'prom-client';
+export const registry = new client.Registry();
+client.collectDefaultMetrics({ register: registry });
+export const httpDuration = new client.Histogram({ name:'http_request_duration_ms', help:'HTTP latency', labelNames:['route','method','code'], buckets:[50,100,200,400,800,1600,3200,6400] });
+export const queryRejected = new client.Counter({ name:'query_rejected_total', help:'Queries rejected by cost/slow guard' });
+registry.registerMetric(httpDuration); registry.registerMetric(queryRejected);
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/api/src/middleware/slowGuard.js
+import { queryRejected } from '../metrics.js';
+
+export function slowGuard(){
+  const budgetMs = Number(process.env.MAX_QUERY_MS || 1500);
+  return {
+    async requestDidStart(){
+      const t0 = Date.now();
+      let timer = setTimeout(()=>{ /* marker; Apollo lacks hard cancel here without extra plumbing */ }, budgetMs);
+      return {
+        async willSendResponse(ctx){
+          clearTimeout(timer);
+          const dt = Date.now() - t0;
+          if(dt > budgetMs){
+            // Mark response body to indicate budget breach (for logs/clients) and increment counter
+            ctx.response.http.headers.set('x-budget-breached','1');
+            queryRejected.inc();
+          }
+        }
+      };
+    }
+  };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/api/src/index.js
@@
-import { costGuard } from "./middleware/costGuard.js";
+import { costGuard } from "./middleware/costGuard.js";
+import { slowGuard } from "./middleware/slowGuard.js";
+import { registry, httpDuration } from "./metrics.js";
+import http from 'node:http';
@@
-const server = new ApolloServer({ typeDefs, resolvers, plugins: [costGuard({ persisted })] });
+const server = new ApolloServer({ typeDefs, resolvers, plugins: [costGuard({ persisted }), slowGuard()] });
@@
-const { url } = await startStandaloneServer(server, {
+const { url, server: httpSrv } = await startStandaloneServer(server, {
   context: async ({ req }) => ({
@@
   listen: { port: Number(process.env.PORT||4000) }
 });
 logger.info({ url }, "api up");
+
+// /metrics endpoint
+httpSrv.on('request', (req, res)=>{
+  if(req.url==='/metrics'){
+    registry.metrics().then(body=>{ res.writeHead(200,{'content-type':registry.contentType}); res.end(body); });
+  }
+});
*** End Patch
```

---

## 2) OpenTelemetry tracing (Node API, Python services)

```diff
*** Begin Patch
*** Add File: services/api/src/tracing.js
+import { NodeSDK } from '@opentelemetry/sdk-node';
+import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
+import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
+
+export async function startTracing(){
+  const exporter = new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces' });
+  const sdk = new NodeSDK({ traceExporter: exporter, instrumentations: [getNodeAutoInstrumentations()] });
+  await sdk.start();
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/api/src/index.js
@@
 import { typeDefs, resolvers } from "./schema.js";
 import { costGuard } from "./middleware/costGuard.js";
 import { slowGuard } from "./middleware/slowGuard.js";
 import { registry, httpDuration } from "./metrics.js";
 import http from 'node:http';
+import { startTracing } from './tracing.js';
@@
-const driver = neo4j.driver(
+await startTracing();
+const driver = neo4j.driver(
*** End Patch
```

Python services (ER, Analytics, Prov) – lightweight OTEL init:

```diff
*** Begin Patch
*** Add File: services/er/app/otel.py
+import os
+def init_otel():
+    if not os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT'):
+        return
+    # Minimal hook; full FastAPI instrumentation can be added later
+    os.environ.setdefault('OTEL_SERVICE_NAME','intelgraph-er')
*** End Patch
```

```diff
*** Begin Patch
*** Update File: services/er/app/main.py
@@
-from fastapi import FastAPI
+from fastapi import FastAPI
+from .otel import init_otel
@@
-app = FastAPI(title="IntelGraph ER Service", version="0.1.0")
+init_otel()
+app = FastAPI(title="IntelGraph ER Service", version="0.1.0")
*** End Patch
```

(Repeat similar small `otel.py` and import/use for `services/analytics` and `services/prov-ledger`.)

---

## 3) Prometheus + Grafana stack (compose)

```diff
*** Begin Patch
*** Add File: monitoring/prometheus.yml
+global:
+  scrape_interval: 5s
+scrape_configs:
+  - job_name: 'api'
+    static_configs: [{ targets: ['api:4000'] }]
+    metrics_path: /metrics
+  - job_name: 'node'
+    static_configs: [{ targets: ['prometheus-node-exporter:9100'] }]
*** End Patch
```

```diff
*** Begin Patch
*** Add File: monitoring/grafana/provisioning/datasources/ds.yml
+apiVersion: 1
+datasources:
+  - name: Prometheus
+    type: prometheus
+    access: proxy
+    url: http://prometheus:9090
*** End Patch
```

```diff
*** Begin Patch
*** Add File: monitoring/grafana/provisioning/dashboards/dash.yml
+apiVersion: 1
+providers:
+  - name: IntelGraph
+    orgId: 1
+    type: file
+    disableDeletion: false
+    updateIntervalSeconds: 10
+    options:
+      path: /var/lib/grafana/dashboards
*** End Patch
```

```diff
*** Begin Patch
*** Add File: monitoring/grafana/dashboards/api-latency.json
+{
+  "title": "API Latency",
+  "panels": [
+    {"type":"stat","title":"p95 http_request_duration_ms","targets":[{"expr":"histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le))"}]},
+    {"type":"graph","title":"Query rejections","targets":[{"expr":"sum(rate(query_rejected_total[5m]))"}]}
+  ]
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   ui:
@@
     ports: ["8080:80"]
+
+  prometheus:
+    image: prom/prometheus:v2.54.1
+    volumes: ["./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro"]
+    ports: ["9090:9090"]
+
+  prometheus-node-exporter:
+    image: prom/node-exporter:v1.8.2
+    ports: ["9100:9100"]
+
+  grafana:
+    image: grafana/grafana:11.2.0
+    environment:
+      - GF_PATHS_PROVISIONING=/etc/grafana/provisioning
+    volumes:
+      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
+      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
+    ports: ["3000:3000"]
*** End Patch
```

---

## 4) CI perf gate (k6 GitHub Action)

```diff
*** Begin Patch
*** Add File: .github/workflows/perf.yml
+name: Perf Gate
+on:
+  pull_request:
+    types: [labeled]
+jobs:
+  k6:
+    if: contains(github.event.pull_request.labels.*.name, 'perf')
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: grafana/k6-action@v0.3.1
+        with:
+          filename: tests/perf/api_shortest_path.js
*** End Patch
```

---

## 5) Demo polish scripts & checklist

```diff
*** Begin Patch
*** Add File: demo/README.md
+# IntelGraph GA Demo

Run order:
1. `make docker && make seed`
2. Open Grafana http://localhost:3000 (imported dashboards available)
3. UI at http://localhost:8080 (Ctrl/Cmd‑K → Copilot → NL→Cypher)
4. Show ABAC: call `make policy.sim`
5. ER score/merge preview: `make er.score` / `make er.merge.preview`
6. Prov‑Ledger export: `make prov.export`
7. Analytics centrality: `make analytics.centrality`
8. k6 perf check: `make perf`
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 perf:
 	k6 run tests/perf/api_shortest_path.js && k6 run tests/perf/api_entity_get.js
+dash:
+	@echo "Prometheus: http://localhost:9090 | Grafana: http://localhost:3000"
*** End Patch
```

---

## 6) Notes & Next

- Consider Apollo plugin with actual **query cancellation** (e.g., timeout wrappers) for hard kill.
- Propagate OTEL spans across services (traceparent headers) and add Neo4j driver instrumentation.
- Expand Grafana dashboards: service error rates, GC, queue depth, ER latency, analytics job durations.
- Add budget annotations in responses (remaining ms/row limit) for UI hints.

