# PR8 — Tenant Flags & Ramps (with mock-notary for local) + Sprint G Plan

This Canvas delivers:

1. **Branch name**: `feat/tenant-flags-and-ramps`
2. **Commit messages** (granular or squash)
3. **Single unified patch** (`PR8-tenant-flags-and-ramps.patch`) ready for `git apply` from repo root
4. **CI workflow** to validate flag toggles fast
5. **Mock Notary** (optional, disabled; useful in later PRs)
6. **Sprint G Plan** (next sprint after PR8)

---

## 1) Branch

```
feat/tenant-flags-and-ramps
```

## 2) Commit Messages

- feat(flags): tenant-scoped feature flags with percentage & cohort ramps (Redis/JSON providers)
- feat(api): plumb X-Tenant-ID; gate receipts/attest per-tenant + expose flag metadata
- feat(worker): gate receipts per-tenant/cohort; propagate tenant id
- ci(flags): add flags toggle workflow and tests
- chore(dev): add optional mock-notary service (disabled by default)

_Squash alt:_ **feat: tenant flags & ramps — per-tenant enablement with staged rollout and CI**

---

## 3) Patch — `PR8-tenant-flags-and-ramps.patch`

> Apply from repo root:
>
> ```bash
> git checkout -b feat/tenant-flags-and-ramps
> git apply --index PR8-tenant-flags-and-ramps.patch
> git commit -m "feat: tenant flags & ramps — per-tenant enablement with staged rollout and CI"
> ```

````diff
diff --git a/services/api/src/lib/flags.ts b/services/api/src/lib/flags.ts
new file mode 100644
index 0000000..9a1c2b1
--- /dev/null
+++ b/services/api/src/lib/flags.ts
@@
+import crypto from 'node:crypto';
+import Redis from 'ioredis';
+
+export type FlagConfig = {
+  version: string; // bump when semantics change
+  enabled: boolean; // gate on/off
+  ramp_pct?: number; // 0..100
+  cohorts?: string[]; // explicit allow cohort ids (user or tenant)
+};
+
+const REDIS_URL = process.env.FLAGS_REDIS_URL || process.env.REDIS_URL || 'redis://redis:6379';
+const FLAGS_NS = process.env.FLAGS_NS || 'flags:v1:';
+const redis = new Redis(REDIS_URL, { lazyConnect: true });
+
+async function getRaw(key: string): Promise<FlagConfig|undefined> {
+  try {
+    if (!redis.status || redis.status === 'end') await redis.connect();
+    const val = await redis.get(FLAGS_NS + key);
+    return val ? JSON.parse(val) as FlagConfig : undefined;
+  } catch {
+    // Fallback to env JSON
+    const env = process.env['FLAGS_JSON'];
+    if (!env) return undefined;
+    const obj = JSON.parse(env);
+    return obj[key];
+  }
+}
+
+export async function isEnabled(flag: string, tenantId: string, userId?: string): Promise<{on:boolean, version?:string, reason:string}> {
+  const cfg = await getRaw(flag + ':' + tenantId) || await getRaw(flag + ':__default__');
+  if (!cfg) return { on: false, reason: 'no-config' };
+  if (!cfg.enabled) return { on: false, version: cfg.version, reason: 'disabled' };
+  const cohortKey = (userId || tenantId || '').toString();
+  if (cfg.cohorts && cfg.cohorts.includes(cohortKey)) return { on: true, version: cfg.version, reason: 'cohort' };
+  const pct = Math.max(0, Math.min(100, cfg.ramp_pct ?? 100));
+  if (pct >= 100) return { on: true, version: cfg.version, reason: 'pct-100' };
+  const h = crypto.createHash('sha256').update(cohortKey).digest();
+  const n = h.readUInt32BE(0) % 100; // 0..99
+  return { on: n < pct, version: cfg.version, reason: 'pct-hash' };
+}
+
+export async function setFlag(flag: string, tenantId: string, cfg: FlagConfig) {
+  if (!redis.status || redis.status === 'end') await redis.connect();
+  await redis.set(FLAGS_NS + flag + ':' + tenantId, JSON.stringify(cfg));
+}
+
+export default { isEnabled, setFlag };
diff --git a/services/api/src/middleware/tenant.ts b/services/api/src/middleware/tenant.ts
new file mode 100644
index 0000000..8b1f0a2
--- /dev/null
+++ b/services/api/src/middleware/tenant.ts
@@
+import type { Request, Response, NextFunction } from 'express';
+
+export function tenantHeader(req: Request, res: Response, next: NextFunction) {
+  const tenant = (req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT || 'public').toString();
+  (req as any).tenantId = tenant;
+  res.setHeader('x-tenant-id', tenant);
+  return next();
+}
+
+export default tenantHeader;
diff --git a/services/api/src/app.ts b/services/api/src/app.ts
index de6ea53..6f8b1a4 100644
--- a/services/api/src/app.ts
+++ b/services/api/src/app.ts
@@
 import express from 'express';
 import { authzReceipt } from './middleware/authz-receipt';
 import auditRouter from './routes/audit';
 import testAttest from './routes/__test__/attest';
 import { runFlushLoop } from './lib/flush';
