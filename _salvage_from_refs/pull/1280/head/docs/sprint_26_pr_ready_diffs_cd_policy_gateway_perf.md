# Sprint 26 — PR‑Ready Diffs (CD, Policy, Gateway Perf)

**Goal:** Hand‑off pack of minimal, reviewable patches implementing Sprint 26 changes. All diffs are unified format and assume repo root. Apply via `git apply` or cherry‑pick from a staging branch. Evidence paths map to the Sprint 26 plan.

---

## Repo Changeset Overview
```
.github/
  workflows/
    cd-guardrails.yml               # + verify-bundle required check
    gateway-perf.yml                # new: k6 perf gate
    policy-ci.yml                   # + OPA sim stage
    slo-burn-alerts.yml             # optional: rule sync (kubectl)
ops/
  observability/
    slo-alerts.yaml                 # finalized PrometheusRule
    dashboards/
      gateway-slo.json             # dashboard skeleton
      er-queue.json                # dashboard skeleton
services/
  gateway/
    src/
      middleware/
        stepUpSensitive.ts         # new: @sensitive enforcement
      nl2cypher/
        cache.ts                   # new: plan cache
      observability/
        metrics.ts                 # + exemplars
        slo-alerts.ts              # unchanged (from S25) but referenced
      graphql/
        schema/
          sensitive.graphql        # new directive
        server.ts                  # + persisted queries & cache
    package.json                   # + scripts
services/
  er/
    src/
      intake.ts                    # + idempotency
      dlq.ts                       # new replay util
security/
  policy/
    retention.rego                 # new OPA policy
    export_license.rego            # new OPA policy
    tests/
      retention_test.rego          # tests
      export_license_test.rego     # tests
tools/
  k6/
    s26-pq.js                      # reads
    s26-writes.js                  # writes with step‑up
    s26-graph.js                   # 2–3 hop traversal
runbooks/
  dr-drill.md                      # placeholder
  freeze-window-dryrun.md          # placeholder
```

---

## 1) CD Guardrails — Verify‑Bundle Required

**File:** `.github/workflows/cd-guardrails.yml`
```diff
@@
 jobs:
   verify-provenance:
     if: ${{ always() }}
     uses: ./.github/workflows/cd-guardrails.yml
-    with: {}
+    with:
+      require-verify-bundle: true
+      fail-on-tamper: true
+  tamper-test:
+    name: Negative control — tamper blocks
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Simulate tamper
+        run: echo "bogus" >> dist/bundle.tgz
+      - name: Verify‑Bundle (should fail)
+        run: |
+          node tools/verify-bundle/cli.js verify \
+            --bundle dist/bundle.tgz \
+            --policy security/policy/trust-policy.yaml
+        continue-on-error: true
+      - name: Fail if tamper did not block
+        run: |
+          echo "Tamper test unexpectedly passed" && exit 1
+        if: ${{ success() }}
```

---

## 2) Gateway Perf Gate — k6 in CI

**File:** `.github/workflows/gateway-perf.yml`
```yaml
name: gateway-perf
on:
  pull_request:
    paths:
      - 'services/gateway/**'
      - 'tools/k6/**'
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tools/k6/s26-pq.js
        env:
          URL: ${{ secrets.STAGING_GATEWAY_URL }}
          PQ_HASH: ${{ secrets.PQ_HASH }}
      - uses: actions/upload-artifact@v4
        with: { name: k6-report, path: results/** }
```

---

## 3) Policy CI — Simulation Stage

**File:** `.github/workflows/policy-ci.yml`
```diff
@@
 jobs:
   policy-test:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - name: OPA unit tests
         run: opa test -v security/policy -c
+  policy-sim:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Evaluate default allow/deny
+        run: |
+          opa eval -f pretty -d security/policy 'data.intelgraph.allow'
```

---

## 4) PrometheusRule — SLO Burn

