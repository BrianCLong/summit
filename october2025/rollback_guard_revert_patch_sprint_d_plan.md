# Rollback Guard + Revert Patch + Sprint D Plan

This Canvas adds:

1) A **single-toggle guard** via `RECEIPTS_ENABLED` across API/Worker so rollbacks don’t require code removal.
2) A **full revert patch** that removes all previously added files/lines in one `git apply` if you need a clean rollback.
3) **Sprint D (2 weeks)**: hardening + coverage + audit UX.

---

## A) Guard Patch — `RECEIPTS_ENABLED` toggle

Apply this **small** patch to keep code in place while making runtime opt-in.

> Usage: set `RECEIPTS_ENABLED=false` to disable receipts/OPA middleware and worker emission. Default is **true**.

```diff
*** a/services/api/src/app.ts
--- b/services/api/src/app.ts
@@
-import express from 'express';
-import { authzReceipt } from './middleware/authz-receipt';
+import express from 'express';
+import { authzReceipt } from './middleware/authz-receipt';
+
+const RECEIPTS_ENABLED = (process.env.RECEIPTS_ENABLED || 'true').toLowerCase() === 'true';
@@
-const app = express();
-app.use(authzReceipt);
+const app = express();
+if (RECEIPTS_ENABLED) {
+  app.use(authzReceipt);
+}
 export default app;
```

```diff
*** a/ga-graphai/packages/worker/src/main.py
--- b/ga-graphai/packages/worker/src/main.py
@@
-from .routing import run
-from .receipts import with_receipt
+from .routing import run
+from .receipts import with_receipt
+import os
@@
-if __name__ == "__main__":
-    with_receipt(job_type="bootstrap", job_id="startup", payload={})(run)
+if __name__ == "__main__":
+    enabled = (os.getenv("RECEIPTS_ENABLED", "true").lower() == "true")
+    if enabled:
+        with_receipt(job_type="bootstrap", job_id="startup", payload={})(run)
+    else:
+        run()
```

**Optional (compose profiles)**: add a dev override that only starts OPA/Ledger if enabled.

```yaml
# docker-compose.override.yml
services:
  opa:
    profiles: [receipts]
  ledger:
    profiles: [receipts]
```

Run with receipts off (no OPA/Ledger containers): `COMPOSE_PROFILES="" docker compose up`.
Enable: `COMPOSE_PROFILES=receipts docker compose up`.

---

## B) **Full Revert Patch** — `PR-feat-policy-receipts-ledger-opa-REVERT.patch`

Apply from repo root to remove all artifacts introduced by the receipts/ledger/OPA PR.

```diff
*** a/services/api/src/app.ts
--- b/services/api/src/app.ts
@@
-import express from 'express';
-import { authzReceipt } from './middleware/authz-receipt';
-const RECEIPTS_ENABLED = (process.env.RECEIPTS_ENABLED || 'true').toLowerCase() === 'true';
+import express from 'express';
@@
-const app = express();
-if (RECEIPTS_ENABLED) {
-  app.use(authzReceipt);
-}
+const app = express();
 export default app;
*** a/services/api/src/middleware/authz-receipt.ts
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/services/api/src/lib/opa.ts
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/services/api/src/lib/attest.ts
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/ga-graphai/packages/worker/src/main.py
--- b/ga-graphai/packages/worker/src/main.py
@@
-from .routing import run
-from .receipts import with_receipt
-import os
+from .routing import run
@@
-if __name__ == "__main__":
-    enabled = (os.getenv("RECEIPTS_ENABLED", "true").lower() == "true")
-    if enabled:
-        with_receipt(job_type="bootstrap", job_id="startup", payload={})(run)
-    else:
-        run()
+if __name__ == "__main__":
+    run()
*** a/ga-graphai/packages/worker/src/receipts.py
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/infra/opa/Dockerfile
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/infra/opa/bundle/policies/authz.rego
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/infra/opa/bundle/policies/decisionlog.rego
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/infra/opa/bundle/data/policy_versions.json
--- /dev/null
***************
*** 1,200 ****
---- 0 ----
*** a/docker-compose.yml
--- b/docker-compose.yml
@@
-  opa:
-    build: ./infra/opa
-    image: summit/opa:dev
-    ports:
-      - "8181:8181"
-  ledger:
-    build: ./impl/ledger-svc
-    image: summit/ledger-svc:dev
-    environment:
-      - LEDGER_DB_URL=sqlite+aiosqlite:///./ledger.db
-      - ANCHOR_BATCH_SIZE=64
-      - ANCHOR_INTERVAL_MS=500
-    ports:
-      - "4600:4600"
-    healthcheck:
-      test: ["CMD", "curl", "-f", "http://localhost:4600/healthz"]
-      interval: 10s
-      timeout: 3s
-      retries: 6
*** a/.github/workflows/ci.yml
--- b/.github/workflows/ci.yml
@@
-  assurance:
-    runs-on: ubuntu-latest
-    steps:
-      - uses: actions/checkout@v4
-      - uses: actions/setup-python@v5
-        with:
-          python-version: '3.11'
-      - uses: actions/setup-node@v4
-        with:
-          node-version: '20'
-      - name: Bootstrap
-        run: make bootstrap
-      - name: Run ledger & smoke
-        run: |
-          nohup make run &
-          sleep 2
-          make smoke
```