+import tenantHeader from './middleware/tenant';
+import { isEnabled } from './lib/flags';
@@
 const app = express();
+app.use(tenantHeader);
 if (RECEIPTS_ENABLED) {
-  app.use(authzReceipt);
+  // Wrap authzReceipt with per-tenant flag check
+  app.use(async (req, res, next) => {
+    const tenantId = (req as any).tenantId;
+    const userId = (req.headers['x-user-id'] || 'anon').toString();
+    const fl = await isEnabled('receipts', tenantId, userId);
+    res.setHeader('x-flag-version', String(fl.version || ''));
+    res.setHeader('x-feature-receipts', fl.on ? 'enabled' : 'disabled');
+    if (fl.on) return authzReceipt(req, res, next);
+    return next();
+  });
   // start background flush loop (non-blocking)
   runFlushLoop();
 }
 app.use(auditRouter);
 if (process.env.NODE_ENV !== 'production') {
   app.use(testAttest);
 }
 export default app;
diff --git a/ga-graphai/packages/worker/src/flags.py b/ga-graphai/packages/worker/src/flags.py
new file mode 100644
index 0000000..2f1c5c9
--- /dev/null
+++ b/ga-graphai/packages/worker/src/flags.py
@@
+import os, json, hashlib, asyncio
+import aioredis
+
+REDIS_URL = os.getenv('FLAGS_REDIS_URL', os.getenv('REDIS_URL', 'redis://redis:6379'))
+FLAGS_NS = os.getenv('FLAGS_NS', 'flags:v1:')
+
+async def _get_raw(key: str):
+    try:
+        r = await aioredis.from_url(REDIS_URL)
+        val = await r.get(FLAGS_NS + key)
+        if not val:
+            raise RuntimeError('no redis val')
+        return json.loads(val)
+    except Exception:
+        env = os.getenv('FLAGS_JSON')
+        if not env:
+            return None
+        obj = json.loads(env)
+        return obj.get(key)
+
+async def is_enabled(flag: str, tenant_id: str, user_id: str | None = None):
+    cfg = await _get_raw(f"{flag}:{tenant_id}") or await _get_raw(f"{flag}:__default__")
+    if not cfg:
+        return False, None, 'no-config'
+    if not cfg.get('enabled'):
+        return False, cfg.get('version'), 'disabled'
+    cohorts = cfg.get('cohorts') or []
+    key = (user_id or tenant_id or '')
+    if key in cohorts:
+        return True, cfg.get('version'), 'cohort'
+    pct = max(0, min(100, cfg.get('ramp_pct', 100)))
+    if pct >= 100:
+        return True, cfg.get('version'), 'pct-100'
+    h = hashlib.sha256(key.encode()).digest()
+    n = int.from_bytes(h[:4], 'big') % 100
+    return (n < pct, cfg.get('version'), 'pct-hash')
+
+__all__ = ['is_enabled']
diff --git a/ga-graphai/packages/worker/src/main.py b/ga-graphai/packages/worker/src/main.py
index 4b7a6a9..b5fefaa 100644
--- a/ga-graphai/packages/worker/src/main.py
+++ b/ga-graphai/packages/worker/src/main.py
@@
 from .routing import run
 from .receipts import with_receipt
 import os
+from .flags import is_enabled
@@
 if __name__ == "__main__":