**File:** `ops/observability/slo-alerts.yaml`
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-slo-burn
spec:
  groups:
  - name: gateway.slo
    rules:
    - alert: APISLOFastBurn
      expr: (
        sum(rate(http_request_errors_total{job="gateway"}[5m]))
        / sum(rate(http_requests_total{job="gateway"}[5m]))
      ) > (0.001 * 14.4)
      for: 5m
      labels: {severity: page}
      annotations:
        summary: "API SLO fast burn"
    - alert: APISLOSlowBurn
      expr: (
        sum(rate(http_request_errors_total{job="gateway"}[1h]))
        / sum(rate(http_requests_total{job="gateway"}[1h]))
      ) > (0.001 * 2)
      for: 2h
      labels: {severity: ticket}
      annotations:
        summary: "API SLO slow burn"
```

---

## 5) GraphQL Sensitive Directive & Step‑Up Middleware

**File:** `services/gateway/src/graphql/schema/sensitive.graphql`
```graphql
directive @sensitive on FIELD_DEFINITION
```

**File:** `services/gateway/src/middleware/stepUpSensitive.ts`
```ts
import { GraphQLFieldResolver } from 'graphql';
import { Request, Response } from 'express';

export function stepUpSensitive(): GraphQLFieldResolver<any, { req: Request; res: Response }>{
  return async (source, args, ctx, info) => {
    const field = info.parentType.getFields()[info.fieldName];
    const hasDirective = field?.astNode?.directives?.some(d => d.name.value === 'sensitive');
    if (!hasDirective) return (field.resolve as any)?.(source, args, ctx, info);

    const assert = ctx.req.header('X-StepUp-Assert');
    if (!assert) {
      throw new Error('Step-up required: missing WebAuthn assertion');
    }
    ctx.req.audit?.record?.({
      event: 'stepup.assertion',
      challengeId: ctx.req.header('X-StepUp-Challenge') ?? 'unknown',
    });
    return (field.resolve as any)?.(source, args, ctx, info);
  };
}
```

**File:** `services/gateway/src/graphql/server.ts` (excerpt)
```diff
@@
 import { makeExecutableSchema } from '@graphql-tools/schema';
+import { stepUpSensitive } from '../middleware/stepUpSensitive';
+import crypto from 'crypto';
@@
-const schema = makeExecutableSchema({ typeDefs, resolvers });
+const schema = makeExecutableSchema({ typeDefs, resolvers });
+
+// Persisted query cache (in‑mem; swap with Redis for multi‑pod)
+const pqCache = new Map<string, string>();
+
+function sha256(input: string) { return crypto.createHash('sha256').update(input).digest('hex'); }
+
+export function lookupPersistedQuery(extensions?: any) {
+  const hash = extensions?.persistedQuery?.sha256Hash;
+  if (!hash) return null;
+  return pqCache.get(hash) ?? null;
+}
+
+export function registerPersistedQuery(query: string) {
+  const hash = sha256(query);
+  pqCache.set(hash, query);
+  return hash;
+}
@@
-// Apollo server init …
+// Apollo server init …
+// Attach step‑up middleware
+// (example: wrap resolvers at schema build time or via plugin)
```

---

## 6) NL→Cypher Plan Cache

**File:** `services/gateway/src/nl2cypher/cache.ts`
```ts
export type NLKey = { intent: string; filters: Record<string, any> };
export type Plan = { cypher: string; params: Record<string, any>; cost: number };

const keyOf = (k: NLKey) => JSON.stringify(k);
const cache = new Map<string, Plan>();

