# Ready-to-Commit Patches (API=TypeScript, Worker=Python) + Sprint C Plan

**Repo read-in outcome** (from uploaded `summit-main` zip):
- **API**: TypeScript/Node (`services/api/src/*.ts` — e.g., `app.ts`, routes, DB adapters).
- **Worker**: Python (`ga-graphai/packages/worker/src/*.py` — e.g., `main.py`, `automation.py`, tests present).
- Also a lightweight Python worker at `services/workers/web_fetch_worker.py` (kept unchanged).

Below are **unified diffs** ready for `git apply`. They wire the **OPA HTTP adapter**, **policy decision receipts**, **ledger anchoring**, and **dual-graph digest attestation** to the correct runtimes.

> Assumes the previously posted `/impl/policy-receipt-ts` and `/impl/ledger-svc` are added at repo root, and `docker-compose.yml` is present at root. Env vars used: `LEDGER_ENDPOINT`, `POLICY_VERSION`, `PRIVATE_KEY_PEM`.

---

## Patch A — API (TypeScript) middleware + OPA adapter

```diff
*** a/services/api/src/app.ts
--- b/services/api/src/app.ts
@@
-import express from 'express';
+import express from 'express';
+import { authzReceipt } from './middleware/authz-receipt';
@@
-const app = express();
+const app = express();
+app.use(authzReceipt); // adds OPA check + emits signed receipts (fire-and-forget anchor)
 export default app;
```

```diff
*** /dev/null
--- b/services/api/src/middleware/authz-receipt.ts
+import type { Request, Response, NextFunction } from 'express';
+import { inputHash, signReceipt } from '../../../../impl/policy-receipt-ts/src/index.js';
+import { allow, policyVersion } from '../lib/opa';
+import fetch from 'node-fetch';
+
+const LEDGER = process.env.LEDGER_ENDPOINT || 'http://ledger:4600';
+const POLICY_VERSION = process.env.POLICY_VERSION || 'policy-v1';
+const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY_PEM || '';
+
+export async function authzReceipt(req: Request, res: Response, next: NextFunction) {
+  try {
+    const subject = { id: req.headers['x-user-id'] || 'anon', roles: String(req.headers['x-roles']||'').split(',').filter(Boolean) };
+    const action = { act: req.method.toLowerCase() };
+    const resource = { type: 'api', path: req.path };
+    const context = { ip: req.ip };
+
+    const isAllowed = await allow({ subject, action: action.act, resource, context });
+    if (!isAllowed) return res.status(403).json({ error: 'forbidden' });
+
+    const pv = await policyVersion();
+    const ih = inputHash(subject, action, resource, context);
+    const r = signReceipt(ih, pv || POLICY_VERSION, 'allow', PRIVATE_KEY_PEM);
+    const payload = [{ receipt_id: ih.slice(0,16), payload_hex: Buffer.from(JSON.stringify(r)).toString('hex') }];
+    // Non-blocking anchor
+    fetch(`${LEDGER}/receipts/anchor`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) }).catch(()=>{});
+    res.setHeader('x-authz-receipt', ih);
+    return next();
+  } catch (e) {
+    return next(e);
+  }
+}
```

```diff
*** /dev/null
--- b/services/api/src/lib/opa.ts
+import fetch from 'node-fetch';
+const OPA = process.env.OPA_URL || 'http://opa:8181';
+
+export async function allow(input: any): Promise<boolean> {
+  const res = await fetch(`${OPA}/v1/data/summit/authz/allow`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ input }) });
+  if (!res.ok) return false;
+  const json: any = await res.json();
+  return !!json.result;
+}
+
+export async function policyVersion(): Promise<string|undefined> {
+  const res = await fetch(`${OPA}/v1/data/policy_versions/current`);
+  if (!res.ok) return undefined;
+  const json: any = await res.json();
+  return json.result;
+}
```

---

## Patch B — API (TypeScript) dual‑graph attestation hook

```diff
*** /dev/null
--- b/services/api/src/lib/attest.ts
+import crypto from 'node:crypto';
+import fetch from 'node-fetch';
+const LEDGER = process.env.LEDGER_ENDPOINT || 'http://ledger:4600';
+
+const h = (b: Buffer|string) => crypto.createHash('sha256').update(b).digest('hex');
+
+export async function attest(opId: string, pgRows: unknown[], triples: Array<[string,string,string]>) {
+  const pg = h(Buffer.from(JSON.stringify(pgRows)));
+  const neo = h(Buffer.from(JSON.stringify(triples)));
+  await fetch(`${LEDGER}/digests`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ op_id: opId, pg_digest: pg, neo4j_digest: neo }) });
+}
```

> Call `await attest(opId, rows, triples)` at the end of your write routes (e.g., `routes/cases.ts` after successful PG+Neo4j mutations).

---

## Patch C — Worker (Python) receipt emitter + usage

