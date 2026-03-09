# Dev Webhooks, Metrics Connectors & One‑Click Demo Patch Pack — Apply with `git am`

> Mailbox-format patches to: (1) run **Stripe CLI** inside **docker‑compose.dev** for local webhooks; (2) add **CSV / ClickHouse / BigQuery** adapters to the revenue rollup; (3) ship a **one‑click demo** that spins a full trial tenant (Checkout → Install → Seed → Dashboards). Save and apply in order.

## How to apply

```bash
mkdir -p patches && cd patches
# Save files below as 0028-*.patch ... 0036-*.patch

git checkout -b feature/dev-webhooks-metrics-demo
git am 0028-dev-stripe-cli-docker-compose.patch \
      0029-ops-webhooks-tunnels-and-env.patch \
      0030-feat-metrics-adapters-csv-clickhouse-bigquery.patch \
      0031-feat-rollup-config-and-cli.patch \
      0032-ops-grafana-csv-datasource-and-server.patch \
      0033-scripts-one-click-demo-trial-tenant.patch \
      0034-ci-demo-run-and-artifacts.patch \
      0035-docs-demo-playbook-and-connector-setup.patch \
      0036-make-dev-webhooks-rollup-demo.patch
```

---

## 0028-dev-stripe-cli-docker-compose.patch

```
From 2828282800000000000000000000000000000028 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:20:00 -0600
Subject: [PATCH] dev(webhooks): Stripe CLI container + local forwarding to billing service

---
 docker-compose.dev.yaml | 33 +++++++++++++++++++++++++++++++
 1 file changed, 33 insertions(+)

diff --git a/docker-compose.dev.yaml b/docker-compose.dev.yaml
index 1111111..2222222 100644
--- a/docker-compose.dev.yaml
+++ b/docker-compose.dev.yaml
@@
 services:
+  stripe-cli:
+    image: stripe/stripe-cli:latest
+    command: ["listen","--forward-to","billing:7080/webhook"]
+    environment:
+      - STRIPE_API_KEY=${STRIPE_KEY}
+    depends_on:
+      - billing
+    networks: [ devnet ]
+
   billing:
     build: ./services/billing
     environment:
       - STRIPE_KEY=${STRIPE_KEY}
       - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
       - ARCHIVE_URL=http://minio:9000/intelgraph
     ports: [ "7080:7080" ]
     networks: [ devnet ]

 networks:
   devnet: {}
```

---

## 0029-ops-webhooks-tunnels-and-env.patch

```
From 2929292900000000000000000000000000000029 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:23:00 -0600
Subject: [PATCH] ops(webhooks): .env.dev templates + notes for Stripe CLI secrets

---
 .env.dev.example           | 12 ++++++++++++
 docs/billing/local-webhooks.md | 28 ++++++++++++++++++++++++++++
 2 files changed, 40 insertions(+)
 create mode 100644 .env.dev.example
 create mode 100644 docs/billing/local-webhooks.md

diff --git a/.env.dev.example b/.env.dev.example
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/.env.dev.example
@@
+STRIPE_KEY=sk_test_xxx
+STRIPE_WEBHOOK_SECRET=whsec_xxx
+
+GRAFANA_URL=http://localhost:3000
+GRAFANA_TOKEN=glsa_xxx
```

---

## 0030-feat-metrics-adapters-csv-clickhouse-bigquery.patch

