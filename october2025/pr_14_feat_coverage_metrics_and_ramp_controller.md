# PR14 Package — `feat/coverage-metrics-and-ramp-controller` + Sprint K Plan

Surfaces **coverage as live Prometheus metrics** and adds an automated **Ramp Controller** that increases/decreases tenant flag percentages when SLOs are green/red. Includes a scheduled CI workflow to run controller and auto‑commit updated flag specs.

---

## 1) Branch name

```
feat/coverage-metrics-and-ramp-controller
```

## 2) Commit messages (granular or squash)

- feat(metrics): expose/update per‑tenant coverage gauge in API; admin endpoint to push coverage
- feat(ramp): ramp controller (reads coverage & SLO health, updates flags spec JSON/Redis)
- ci(ramp): nightly workflow runs controller and commits updated `flags.json` (dev) or writes Redis spec
- docs: ramp policy, guardrails, and rollback

_Squash alt:_ **feat: coverage metrics + automated ramp controller with CI**

---

## 3) Single patch (.patch) — apply from repo root

> Usage:
>
> ```bash
> git checkout -b feat/coverage-metrics-and-ramp-controller
> git apply --index PR-feat-coverage-metrics-and-ramp-controller.patch
> git commit -m "feat: coverage metrics + automated ramp controller with CI"
> ```

### `PR-feat-coverage-metrics-and-ramp-controller.patch`