```diff
*** a/ga-graphai/packages/worker/src/main.py
--- b/ga-graphai/packages/worker/src/main.py
@@
-from .routing import run
+from .routing import run
+from .receipts import with_receipt
@@
-if __name__ == "__main__":
-    run()
+if __name__ == "__main__":
+    with_receipt(job_type="bootstrap", job_id="startup", payload={})(run)
```

```diff
*** /dev/null
--- b/ga-graphai/packages/worker/src/receipts.py
+import os, json, asyncio
+from hashlib import sha256
+import httpx
+from policy_receipt.receipt import input_hash, sign_receipt, load_signer_from_env
+
+LEDGER = os.getenv('LEDGER_ENDPOINT', 'http://ledger:4600')
+POLICY_VERSION = os.getenv('POLICY_VERSION', 'policy-v1')
+
+def _hex(b: bytes) -> str: return b.hex()
+
+async def _anchor(hex_payloads: list[dict]):
+    async with httpx.AsyncClient(timeout=2.0) as ac:
+        await ac.post(f"{LEDGER}/receipts/anchor", json=hex_payloads)
+
+def with_receipt(job_type: str, job_id: str, payload: dict):
+    def _wrap(fn):
+        async def _run_async():
+            subject = {"id": "worker", "roles": ["service"]}
+            action = {"act": job_type}
+            resource = {"type": "job", "id": job_id}
+            context = {}
+            ih = input_hash(subject, action, resource, context)
+            signer = load_signer_from_env()
+            r = sign_receipt(ih, POLICY_VERSION, "allow", signer)
+            try:
+                asyncio.create_task(_anchor([{"receipt_id": ih[:16], "payload_hex": json.dumps(r.__dict__).encode().hex()}]))
+            except Exception:
+                pass
+            return fn()
+        def _run_sync():
+            return asyncio.run(_run_async())
+        return _run_sync
+    return _wrap
```

---

## Patch D — Docker Compose additions (OPA + Ledger)

```diff
*** a/docker-compose.yml
--- b/docker-compose.yml
@@
   services:
+    opa:
+      build: ./infra/opa
+      image: summit/opa:dev
+      ports: ["8181:8181"]
+    ledger:
+      build: ./impl/ledger-svc
+      image: summit/ledger-svc:dev
+      environment:
+        - LEDGER_DB_URL=sqlite+aiosqlite:///./ledger.db
+        - ANCHOR_BATCH_SIZE=64
+        - ANCHOR_INTERVAL_MS=500
+      ports: ["4600:4600"]
+      healthcheck:
+        test: ["CMD", "curl", "-f", "http://localhost:4600/healthz"]
+        interval: 10s
+        timeout: 3s
+        retries: 6
```

---

## Patch E — CI (assurance) include

```diff
*** a/.github/workflows/ci.yml
--- b/.github/workflows/ci.yml
@@
   jobs:
+    assurance:
+      runs-on: ubuntu-latest
+      steps:
+        - uses: actions/checkout@v4
+        - uses: actions/setup-python@v5
+          with: { python-version: '3.11' }
+        - uses: actions/setup-node@v4
+          with: { node-version: '20' }
+        - name: Bootstrap
+          run: make bootstrap
+        - name: Run ledger & smoke
+          run: |
+            nohup make run &
+            sleep 2
+            make smoke
```

---

## Patch F — OPA bundle (if not present)

_Add these files if your repo doesn’t already contain the OPA artifacts._

```
infra/opa/Dockerfile
infra/opa/bundle/policies/authz.rego
infra/opa/bundle/policies/decisionlog.rego
infra/opa/bundle/data/policy_versions.json
```

(Identical contents to the earlier “Integration Diffs” Canvas doc.)

---

# Sprint C (2 weeks) — **OPA-in-the-loop + Coverage & Attestation**

**Goals**: Replace stubs with live OPA, achieve ≥95% coverage of privileged API/Worker paths with receipts; wire dual‑graph attestation for all write ops; turn on CI budgets.

**Backlog**
- [ ] API: replace route‑level TODOs with `attest()` calls in `cases.ts`, `evidence.ts`, `ingest.ts`.
- [ ] API: add `x-policy-version` header + OTEL attrs.
- [ ] Worker: wrap top 3 job types with `with_receipt()`; emit op_ids and add attest calls post‑mutation.
- [ ] OPA: port current ABAC logic into `authz.rego`; add unit tests (conftest + rego tests) and policy version bump.
- [ ] CI: enable `assurance` as required; thresholds p95 anchor < 15ms local.
- [ ] Docs: runbooks + rollback plan (feature flag `RECEIPTS_ENABLED`).

**Exit/KPIs**
- Receipts present on 95%+ privileged requests/jobs.
- Zero policy oracle mismatches on suite; 
- Dual‑graph divergence rate 0% on tests; 
- Latency budgets met (authz p95<12ms; anchor p95<15ms local).

---

# Notes
- No GPL/AGPL. All added code Apache‑2.0.
- Minimal invasiveness: middleware/interceptor pattern and fire‑and‑forget anchoring keeps hot paths fast.
- Secrets: ensure `PRIVATE_KEY_PEM` or `LEDGER_SIGNING_SECRET` provided in env or KMS.