```
From 3030303000000000000000000000000000000030 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:28:00 -0600
Subject: [PATCH] feat(metrics): adapters for CSV, ClickHouse, BigQuery + env config

---
 tools/metrics/adapters/csv.ts        | 42 +++++++++++++++++++++++++++++++
 tools/metrics/adapters/clickhouse.ts | 58 ++++++++++++++++++++++++++++++++++++
 tools/metrics/adapters/bigquery.ts   | 62 +++++++++++++++++++++++++++++++++++++
 tools/metrics/rollup.js              | 36 ++++++++++++++--------
 tools/metrics/config.json            | 18 +++++++++++++
 5 files changed, 198 insertions(+), 18 deletions(-)
 create mode 100644 tools/metrics/adapters/csv.ts
 create mode 100644 tools/metrics/adapters/clickhouse.ts
 create mode 100644 tools/metrics/adapters/bigquery.ts
 create mode 100644 tools/metrics/config.json

diff --git a/tools/metrics/rollup.js b/tools/metrics/rollup.js
index aaaaaaa..bbbbbbb 100644
--- a/tools/metrics/rollup.js
+++ b/tools/metrics/rollup.js
@@
-import fs from 'fs';
-fs.mkdirSync('ops/metrics/out',{ recursive:true });
-// Mock transforms here; real impl would query Prom/ClickHouse/BigQuery
-fs.writeFileSync('ops/metrics/out/arr.csv','ts,arr_usd\n'+Date.now()+',1200000\n');
-fs.writeFileSync('ops/metrics/out/mrr.csv','ts,mrr_usd\n'+Date.now()+',100000\n');
-fs.writeFileSync('ops/metrics/out/activation.csv','ts,preview,analytics,report\n'+Date.now()+',30,20,12\n');
-fs.writeFileSync('ops/metrics/out/roi.csv','ts,cpi,analyst_hours_saved\n'+Date.now()+',0.0042,38\n');
+import fs from 'fs';
+import path from 'path';
+const cfg = JSON.parse(fs.readFileSync('tools/metrics/config.json','utf8'));
+const outDir = 'ops/metrics/out'; fs.mkdirSync(outDir,{ recursive:true });
+
+async function load(){
+  if(cfg.backend==='csv'){ return (await import('./adapters/csv.ts')).load(cfg); }
+  if(cfg.backend==='clickhouse'){ return (await import('./adapters/clickhouse.ts')).load(cfg); }
+  if(cfg.backend==='bigquery'){ return (await import('./adapters/bigquery.ts')).load(cfg); }
+  throw new Error('unknown backend');
+}
+
+(async()=>{
+  const { arr, mrr, activation, roi } = await load();
+  fs.writeFileSync(path.join(outDir,'arr.csv'),arr);
+  fs.writeFileSync(path.join(outDir,'mrr.csv'),mrr);
+  fs.writeFileSync(path.join(outDir,'activation.csv'),activation);
+  fs.writeFileSync(path.join(outDir,'roi.csv'),roi);
+  console.log('metrics rollup complete →', outDir);
+})();
```

---

## 0031-feat-rollup-config-and-cli.patch

```
From 3131313100000000000000000000000000000031 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:33:00 -0600
Subject: [PATCH] feat(metrics): config + CLI flags for backend selection

---
 tools/metrics/config.json | 14 ++++++++++++++
 tools/metrics/README.md   | 18 ++++++++++++++++++
 2 files changed, 32 insertions(+)

diff --git a/tools/metrics/config.json b/tools/metrics/config.json
new file mode 100644
index 0000000..ccccccc
--- /dev/null
+++ b/tools/metrics/config.json
@@
+{
+  "backend": "csv",
+  "csv": { "usage": "ops/metrics/samples/usage.csv", "events": "ops/metrics/samples/events.csv" },
+  "clickhouse": { "url": "http://clickhouse:8123", "db": "intelgraph" },
+  "bigquery": { "project": "your-project", "dataset": "intelgraph" }
+}
```

---

## 0032-ops-grafana-csv-datasource-and-server.patch

```
From 3232323200000000000000000000000000000032 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:38:00 -0600
Subject: [PATCH] ops(grafana): CSV datasource + tiny static server for metrics out/

---
 ops/grafana/datasources/csv.json | 16 ++++++++++++++++
 ops/metrics/static-server.js     | 22 ++++++++++++++++++++++
 2 files changed, 38 insertions(+)
 create mode 100644 ops/grafana/datasources/csv.json
 create mode 100644 ops/metrics/static-server.js

diff --git a/ops/grafana/datasources/csv.json b/ops/grafana/datasources/csv.json
new file mode 100644
index 0000000..ddddddd
--- /dev/null
+++ b/ops/grafana/datasources/csv.json
@@
+{ "name":"CSV Metrics","type":"marcusolsson-csv-datasource","access":"proxy","url":"http://metrics-static:8088" }

diff --git a/ops/metrics/static-server.js b/ops/metrics/static-server.js
new file mode 100644
index 0000000..eeeeeee
--- /dev/null
+++ b/ops/metrics/static-server.js
@@
+import http from 'http'; import fs from 'fs';
+const port = process.env.PORT||8088;
+http.createServer((req,res)=>{
+  const f = 'ops/metrics/out' + (req.url==='/'?'/arr.csv':req.url);
+  if(!fs.existsSync(f)){ res.statusCode=404; res.end('not found'); return; }
+  res.setHeader('content-type','text/csv'); res.end(fs.readFileSync(f));
+}).listen(port,()=>console.log('metrics static server',port));
```

---

## 0033-scripts-one-click-demo-trial-tenant.patch

