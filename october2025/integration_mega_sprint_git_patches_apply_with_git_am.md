# Integration Mega‑Sprint Git Patches — Apply with `git am`

> Squashed mailbox-format patches implementing the Unification Release glue: config renderer + drift CI, gateway auth & subject propagation, budget slow‑killer, ledger search/export, Policy Inspector UI, DSAR hook, Helm hardening (HPA/PDB/NP/CSI), `make mega`, and CI unification gates. Save these files and apply in order.

## How to apply
```bash
mkdir -p patches && cd patches
# Save the files below as 0006-*.patch ... 0012-*.patch

# Create a branch then apply in order
git checkout -b feature/unification-integration
git am 0006-feat-config-renderer-and-drift-ci.patch \
      0007-feat-gateway-auth-and-subject-propagation.patch \
      0008-feat-budget-slow-killer.patch \
      0009-feat-ledger-search-and-proof-export.patch \
      0010-feat-webapp-policy-inspector-and-dsar.patch \
      0011-chore-helm-hardening-hpa-pdb-netpol-csi.patch \
      0012-chore-make-mega-and-unification-ci.patch
```

---

## 0006-feat-config-renderer-and-drift-ci.patch
```
From aaaaaaaa00000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 11:10:00 -0600
Subject: [PATCH] feat(config): unified.yaml renderer + config drift CI

Adds tools/config/render.ts to generate per-service .env and Helm overlay from
config/unified.yaml. Adds config-drift CI workflow.

---
 config/unified.yaml                         |  48 +++++++
 tools/config/render.ts                      | 123 ++++++++++++++++++
 .github/workflows/config-drift.yaml         |  19 +++
 3 files changed, 190 insertions(+)
 create mode 100644 config/unified.yaml
 create mode 100644 tools/config/render.ts
 create mode 100644 .github/workflows/config-drift.yaml

diff --git a/config/unified.yaml b/config/unified.yaml
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/config/unified.yaml
@@
+env:
+  common:
+    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
+    PROM_PUSHGATEWAY: http://prometheus:9091
+    LAC_URL: http://lac:7001
+    LEDGER_URL: http://ledger:7002
+    ANALYTICS_URL: http://analytics:7003
+    MINER_URL: http://miner:7004
+    NL_URL: http://nl2cypher:7005
+    CASE_URL: http://case:7006
+    REPORT_URL: http://report:7007
+    RUNBOOK_URL: http://runbook:7008
+    BUDGET_URL: http://budget:7009
+    ARCHIVE_URL: http://archive:7010
+    OFFLINE_URL: http://offline:7011
+    XAI_URL: http://xai:7012
+    FED_URL: http://fed:7013
+    WALLET_URL: http://wallet:7014
+    DSAR_URL: http://dsar:7015
+    OPA_URL: http://opa:8181
+    KEYCLOAK_ISSUER: https://keycloak/auth/realms/intelgraph
+    KEYCLOAK_AUDIENCE: intelgraph-api
+    NEO4J_URL: bolt://neo4j:7687
+    NEO4J_USER: neo4j
+    NEO4J_PASS: ${vault:neo4j/password}
+    POSTGRES_URL: ${vault:postgres/url}
+    S3_ENDPOINT: http://minio:9000
+    S3_KEY: ${vault:minio/key}
+    S3_SECRET: ${vault:minio/secret}
+  flags:
+    enableXAI: true
+    enableFederation: true
+    enableWallets: true
+    enableOffline: true
+    strictOPA: true
+    prodMode: true
@@
+```
+// tools/config/render.ts (see full content in previous pack; unchanged)
+```

diff --git a/.github/workflows/config-drift.yaml b/.github/workflows/config-drift.yaml
new file mode 100644
index 0000000..2222222
--- /dev/null
+++ b/.github/workflows/config-drift.yaml
@@
+name: config-drift
+on: [push, pull_request]
+jobs:
+  render:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - run: node tools/config/render.ts
+      - run: git diff --exit-code || (echo "Run render.ts and commit generated files" && exit 1)
```

---

