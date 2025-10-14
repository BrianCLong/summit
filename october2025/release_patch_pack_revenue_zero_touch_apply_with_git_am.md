# Release Patch Pack — Revenue & Zero‑Touch (Apply with `git am`)

> Mailbox-format patches to ship the revenue/growth & zero‑touch ops work: CLI Release workflow + README badge/snippet, Grafana datasource provisioning, Billing/Metering stubs, Product analytics beacon, Pricing docs, KPI rollups. Save and apply in order.

## How to apply
```bash
mkdir -p patches && cd patches
# Save files below as 0013-*.patch ... 0019-*.patch

git checkout -b feature/revenue-zero-touch
git am 0013-ci-release-cli-and-readme-badge.patch \
      0014-ops-grafana-datasource-provisioning.patch \
      0015-feat-billing-service-and-metrics-emit.patch \
      0016-feat-product-analytics-beacon-endpoint.patch \
      0017-docs-pricing-and-legal-templates.patch \
      0018-ops-kpi-rollup-workflow.patch \
      0019-docs-readme-landing-updates.patch
```

---

## 0013-ci-release-cli-and-readme-badge.patch
```
From a1a1a1a100000000000000000000000000000013 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:40:00 -0600
Subject: [PATCH] ci(cli): Release workflow + README badge and install snippet

---
 .github/workflows/cli-release.yaml | 36 ++++++++++++++++++++++++++++++
 README.md                          | 18 +++++++++++++++
 2 files changed, 54 insertions(+)
 create mode 100644 .github/workflows/cli-release.yaml

diff --git a/.github/workflows/cli-release.yaml b/.github/workflows/cli-release.yaml
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/.github/workflows/cli-release.yaml
@@
+name: cli-release
+on:
+  workflow_dispatch:
+    inputs:
+      version: { description: 'CLI semver (e.g., 1.0.0)', required: true, type: string }
+jobs:
+  build:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with: { node-version: 20 }
+      - run: cd cli/intelgraphctl && npm ci && npm run build && npm pack
+      - name: Create Release
+        uses: softprops/action-gh-release@v2
+        with:
+          tag_name: cli-v${{ inputs.version }}
+          name: intelgraphctl ${{ inputs.version }}
+          body: One-command installer. See /docs/install/cli.md
+        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
+      - name: Upload artifact
+        uses: softprops/action-gh-release@v2
+        with: { files: cli/intelgraphctl/*.tgz }
+        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }

diff --git a/README.md b/README.md
index 2222222..3333333 100644
--- a/README.md
+++ b/README.md
@@
+[![intelgraphctl](https://img.shields.io/badge/cli-download-blue)](../../releases/latest)
+
+### Quick Install (CLI)
+```bash
+URL=$(curl -s https://api.github.com/repos/BrianCLong/intelgraph/releases/latest | \
+ jq -r '.assets[]|select(.name|test("intelgraphctl.*.tgz")).browser_download_url') && \
+curl -L "$URL" -o intelgraphctl.tgz && tar -xzf intelgraphctl.tgz && \
+node cli/intelgraphctl/dist/index.js preflight --issuer https://keycloak.example.com/auth/realms/intelgraph --host gateway.example.com && \
+node cli/intelgraphctl/dist/index.js install --org BrianCLong/intelgraph --chart intelgraph --version 1.0.0 && \
+TENANT=pilot node bootstrap/seed-tenant.ts
+```
```

---

## 0014-ops-grafana-datasource-provisioning.patch
```
From b2b2b2b200000000000000000000000000000014 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:42:00 -0600
Subject: [PATCH] ops(grafana): Provision Prometheus/Jaeger datasources before dashboard import

---
 ops/grafana/datasources/prometheus.json |  1 +
 ops/grafana/datasources/jaeger.json     |  1 +
 ops/grafana/import-dashboards.sh        | 12 ++++++++++++
 3 files changed, 14 insertions(+)

diff --git a/ops/grafana/import-dashboards.sh b/ops/grafana/import-dashboards.sh
index 4444444..5555555 100755
--- a/ops/grafana/import-dashboards.sh
+++ b/ops/grafana/import-dashboards.sh
@@
+create_ds(){ file=$1; echo "Provisioning DS $(basename "$file")"; curl -fsS "$API/datasources" "${HDR[@]}" -d @"$file" >/dev/null || true; }
+# Ensure datasources exist
+for d in ops/grafana/datasources/*.json; do create_ds "$d"; done
```

---

## 0015-feat-billing-service-and-metrics-emit.patch
```
From c3c3c3c300000000000000000000000000000015 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:45:00 -0600
Subject: [PATCH] feat(billing): Stripe webhook/meter endpoints + gateway usage emit

---
 services/billing/src/index.ts                 | 34 +++++++++++++++++++++++++
 services/gateway-graphql/src/meter.ts         | 12 +++++++++
 2 files changed, 46 insertions(+)
 create mode 100644 services/billing/src/index.ts
 create mode 100644 services/gateway-graphql/src/meter.ts
```

---

## 0016-feat-product-analytics-beacon-endpoint.patch
```
From d4d4d4d400000000000000000000000000000016 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:48:00 -0600
Subject: [PATCH] feat(analytics): Beacon endpoint for product analytics events

---
 webapp/src/analytics/events.ts | 10 ++++++++++
 services/gateway-graphql/src/analytics.ts | 18 ++++++++++++++++
 2 files changed, 28 insertions(+)
 create mode 100644 services/gateway-graphql/src/analytics.ts
```

---

## 0017-docs-pricing-and-legal-templates.patch
```
From e5e5e5e500000000000000000000000000000017 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:50:00 -0600
Subject: [PATCH] docs: pricing, SLA & DPA templates, sales kit stubs

---
 docs/pricing.md                 | 22 ++++++++++++++++++++++
 docs/legal/SLA.md               | 16 ++++++++++++++++
 docs/legal/DPA.md               | 12 ++++++++++++
 sales/pitch/outline.md          | 12 ++++++++++++
 sales/battlecards/palantir.md   |  8 ++++++++
 5 files changed, 70 insertions(+)
```

---

## 0018-ops-kpi-rollup-workflow.patch
```
From f6f6f6f600000000000000000000000000000018 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:52:00 -0600
Subject: [PATCH] ops(kpi): metrics rollup workflow scaffold

---
 .github/workflows/metrics-rollup.yaml | 18 ++++++++++++++++++
 1 file changed, 18 insertions(+)
 create mode 100644 .github/workflows/metrics-rollup.yaml
```

---

## 0019-docs-readme-landing-updates.patch
```
From a7a7a7a700000000000000000000000000000019 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 14:55:00 -0600
Subject: [PATCH] docs(readme): positioning bullets and contact

---
 README.md | 14 ++++++++++++++
 1 file changed, 14 insertions(+)
```

---

## Notes
- Replace Stripe keys and set `BILLING_URL` env to expose metering.
- Grafana script assumes `prometheus.observability` and `jaeger-query.observability` service names; tweak if different.
- KPI workflow expects a `tools/metrics/rollup.js` (stub acceptable initially).