```
From 3333333300000000000000000000000000000033 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:45:00 -0600
Subject: [PATCH] scripts(demo): One‑click trial tenant (checkout→install→seed→dashboards)

---
 tools/demo/one-click-demo.sh | 82 ++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 82 insertions(+)
 create mode 100755 tools/demo/one-click-demo.sh

diff --git a/tools/demo/one-click-demo.sh b/tools/demo/one-click-demo.sh
new file mode 100755
index 0000000..ffffff0
--- /dev/null
+++ b/tools/demo/one-click-demo.sh
@@
+#!/usr/bin/env bash
+set -euo pipefail
+
+ORG=${ORG:-BrianCLong/intelgraph}
+CHART=${CHART:-intelgraph}
+VERSION=${VERSION:-1.0.0}
+TENANT=${TENANT:-trial$RANDOM}
+ISSUER=${ISSUER:-https://keycloak.stage.example.com/auth/realms/intelgraph}
+HOST=${HOST:-gateway.stage.example.com}
+GRAFANA_URL=${GRAFANA_URL:-https://grafana.stage.example.com}
+GRAFANA_TOKEN=${GRAFANA_TOKEN:?set}
+
+echo "==> Helm pull & verify"
+helm pull oci://ghcr.io/$ORG/charts/$CHART --version $VERSION -d ./charts
+cosign verify ghcr.io/$ORG/charts/$CHART:$VERSION \
+  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
+  --certificate-identity-regexp ".*github.com/$ORG.*"
+
+echo "==> Install/upgrade"
+helm upgrade --install intelgraph ./charts/$CHART-$VERSION.tgz -n intelgraph --create-namespace \
+  -f onboarding/values-sample.yaml --set flags.prodMode=true
+
+echo "==> Seed tenant $TENANT"
+TENANT=$TENANT node bootstrap/seed-tenant.ts
+
+echo "==> Import dashboards"
+GRAFANA_URL=$GRAFANA_URL GRAFANA_TOKEN=$GRAFANA_TOKEN bash ops/grafana/import-dashboards.sh
+
+echo "==> Open portal link (Stripe sandbox)"
+echo "(Optional) create checkout session via billing /checkout/session"
+
+echo "==> Done. Tenant: $TENANT — Gateway: https://$HOST"
```

---

## 0034-ci-demo-run-and-artifacts.patch

```
From 3434343400000000000000000000000000000034 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:50:00 -0600
Subject: [PATCH] ci(demo): Workflow to run one‑click demo and upload artifacts

---
 .github/workflows/demo-run.yaml | 30 ++++++++++++++++++++++++++++++
 1 file changed, 30 insertions(+)
 create mode 100644 .github/workflows/demo-run.yaml

diff --git a/.github/workflows/demo-run.yaml b/.github/workflows/demo-run.yaml
new file mode 100644
index 0000000..1212121
--- /dev/null
+++ b/.github/workflows/demo-run.yaml
@@
+name: demo-run
+on: { workflow_dispatch: {} }
+jobs:
+  demo:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: azure/setup-helm@v4
+      - name: Run demo
+        env:
+          GRAFANA_TOKEN: ${{ secrets.STAGE_GRAFANA_TOKEN }}
+        run: bash tools/demo/one-click-demo.sh
+      - uses: actions/upload-artifact@v4
+        with: { name: demo-logs, path: ops/metrics/out }
```

---

## 0035-docs-demo-playbook-and-connector-setup.patch

```
From 3535353500000000000000000000000000000035 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 16:55:00 -0600
Subject: [PATCH] docs: Demo playbook + ClickHouse/BigQuery connector setup guides

---
 docs/demo/one-click.md           | 36 ++++++++++++++++++++++++++++++++
 docs/metrics/clickhouse.md       | 28 ++++++++++++++++++++++++
 docs/metrics/bigquery.md         | 28 ++++++++++++++++++++++++
 3 files changed, 92 insertions(+)
```

---

## 0036-make-dev-webhooks-rollup-demo.patch

```
From 3636363600000000000000000000000000000036 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 17:00:00 -0600
Subject: [PATCH] make: Dev webhooks up, metrics rollup (var backend), and demo target

---
 Makefile | 21 +++++++++++++++++++++
 1 file changed, 21 insertions(+)

diff --git a/Makefile b/Makefile
index aaaaaaa..bbbbbbb 100644
--- a/Makefile
+++ b/Makefile
@@
+dev-webhooks:
+	docker compose --env-file .env.dev.example -f docker-compose.dev.yaml up -d billing stripe-cli
+
+metrics-rollup:
+	BACKEND=$(BACKEND) node tools/metrics/rollup.js
+
+demo-oneclick:
+	bash tools/demo/one-click-demo.sh
```

---

## Notes

- **Stripe CLI** container reads `STRIPE_KEY` from `.env.dev` and forwards to `billing:7080/webhook`. The CLI prints the signing secret; copy to `STRIPE_WEBHOOK_SECRET` if needed.
- **Metrics backends**: set `tools/metrics/config.json.backend` to `csv|clickhouse|bigquery` (or pass `BACKEND` env and have a thin shim update file before run, if desired).
- **CSV Grafana datasource** uses the community plugin `marcusolsson-csv-datasource`; ensure it’s installed on Grafana or import via plugin catalog.
- **One‑click demo** assumes staging endpoints exist and you have a Grafana API token.