> After apply: remove empty dirs if your Git doesn’t track empty folders.

---

## C) Sprint D (2 weeks) — **Hardening, Coverage, and Audit UX**

**Objectives**
- **Coverage**: 100% privileged API routes + top 5 worker jobs emit receipts; dual‑graph attestation on all write ops.
- **Hardening**: policy tests for OPA bundle; key rotation + KID headers; resilience on ledger outages.
- **Audit UX**: minimal **Audit Workbench** (CLI + one UI route) to query by `op_id` and visualize anchor/receipts/digests.

**Backlog**
- [ ] API: add `x-policy-version` + `x-receipt-id` headers; OTEL attrs (`authz.receipt_hash`, `ledger.anchor_hash`).
- [ ] API: wrap write routes with `attest()`; add retries + DLQ if ledger down (queue to Redis, flush background).
- [ ] Worker: decorate jobs `ingest`, `link`, `promote`, `redact`, `export` with `with_receipt()`; export `op_id` consistently.
- [ ] OPA: rego unit tests; add `policy-v2` branch feature (new rule + `data.policy_versions.current="policy-v2"` behind env).
- [ ] Keys: introduce `SIGNER_KID` env; rotate dev key on container start; expose `x-signer-kid`.
- [ ] Audit Workbench:
  - CLI (`./integration/audit_cli.py op_id=...`) hitting `/audit/query` and printing a compact report
  - UI (minimal page under `services/ui`) that shows op timeline + anchor hash.
- [ ] Chaos: ledger outage test; ensure non-blocking paths; SLOs unaffected.
- [ ] CI: extend `assurance` job with end‑to‑end test: API call → receipt anchored → `audit/query` returns anchor within 1s.

**KPIs/Exit**
- Coverage: **100%** privileged routes emit receipts; **100%** write ops call `attest()`.
- Stability: no 5xx from API when ledger is down; background flush recovers within **60s**.
- Tests: OPA policy tests green; CI e2e passes; p95 anchor < **15ms** local.

**Deliverables**
- `/integration/audit_cli.py` + UI page `ui/pages/audit/[op_id].tsx` (simple table)
- `/infra/keys/dev_rotate.py` (dev-only keypair rotate)
- `/infra/opa/tests/*.rego` (rego unit tests)

**Risks & Mitigations**
- *Key handling:* wrap in KMS later; for now, sanitize logs and enforce KID only.
- *False confidence via selective disclosure:* add a doc section for auditor rehydration workflow.

---

### Commands

- **Disable receipts quickly**: `RECEIPTS_ENABLED=false docker compose up api worker`
- **Full revert**:
  ```bash
  git checkout -b revert/policy-receipts-ledger-opa
  git apply --index PR-feat-policy-receipts-ledger-opa-REVERT.patch
  git commit -m "revert: remove policy receipts, ledger, and OPA bundle"
  ```