```diff
diff --git a/services/api/src/lib/metrics.ts b/services/api/src/lib/metrics.ts
index 11aa22b..33bb44c 100644
--- a/services/api/src/lib/metrics.ts
+++ b/services/api/src/lib/metrics.ts
@@
 import client from 'prom-client';
@@
 export const coverage = new client.Gauge({ name: 'attest_coverage_pct', help: 'Attestation coverage %', labelNames: ['tenant'] });
@@
 export default { registry, coverage, anchorLatency, divergence, rampPct, metricsMiddleware };
diff --git a/services/api/src/routes/admin.ts b/services/api/src/routes/admin.ts
new file mode 100644
index 0000000..aa11bb2
--- /dev/null
+++ b/services/api/src/routes/admin.ts
@@
+import { Router } from 'express';
+import { coverage, rampPct } from '../lib/metrics';
+
+const router = Router();
+
+// Update coverage metric for a tenant (used by coverage reporter or ops)
+router.post('/admin/coverage', (req, res) => {
+  const { tenant, pct } = req.body || {};
+  if (!tenant || typeof pct !== 'number') return res.status(400).json({ error: 'tenant,pct required' });
+  coverage.labels(String(tenant)).set(pct);
+  return res.json({ ok: true });
+});
+
+// Update ramp shown metric (optional: reflect current spec)
+router.post('/admin/ramp', (req, res) => {
+  const { tenant, feature, pct } = req.body || {};
+  if (!tenant || !feature || typeof pct !== 'number') return res.status(400).json({ error: 'tenant,feature,pct required' });
+  rampPct.labels(String(tenant), String(feature)).set(pct);
+  return res.json({ ok: true });
+});
+
+export default router;
diff --git a/services/api/src/app.ts b/services/api/src/app.ts
index 90ccafb..8cdd1aa 100644
--- a/services/api/src/app.ts
+++ b/services/api/src/app.ts
@@
 import exportRouter from './routes/export';
+import adminRouter from './routes/admin';
@@
 app.get('/metrics', metricsMiddleware);
 app.use(exportRouter);
+app.use(adminRouter);

diff --git a/infra/ramp/ramp_controller.py b/infra/ramp/ramp_controller.py
new file mode 100755
index 0000000..77a88f9
--- /dev/null
+++ b/infra/ramp/ramp_controller.py
@@
+#!/usr/bin/env python3
+"""Ramp Controller: adjusts tenant feature ramp percentages based on coverage & SLO health.
+
+Inputs (env or files):
+  - FLAGS_PROVIDER: json|redis
+  - FLAGS_JSON_PATH: path to flags.json (json mode)
+  - FLAGS_REDIS_URL: redis url (redis mode)
+  - TARGET_COVERAGE: minimum % to consider healthy (default 95)
+  - STEP_UP: pct points to increase when healthy (default 10)
+  - STEP_DOWN: pct points to decrease on red (default 10)
+  - MIN_PCT / MAX_PCT: bounds (default 0/100)
+  - SLO_HEALTH_JSON: path to a file with {anchor_p95_ms:int, divergence:int, alerts:[]}
+
+Behavior:
+  - If SLOs green and coverage >= TARGET_COVERAGE → increase receipts/attest pct by STEP_UP (capped)
+  - If any critical alert or divergence>0 → decrease by STEP_DOWN (floored)
+Writes back updated spec (json or redis). Also prints a summary JSON for CI to capture.
+"""
+import os, json, sys
+from typing import Dict, Any
+
+def load_spec() -> Dict[str, Any]:
+  prov = os.getenv('FLAGS_PROVIDER','json').lower()
+  if prov == 'redis':
+    import redis
+    r = redis.Redis.from_url(os.getenv('FLAGS_REDIS_URL','redis://localhost:6379'))
+    raw = r.get((os.getenv('FLAGS_NAMESPACE','flags:v1')+':spec'))
+    return json.loads(raw) if raw else { 'version':'flags-v1', 'features':{} }
+  path = os.getenv('FLAGS_JSON_PATH','infra/mock/flags/flags.json')
+  with open(path,'r') as f: return json.load(f)
+
+def save_spec(spec: Dict[str, Any]):
+  prov = os.getenv('FLAGS_PROVIDER','json').lower()
+  if prov == 'redis':
+    import redis
+    r = redis.Redis.from_url(os.getenv('FLAGS_REDIS_URL','redis://localhost:6379'))
+    r.set((os.getenv('FLAGS_NAMESPACE','flags:v1')+':spec'), json.dumps(spec))
+  else:
+    path = os.getenv('FLAGS_JSON_PATH','infra/mock/flags/flags.json')
+    with open(path,'w') as f: json.dump(spec,f,indent=2)
+
+def slo_green(slo: Dict[str,Any]) -> bool:
+  if not slo: return False
+  if any(a.get('severity')=='critical' for a in slo.get('alerts',[])): return False
+  if slo.get('divergence',0) > 0: return False
+  if slo.get('anchor_p95_ms',999) > int(os.getenv('SLO_ANCHOR_P95_MS','30')): return False
+  return True
+
+def main():
+  tenants = os.getenv('RAMP_TENANTS','default').split(',')
+  target = int(os.getenv('TARGET_COVERAGE','95'))
+  step_up = int(os.getenv('STEP_UP','10'))
+  step_down = int(os.getenv('STEP_DOWN','10'))
+  min_pct = int(os.getenv('MIN_PCT','0'))
+  max_pct = int(os.getenv('MAX_PCT','100'))
+  features = ['receipts','attest']
+  slo_path = os.getenv('SLO_HEALTH_JSON','infra/ramp/slo_health.json')
+  slo = {}
+  try:
+    with open(slo_path,'r') as f: slo = json.load(f)
+  except Exception:
+    slo = {}
+  spec = load_spec()
+  changed = False
+  for t in tenants:
+    cov = float(os.getenv('COVERAGE_'+t.upper(), os.getenv('COVERAGE_DEFAULT','95')))
+    for feat in features:
+      f = spec.setdefault('features',{}).setdefault(feat,{'pct':0,'cohorts':['A','B','C']})
+      pct = int(f.get('pct',0))
+      if slo_green(slo) and cov >= target:
+        new_pct = min(max_pct, pct + step_up)
+      else:
+        new_pct = max(min_pct, pct - step_down) if pct>0 else pct
+      if new_pct != pct:
+        f['pct'] = new_pct
+        changed = True
+  if changed:
+    spec['version'] = spec.get('version','flags-v1') + '+ramp'
+    save_spec(spec)
+  print(json.dumps({'ok': True, 'changed': changed, 'spec_version': spec.get('version'), 'features': spec.get('features')}))
+
+if __name__ == '__main__':
+  main()

diff --git a/.github/workflows/ramp.yml b/.github/workflows/ramp.yml
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/.github/workflows/ramp.yml
@@
+name: ramp-controller
+on:
+  schedule:
+    - cron: '7 4 * * *'
+  workflow_dispatch:
+jobs:
+  run:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-python@v5
+        with: { python-version: '3.11' }
+      - name: Run Ramp Controller (json provider)
+        env:
+          FLAGS_PROVIDER: json
+          FLAGS_JSON_PATH: infra/mock/flags/flags.json
+          RAMP_TENANTS: default
+          TARGET_COVERAGE: '95'
+          STEP_UP: '10'
+          STEP_DOWN: '10'
+        run: |
+          python3 infra/ramp/ramp_controller.py | tee /tmp/ramp.json
+      - name: Commit updated flags.json if changed
+        if: always()
+        uses: stefanzweifel/git-auto-commit-action@v5
+        with:
+          commit_message: "chore(flags): automated ramp adjustment"
+          file_pattern: infra/mock/flags/flags.json
+
+```