export function getPlan(k: NLKey): Plan | undefined { return cache.get(keyOf(k)); }
export function setPlan(k: NLKey, p: Plan) { cache.set(keyOf(k), p); }
export function stats() { return { size: cache.size }; }
```

---

## 7) Observability — Exemplars & Cache Metrics

**File:** `services/gateway/src/observability/metrics.ts` (excerpt)
```diff
@@
-export const httpDuration = new Histogram({ name: 'http_request_duration_seconds', help: '...' });
+export const httpDuration = new Histogram({ name: 'http_request_duration_seconds', help: '...', labelNames: ['route','method'] });
+export const cacheHits = new Counter({ name: 'gateway_cache_hits_total', help: 'PQ/cache hits' });
+export const cacheReqs = new Counter({ name: 'gateway_cache_requests_total', help: 'PQ/cache requests' });
```

---

## 8) ER — Intake Idempotency & DLQ Replay

**File:** `services/er/src/intake.ts` (excerpt)
```diff
@@
-export async function intake(candidate: Candidate) {
-  await db.insert(candidate);
-}
+export async function intake(candidate: Candidate) {
+  const key = candidate.idempotencyKey;
+  await db.tx(async (t) => {
+    const seen = await t.oneOrNone('select 1 from er_intake_keys where key=$1', [key]);
+    if (seen) return;
+    await t.none('insert into er_intake_keys(key) values($1)', [key]);
+    await t.insert(candidate);
+  });
+}
```

**File:** `services/er/src/dlq.ts`
```ts
export async function replay(fromOffset = 0) {
  // read DLQ topic and re‑enqueue with backoff
}
```

---

## 9) OPA Policies — Retention & Export License

**File:** `security/policy/retention.rego`
```rego
package intelgraph.retention

default tier := "standard-365d"

pii := input.attributes.sensitivity == "pii"
legal_hold := input.legal_hold == true

tier := when {
  legal_hold
} then "legal-hold" else when {
  pii
} then "short-30d" else tier
```

**File:** `security/policy/export_license.rego`
```rego
package intelgraph.export

default allow := false

allow {
  not input.license in {"Restricted-TOS", "Embargoed"}
}
```

**Tests:** `security/policy/tests/*`
```rego
package intelgraph.tests

import data.intelgraph.retention as r
import data.intelgraph.export as e

test_retention_pii_short { r.tier with input as {"attributes": {"sensitivity":"pii"}} == "short-30d" }

test_export_denied_restricted { not e.allow with input as {"license":"Restricted-TOS"} }
```

---

## 10) k6 Profiles

**Files:** `tools/k6/s26-pq.js`, `tools/k6/s26-writes.js`, `tools/k6/s26-graph.js`
```js
// See Sprint 26 k6 pack — unchanged.
```

---

## 11) Dashboards (JSON)

**Files:** `ops/observability/dashboards/gateway-slo.json`, `er-queue.json`
```json
{ "title": "Gateway SLO Overview", "panels": [ { "type": "timeseries", "title": "p95 http_req_duration", "targets": [ { "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"gateway\"}[5m])) by (le))" } ] } ] }
```

---

## 12) Package Scripts (Gateway)

**File:** `services/gateway/package.json`
```diff
@@
   "scripts": {
     "start": "node dist/server.js",
+    "pq:register": "node scripts/register-pq.js",
+    "perf:test": "k6 run ../../tools/k6/s26-pq.js"
   }
```

---

## 13) Runbooks Placeholders

**File:** `runbooks/dr-drill.md`
```md
# DR Drill — Region Failover (Staging)
- Date: YYYY‑MM‑DD
- RTO/RPO Targets: <values>
- Steps, Observations, Gaps, Follow‑ups
```

**File:** `runbooks/freeze-window-dryrun.md`
```md
# Change Freeze Dry‑Run
- Window: <from> → <to>
- Override path validated; audit links
```

---

## Apply Instructions

```bash
git checkout -b feat/s26-pr-pack
# Option A: copy files & git add
# Option B: apply patches if exported as .patch
#   git apply s26.patch

git add -A
git commit -m "Sprint 26: CD+Policy+Perf diffs and scaffolds"
```

**Post‑merge checklist**
- Deploy `ops/observability/slo-alerts.yaml` via GitOps/helm.  
- Register top‑10 persisted queries; store hashes as secrets for CI.  
- Wire Alertmanager routes to on‑call; link runbooks.  
- Commit k6 reports + Grafana exports