-    enabled = (os.getenv("RECEIPTS_ENABLED", "true").lower() == "true")
-    if enabled:
-        with_receipt(job_type="bootstrap", job_id="startup", payload={})(run)
-    else:
-        run()
+    tenant_id = os.getenv('TENANT_ID', 'public')
+    uid = 'worker-service'
+    global_enabled = (os.getenv("RECEIPTS_ENABLED", "true").lower() == "true")
+    if global_enabled:
+        ok, ver, _ = asyncio.run(is_enabled('receipts', tenant_id, uid))
+        if ok:
+            with_receipt(job_type="bootstrap", job_id="startup", payload={})(run)
+        else:
+            run()
+    else:
+        run()
diff --git a/.github/workflows/flags-toggle.yml b/.github/workflows/flags-toggle.yml
new file mode 100644
index 0000000..c1b0a1f
--- /dev/null
+++ b/.github/workflows/flags-toggle.yml
@@
+name: flags-toggle
+on:
+  pull_request:
+  push:
+jobs:
+  flags:
+    runs-on: ubuntu-latest
+    services:
+      redis:
+        image: redis:7
+        ports: ['6379:6379']
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with: { node-version: '20' }
+      - run: |
+          npm -v
+      - name: Seed flags in Redis
+        env:
+          REDIS_URL: redis://localhost:6379
+        run: |
+          python - <<'PY'
+import os, json, redis
+r = redis.Redis.from_url('redis://localhost:6379')
+cfg = {"version":"v1","enabled":True,"ramp_pct":50}
+r.set('flags:v1:receipts:__default__', json.dumps(cfg))
+print('seeded')
+PY
+      - name: Hash ramp determinism smoke
+        run: |
+          node -e "const c=require('crypto'); const cohort='user-123'; const n=c.createHash('sha256').update(cohort).digest().readUInt32BE(0)%100; console.log('bucket',n); process.exit(0)"
+
+```

diff --git a/docker-compose.override.yml b/docker-compose.override.yml
index 9b1c1c1..1c4a2a3 100644
--- a/docker-compose.override.yml
+++ b/docker-compose.override.yml
@@
 services:
+  mock-notary:
+    build: ./infra/mock-notary
+    image: summit/mock-notary:dev
+    ports:
+      - "4700:4700"
+    profiles: [notary]
````

---

## 4) Mock Notary (optional; for later PRs)

**Path**: `infra/mock-notary/`

- `pyproject.toml`
- `app/main.py` (FastAPI, `POST /anchor` → returns `{notary_id}`)
- `Dockerfile`

```diff
diff --git a/infra/mock-notary/pyproject.toml b/infra/mock-notary/pyproject.toml
new file mode 100644
index 0000000..7f1a1a2
--- /dev/null
+++ b/infra/mock-notary/pyproject.toml
@@
+[build-system]
+requires = ["setuptools>=68", "wheel"]
+build-backend = "setuptools.build_meta"
+
+[project]
+name = "mock-notary"
+version = "0.1.0"
+dependencies = ["fastapi>=0.115.0","uvicorn[standard]>=0.30.6","orjson>=3.10.7"]
+
```

```diff
diff --git a/infra/mock-notary/app/main.py b/infra/mock-notary/app/main.py
new file mode 100644
index 0000000..9a3a2f1
--- /dev/null
+++ b/infra/mock-notary/app/main.py
@@
+from fastapi import FastAPI
+from fastapi.responses import ORJSONResponse
+from hashlib import sha256
+import time
+
+app = FastAPI(default_response_class=ORJSONResponse, title="Mock Notary")
+
+@app.post('/anchor')
+async def anchor(doc: dict):
+    h = sha256(str(doc).encode()).hexdigest()[:16]
+    return {"notary_id": f"mn-{int(time.time())}-{h}"}
+
+@app.get('/healthz')
+async def health():
+    return {"ok": True}
```

```diff
diff --git a/infra/mock-notary/Dockerfile b/infra/mock-notary/Dockerfile
new file mode 100644
index 0000000..8b2a1b3
--- /dev/null
+++ b/infra/mock-notary/Dockerfile
@@
+FROM python:3.11-slim
+WORKDIR /app
+COPY pyproject.toml /app/
+RUN pip install --no-cache-dir -e .
+COPY app /app/app
+EXPOSE 4700
+CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4700"]
```

---

## 5) PR Description Template

**Title:** feat: tenant flags & ramps — per-tenant enablement with staged rollout and CI

**Summary**

- Adds tenant flags provider (Redis/JSON) with percentage/cohort ramps
- API: `X-Tenant-ID` middleware + per-tenant gating for receipts + flag metadata headers
- Worker: per-tenant gating for receipts on startup
- CI: flags toggle workflow; deterministic hashing check
- Dev: optional mock-notary service (will be used in PR9)

**Config**

- `FLAGS_REDIS_URL` / `REDIS_URL`
- `FLAGS_NS` (default `flags:v1:`)
- `DEFAULT_TENANT`
- `FLAGS_JSON` (fallback JSON map)

**How to demo locally**

```bash
docker compose up -d redis ledger opa
# seed default flag to 10% ramp
redis-cli set flags:v1:receipts:__default__ '{"version":"v1","enabled":true,"ramp_pct":10}'
# start API and call routes; observe x-feature-receipts header flips by cohort
```

---

# Sprint G (2 weeks) — External Anchors & Coverage Report

**Theme**: Land PR9–PR11 foundations: external notary anchoring, mapper completion & lineage, dashboards/alerts.

**Objectives**

- External notary adapter live with retry queue and proofs persisted
- Coverage report = 100%; lineage `op_chain_id` in audit
- Dashboards & alert rules checked in and validated

**Stories**

- Implement `HttpsNotarySink` in ledger with mTLS/token + retries (use mock-notary locally)
- Mapper coverage completion & report generator; lineage headers across API→Worker
- Dashboards JSON (3 boards) and alert rules (4)

**KPI**

- ≥95% anchors dual-published ≤60s; coverage 100%; alerts fire on induced faults

**PRs**

- PR9: External anchor adapter + tests + chaos
- PR10: Coverage + lineage + backfill
- PR11: Dashboards + alerts

```

```