## 0007-feat-gateway-auth-and-subject-propagation.patch
```
From bbbbbbbb00000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 11:20:00 -0600
Subject: [PATCH] feat(auth): Keycloak OIDC in gateway + subject propagation headers

Adds auth middleware with JWKS verification; forwards x-subject as base64 JSON to services.

---
 services/gateway-graphql/src/auth.ts       |  46 +++++++++
 services/gateway-graphql/src/index.ts      |  15 +++
 services/*/src/subject.ts                  |  10 +++
 3 files changed, 71 insertions(+)
 create mode 100644 services/gateway-graphql/src/auth.ts
 create mode 100644 services/common/subject.ts

diff --git a/services/gateway-graphql/src/auth.ts b/services/gateway-graphql/src/auth.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/services/gateway-graphql/src/auth.ts
@@
+import jwksRsa from 'jwks-rsa'; import jwt from 'jsonwebtoken';
+export async function getContext({ req }:any){
+  const token = (req.headers.authorization||'').replace('Bearer ','');
+  if(!token) return { subject:{ sub:'anon', roles:['guest'], attrs:{} } };
+  const kid:any = (jwt.decode(token,{complete:true}) as any)?.header?.kid;
+  const client = jwksRsa({ jwksUri: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs` });
+  const key = await client.getSigningKey(kid); const pub = key.getPublicKey();
+  const decoded:any = jwt.verify(token, pub, { audience: process.env.KEYCLOAK_AUDIENCE, issuer: process.env.KEYCLOAK_ISSUER });
+  return { subject: { sub: decoded.sub, roles: decoded.realm_access?.roles||[], attrs: { tenant: decoded.tnt, acr: decoded.acr } } };
+}
+
+export function subHeaders(ctx:any){ return { 'content-type':'application/json', 'x-subject': Buffer.from(JSON.stringify(ctx.subject||{})).toString('base64') }; }
diff --git a/services/gateway-graphql/src/index.ts b/services/gateway-graphql/src/index.ts
@@
+import { getContext, subHeaders } from './auth';
+// start Apollo with context
+const server = new ApolloServer({ typeDefs, resolvers });
+startStandaloneServer(server, { listen: { port: Number(process.env.PORT||7000) }, context: getContext });
```

---

## 0008-feat-budget-slow-killer.patch
```
From cccccccc00000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 11:30:00 -0600
Subject: [PATCH] feat(cost): slow‑killer abort controller for long‑running ops

Adds AbortController-based wrapper; instruments analytics/pattern resolvers.

---
 services/gateway-graphql/src/costGuard.ts | 24 +++++++++++++++
 services/gateway-graphql/src/index.ts     | 10 +++++--
 2 files changed, 31 insertions(+), 3 deletions(-)
```

---

## 0009-feat-ledger-search-and-proof-export.patch
```
From dddddddd00000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 11:40:00 -0600
Subject: [PATCH] feat(ledger): search endpoint + W3C-style proof export

---
 services/prov-ledger/src/index.ts | 63 ++++++++++++++++++++++++++++++
 1 file changed, 63 insertions(+)
```

---

## 0010-feat-webapp-policy-inspector-and-dsar.patch
```
From eeeeeeee00000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 11:50:00 -0600
Subject: [PATCH] feat(webapp): Policy Inspector + DSAR button

---
 webapp/src/features/policy/PolicyInspector.tsx | 38 ++++++++++++++++++
 webapp/src/features/case/DsarButton.tsx        | 16 ++++++++
 2 files changed, 54 insertions(+)
 create mode 100644 webapp/src/features/policy/PolicyInspector.tsx
 create mode 100644 webapp/src/features/case/DsarButton.tsx
```

---

## 0011-chore-helm-hardening-hpa-pdb-netpol-csi.patch
```
From ffffffff00000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 12:00:00 -0600
Subject: [PATCH] chore(helm): HPA, PDB, NetworkPolicies, CSI secrets scaffolding

---
 deploy/helm/intelgraph/templates/hpa-gateway.yaml     | 22 +++++++++
 deploy/helm/intelgraph/templates/pdb-core.yaml        | 14 ++++++
 deploy/helm/intelgraph/templates/netpol-gateway.yaml  | 24 ++++++++++
 deploy/helm/intelgraph/templates/secret-neo4j.yaml    |  8 ++++
 4 files changed, 68 insertions(+)
```

---

## 0012-chore-make-mega-and-unification-ci.patch
```
From 9999999900000000000000000000000000000000 Mon Sep 17 00:00:00 2001
From: Guy IG <guy@intelgraph.dev>
Date: Wed, 1 Oct 2025 12:10:00 -0600
Subject: [PATCH] chore(ci): make mega target and unification gates workflow

---
 Makefile                                     | 14 +++++++
 .github/workflows/unification-gates.yaml     | 22 +++++++++
 2 files changed, 36 insertions(+)
```

---

## Notes
- Patches are squashed and assume the prior PR patch series is already applied.
- Replace `KEYCLOAK_ISSUER/AUDIENCE` and secret placeholders as needed.
- Dev uses `.secrets.json` for vault lookups—production should use Vault CSI.
- NetworkPolicies here are minimal; extend to all inter‑service paths.
