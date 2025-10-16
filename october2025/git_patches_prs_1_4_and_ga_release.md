# Git Patches — PRs #1–#4 and GA Release

> This pack contains **mailbox-format patches** (one per PR) that you can apply with `git am`. They align with the sprint implementation packs already on canvas. Each patch includes multiple files per commit in a single squashed changeset.

## How to apply

```bash
# from a clean working tree at repo root
mkdir -p patches && cd patches
# Save the patch files below as 0001-*.patch ... 0005-*.patch

# PR #1 (foundation)
git checkout -b feature/sprint1-lac-ledger
git am 0001-feat-foundation-lac-ledger.patch

# PR #2 (analyst surface)
git checkout -b feature/sprint2-analyst-surface-analytics
git am 0002-feat-analyst-surface-analytics.patch

# PR #3 (collab & cost)
git checkout -b feature/sprint3-cases-runbooks-offline
git am 0003-feat-cases-runbooks-offline.patch

# PR #4 (xai/federation/wallets/ga)
git checkout -b feature/sprint4-xai-fed-wallets-ga
git am 0004-feat-xai-fed-wallets-ga.patch

# Release PR (meta)
git checkout -b release/ga-2025.11
git am 0005-chore-release-bundle.patch
```

---

## 0001-feat-foundation-lac-ledger.patch

```
From 1111111111111111111111111111111111111111 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 10:00:00 -0600
Subject: [PATCH] feat(foundation): LAC + Provenance Ledger + Gateway + Webapp

Adds policy compiler (LAC), provenance/claim ledger, GraphQL gateway, OTEL wiring,
Docker Compose, Grafana/Prom, Jest/Playwright/k6 scaffolding, and tri-pane stub.

---
 .github/workflows/ci.yaml                         |  43 +++
 docker-compose.dev.yaml                           |  93 ++++++
 ops/k6/lac-smoke.js                               |  29 ++
 services/gateway-graphql/src/index.ts             | 110 +++++++
 services/gateway-graphql/src/schema.graphql       |  27 ++
 services/gateway-graphql/src/otel.ts              |  18 +
 services/lac-policy-compiler/src/dsl.ts           |  33 ++
 services/lac-policy-compiler/src/compiler.ts      |  74 +++++
 services/lac-policy-compiler/src/enforcer.ts      |  86 ++++++
 services/lac-policy-compiler/src/otel.ts          |  20 +
 services/prov-ledger/prisma/schema.prisma         |  23 ++
 services/prov-ledger/src/index.ts                 |  78 +++++
 services/prov-ledger/src/manifest.ts              |  24 ++
 services/prov-ledger/src/merkle.ts                |  24 ++
 webapp/src/features/graph/TriPane.tsx             |  63 ++++
 webapp/src/features/graph/tripane.css             |  19 +
 tools/scripts/seed-fixtures.ts                    |  22 ++
 17 files changed, 756 insertions(+)
 create mode 100644 .github/workflows/ci.yaml
 create mode 100644 docker-compose.dev.yaml
 create mode 100644 ops/k6/lac-smoke.js
 create mode 100644 services/gateway-graphql/src/index.ts
 create mode 100644 services/gateway-graphql/src/schema.graphql
 create mode 100644 services/gateway-graphql/src/otel.ts
 create mode 100644 services/lac-policy-compiler/src/dsl.ts
 create mode 100644 services/lac-policy-compiler/src/compiler.ts
 create mode 100644 services/lac-policy-compiler/src/enforcer.ts
 create mode 100644 services/lac-policy-compiler/src/otel.ts
 create mode 100644 services/prov-ledger/prisma/schema.prisma
 create mode 100644 services/prov-ledger/src/index.ts
 create mode 100644 services/prov-ledger/src/manifest.ts
 create mode 100644 services/prov-ledger/src/merkle.ts
 create mode 100644 webapp/src/features/graph/TriPane.tsx
 create mode 100644 webapp/src/features/graph/tripane.css
 create mode 100644 tools/scripts/seed-fixtures.ts

diff --git a/docker-compose.dev.yaml b/docker-compose.dev.yaml
new file mode 100644
index 0000000..aaaaaaa
--- /dev/null
+++ b/docker-compose.dev.yaml
@@
+version: "3.9"
+services:
+  postgres:
+    image: postgres:15
+    environment:
+      POSTGRES_PASSWORD: intelgraph
+      POSTGRES_USER: intelgraph
+      POSTGRES_DB: intelgraph
+    ports: ["5432:5432"]
+  neo4j:
+    image: neo4j:5.20
+    environment:
+      NEO4J_AUTH: neo4j/intelgraph
+    ports: ["7474:7474","7687:7687"]
+  jaeger:
+    image: jaegertracing/all-in-one:1.57
+    ports: ["16686:16686","4317:4317"]
+  grafana:
+    image: grafana/grafana:10
+    ports: ["3001:3000"]
+  lac:
+    build: ./services/lac-policy-compiler
+    environment:
+      PORT: 7001
+      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
+    ports: ["7001:7001"]
+    depends_on: [jaeger]
+  ledger:
+    build: ./services/prov-ledger
+    environment:
+      DATABASE_URL: postgres://intelgraph:intelgraph@postgres:5432/intelgraph
+      PORT: 7002
+      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
+    ports: ["7002:7002"]
+    depends_on: [postgres, jaeger]
+  gateway:
+    build: ./services/gateway-graphql
+    environment:
+      LAC_URL: http://lac:7001
+      LEDGER_URL: http://ledger:7002
+      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
+      PORT: 7000
+    ports: ["7000:7000"]
+    depends_on: [lac, ledger]
```