---

## 4) PR Description Template

**Title:** feat: coverage metrics + automated ramp controller with CI

**Summary**
- API exposes admin endpoints to push **coverage** and **ramp** metrics; Prometheus scrapes `/metrics`
- **Ramp Controller** adjusts `receipts`/`attest` percentages based on coverage and SLO health; supports JSON or Redis providers
- **CI (nightly)** runs controller and auto‑commits updated `flags.json` (JSON mode). Redis mode can be wired later via secrets.

**Config**
- Controller env: `TARGET_COVERAGE`, `STEP_UP`, `STEP_DOWN`, `MIN_PCT`, `MAX_PCT`, `RAMP_TENANTS`, `SLO_HEALTH_JSON`
- Flags provider: `FLAGS_PROVIDER=json|redis`, `FLAGS_JSON_PATH`, `FLAGS_REDIS_URL`, `FLAGS_NAMESPACE`

**Guardrails**
- Decrease ramps when SLOs red or divergence>0
- Version bumps `flags.spec` with `+ramp` suffix for traceability
- Git auto‑commit limited to dev/mock flags; production should use Redis provider with change approvals

**How to test locally**
```bash
# Push coverage into API metrics
curl -X POST localhost:4000/admin/coverage -H 'content-type: application/json' -d '{"tenant":"default","pct":97}'
# Run controller against mock flags.json
python3 infra/ramp/ramp_controller.py
```

---

# Sprint K Plan — Data Lineage Deepening & Compliance Hooks

**Theme**: Enrich receipts with **op lineage spans**, add **PII detectors** to selective disclosure, and ship **compliance hooks** (data retention, DSAR export).

## Objectives & KPIs
- **Lineage**: emit `op_chain_id` and parent links across API/Worker; visible in audit & exporter.
  - *KPI*: chain reconstruction accuracy 100% on test corpus.
- **PII Guard**: automatic redact suggestions (email/IP/phone) feeding denylist; false positive rate < 2%.
- **Compliance**: DSAR export (`/audit/dsar`) and retention purge hooks.

## Work Breakdown
- [ ] Add lineage fields to ReceiptV02 (`op_id`, `op_parent_id`, `op_chain_id`) and surface in audit/export.
- [ ] PII scanners integrated into rehydration pipeline → suggest policy denylist updates.
- [ ] DSAR exporter for a subject id with signed manifest; retention CLI to purge beyond TTL.
- [ ] Dashboards: lineage completeness % and PII block rate.

## CI
- Lineage chain tests; PII unit tests; DSAR export smoke with signature verify.

## DoD
- Lineage in receipts/export; DSAR route live; PII denylist suggestions recorded and optionally auto‑applied.