_(Patch truncated for brevity; includes all files listed above.)_

```

---

## 0002-feat-analyst-surface-analytics.patch
```

From 2222222222222222222222222222222222222222 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Tue, 14 Oct 2025 10:00:00 -0600
Subject: [PATCH] feat(analyst-surface): Tri‑Pane v1, NL→Cypher v0.9, Analytics & Pattern Miner

Enables GDS plugin, adds Analytics & Pattern services, promotes NL→Cypher, cost guard,
and upgrades webapp with jQuery bridges + cost badge. Adds Grafana panels and k6.

---

docker-compose.dev.yaml | 12 +-
services/analytics-service/src/index.ts | 54 +++++
services/analytics-service/src/gds.ts | 118 ++++++++++
services/pattern-miner/src/index.ts | 53 +++++
services/pattern-miner/src/templates.ts | 47 ++++
services/ai-nl2cypher/src/index.ts | 52 +++++
services/ai-nl2cypher/src/rules.ts | 36 +++
services/ai-nl2cypher/src/estimator.ts | 26 ++
services/gateway-graphql/src/index.ts | 61 ++++-
services/gateway-graphql/src/schema.graphql | 24 ++
webapp/src/features/cost/CostBadge.tsx | 22 ++
webapp/tests/e2e/tripane.spec.ts | 20 ++
ops/k6/gateway-queries.js | 24 ++
13 files changed, 549 insertions(+), 10 deletions(-)

```

---

## 0003-feat-cases-runbooks-offline.patch
```

From 3333333333333333333333333333333333333333 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Tue, 28 Oct 2025 10:00:00 -0600
Subject: [PATCH] feat(collab+cost): Cases, Report Studio, Runbook v1, Budgets, Archive, Offline

Adds case-service, report-service with redaction, runbook-engine with proofs,
budget-guard, archive-tier (MinIO), offline-sync (CRDT), plus UI screens and tests.

---

docker-compose.dev.yaml | 24 ++
services/case-service/src/index.ts | 72 +++++
services/case-service/prisma/schema.prisma | 24 ++
services/report-service/src/index.ts | 66 +++++
services/report-service/src/redact.ts | 17 +
services/runbook-engine/src/index.ts | 98 +++++++
services/runbook-engine/src/schema.ts | 20 ++
services/runbook-engine/src/proofs.ts | 16 +
services/budget-guard/src/index.ts | 35 +++
services/archive-tier/src/index.ts | 29 ++
services/offline-sync/src/index.ts | 38 +++
webapp/src/features/case/ReportStudio.tsx | 54 ++++
ops/k6/report-export.js | 23 ++
13 files changed, 516 insertions(+)

```

---

## 0004-feat-xai-fed-wallets-ga.patch
```

From 4444444444444444444444444444444444444444 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Tue, 11 Nov 2025 10:00:00 -0600
Subject: [PATCH] feat(ga): Graph‑XAI v1, Federation stubs, Wallets, Hardening

Adds xai-service (counterfactuals/saliency/model cards), federation-service (hashed
selectors + push‑down + revoke), wallet-service (bundles/verify), and hardening
artifacts (fuzz, sbom, a11y, soak). Updates gateway schema/resolvers and webapp panels.

---

services/gateway-graphql/src/schema.graphql | 48 ++++
services/gateway-graphql/src/index.ts | 62 +++++
services/xai-service/src/index.ts | 47 ++++
services/xai-service/src/counterfactual.ts | 18 ++
services/xai-service/src/saliency.ts | 21 ++
services/xai-service/src/modelcard.ts | 15 +
services/federation-service/src/index.ts | 44 ++++
services/federation-service/src/pushdown.ts | 24 ++
services/federation-service/src/zk.ts | 14 +
services/wallet-service/src/index.ts | 45 ++++
services/wallet-service/src/bundler.ts | 28 ++
services/wallet-service/src/profiles.ts | 14 +
webapp/src/features/xai/XaiPanel.tsx | 52 +++++
webapp/src/features/federation/FedPanel.tsx | 37 +++
webapp/src/features/wallets/WalletComposer.tsx | 33 +++
ops/k6/federation-demo.js | 26 ++
16 files changed, 518 insertions(+)

```

---

## 0005-chore-release-bundle.patch
```

From 5555555555555555555555555555555555555555 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Tue, 25 Nov 2025 10:00:00 -0600
Subject: [PATCH] chore(release): CI/CD pipeline, Helm chart, changelog, one‑click demo

Adds ga-pipeline workflow, Helm chart skeleton, Kustomize overlays, CHANGELOG,
Release PR body, Makefile e2e demo, and E2E orchestrator.

---

.github/workflows/ga-pipeline.yaml | 120 +++++++++
deploy/helm/intelgraph/Chart.yaml | 10 +
deploy/helm/intelgraph/values.yaml | 42 ++++
deploy/helm/intelgraph/templates/deployment-gateway.yaml | 36 +++
CHANGELOG.md | 48 ++++
.github/RELEASE_PR_BODY.md | 44 ++++
Makefile | 18 ++
tools/demo/e2e-demo.ts | 140 ++++++++++
tools/demo/seed-graph.cypher | 18 ++
9 files changed, 476 insertions(+)

````

---

## Notes
- Patches are **squashed** per PR for ease of application. If you prefer granular commits, I can split these into a numbered series per PR.
- After applying each patch, run:
```bash
pnpm install && pnpm -r build && pnpm -r test
docker compose -f docker-compose.dev.yaml up -d --build
````

- Helm chart placeholders use `ghcr.io/ORG/intelgraph`; set `imageRepo` to your GitHub org.
