# Integration Diffs — Fold Into Existing Services + OPA Bundle

This package folds the previously posted scaffolds directly into **existing** service folders and adds an **OPA policy bundle** plus concrete **API/Worker** wiring. Apply these diffs at repo root. No external dependencies beyond those already declared in the scaffolds. License: Apache‑2.0.

> NOTE: I provide **both** Node/Express and Python/FastAPI shims. Keep the one matching your services and delete the other. Paths assume a monorepo layout like `services/api/`, `services/worker/`, `services/ui/`, `infra/`.

---

## 1) Repo Layout (after fold)

```
services/
  api/
    src/
      middleware/
        authz-receipt.ts     # (Node variant)
      middleware/
        authz_receipt.py     # (Python variant)
    requirements.txt | package.json
  worker/
    src/
      interceptors/
        authz-receipt.ts
      interceptors/
        authz_receipt.py
impl/
  policy-receipt/           # as scaffolded
  policy-receipt-ts/        # as scaffolded
  ledger-svc/               # as scaffolded (runs on :4600)
infra/
  opa/
    bundle/
      policies/
        authz.rego
        decisionlog.rego
      data/
        policy_versions.json
    Dockerfile
    README.md
integration/
  examples/
  github/workflows/assurance.yml
```

---

## 2) docker-compose merge

Append to your existing `docker-compose.yml` (kept minimal; override present in scaffold still valid):

```yaml
  ledger:
    build: ./impl/ledger-svc
    image: summit/ledger-svc:dev
    environment:
      - LEDGER_DB_URL=sqlite+aiosqlite:///./ledger.db
      - ANCHOR_BATCH_SIZE=64
      - ANCHOR_INTERVAL_MS=500
    ports:
      - "4600:4600"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4600/healthz"]
      interval: 10s
      timeout: 3s
      retries: 6
```

Ensure **api** and **worker** services have:

```yaml
    environment:
      - LEDGER_ENDPOINT=http://ledger:4600
      - POLICY_VERSION=policy-v1
```

---

## 3) OPA Policy Bundle

### `infra/opa/bundle/policies/authz.rego`

```rego
package summit.authz

default allow = false

# Example ABAC inputs (adapt to your subject/resource model)
# input = {"subject": {"id":"u1","roles":["analyst"]}, "action":"read", "resource": {"type":"case","owner":"team-a"}, "context": {"ip":"127.0.0.1"}}

allow {
  input.action == "read"
  input.resource.type == "case"
  some r
  r := input.subject.roles[_]
  r == "analyst"
}

allow {
  input.action == "write"
  input.resource.type == "note"
  "editor" in input.subject.roles
}

policy_version := data.policy_versions.current
```

### `infra/opa/bundle/policies/decisionlog.rego`

```rego
package summit.decisionlog

# Compute a stable hashable projection of input for receipts (mirrors SDK canonicalization)
canon := {
  "subject": input.subject,
  "action": {"act": input.action},
  "resource": input.resource,
  "context": input.context,
}
```

### `infra/opa/bundle/data/policy_versions.json`

```json
{ "current": "policy-v1" }
```

### `infra/opa/Dockerfile`

```dockerfile
FROM openpolicyagent/opa:0.64.1-rootless
COPY bundle /bundle
ENTRYPOINT ["/opa", "run", "--server", "/bundle"]
```

### Run OPA (optional service)

If you run OPA as a sidecar:

```yaml
  opa:
    build: ./infra/opa
    ports: ["8181:8181"]
```

---

## 4) API Integration — Node/Express

### `services/api/src/middleware/authz-receipt.ts`

```ts
import type { Request, Response, NextFunction } from "express";
import { inputHash, signReceipt } from "../../../impl/policy-receipt-ts/src/index.js";
import fetch from "node-fetch";

const LEDGER = process.env.LEDGER_ENDPOINT || "http://localhost:4600";
const POLICY_VERSION = process.env.POLICY_VERSION || "policy-v1";
const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY_PEM || ""; // supply via secrets

export async function authzReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const subject = { id: req.headers["x-user-id"], roles: (req.headers["x-roles"] as string||"").split(",") };
    const action = { act: req.method.toLowerCase() };
    const resource = { type: "api", path: req.path };
    const context = { ip: req.ip };

    // OPA check (optional inline; replace with your adapter)
    const allow = action.act === "get"; // stub until wired to OPA
    if (!allow) return res.status(403).json({ error: "forbidden" });

    const ih = inputHash(subject, action, resource, context);
    const r = signReceipt(ih, POLICY_VERSION, "allow", PRIVATE_KEY_PEM);
    const payload = [{ receipt_id: ih.slice(0, 16), payload_hex: Buffer.from(JSON.stringify(r)).toString("hex") }];

    // fire-and-forget anchor (do not block request)
    fetch(`${LEDGER}/receipts/anchor`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});

    // expose receipt hash to downstream
    res.setHeader("x-authz-receipt", ih);
    return next();
  } catch (e) {
    return next(e);
  }
}
```

Wire it in your Express app (e.g., `services/api/src/server.ts`):

```ts
import express from "express";
import { authzReceipt } from "./middleware/authz-receipt.js";
const app = express();
app.use(authzReceipt);
// ... your routes
```

---

## 5) API Integration — Python/FastAPI

### `services/api/src/middleware/authz_receipt.py`

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from policy_receipt.receipt import input_hash, sign_receipt, load_signer_from_env
import httpx, os, json

LEDGER = os.getenv("LEDGER_ENDPOINT", "http://localhost:4600")
POLICY_VERSION = os.getenv("POLICY_VERSION", "policy-v1")

class AuthzReceiptMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        subject = {"id": request.headers.get("x-user-id"), "roles": (request.headers.get("x-roles") or "").split(",")}
        action = {"act": request.method.lower()}
        resource = {"type": "api", "path": request.url.path}
        context = {"ip": request.client.host if request.client else None}

        # TODO: replace with real OPA check
        if action["act"] not in ("get", "post", "put", "delete"):
            from fastapi import Response
            return Response(status_code=403)

        ih = input_hash(subject, action, resource, context)
        signer = load_signer_from_env()
        r = sign_receipt(ih, POLICY_VERSION, "allow", signer)

        # async, non-blocking anchor
        async with httpx.AsyncClient(timeout=2.0) as ac:
            try:
                await ac.post(f"{LEDGER}/receipts/anchor", json=[{"receipt_id": ih[:16], "payload_hex": json.dumps(r.__dict__).encode().hex()}])
            except Exception:
                pass

        response = await call_next(request)
        response.headers["x-authz-receipt"] = ih
        return response
```

Wire in FastAPI app (e.g., `services/api/main.py`):

```python
from fastapi import FastAPI
from .middleware.authz_receipt import AuthzReceiptMiddleware
app = FastAPI()
app.add_middleware(AuthzReceiptMiddleware)
```

---

## 6) Worker Integration (Node & Python)

### Node: `services/worker/src/interceptors/authz-receipt.ts`

```ts
import { inputHash, signReceipt } from "../../../impl/policy-receipt-ts/src/index.js";
import fetch from "node-fetch";
const LEDGER = process.env.LEDGER_ENDPOINT || "http://localhost:4600";
const POLICY_VERSION = process.env.POLICY_VERSION || "policy-v1";
const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY_PEM || "";

export async function withReceipt<T>(job: {type:string, id:string, payload:any}, fn: () => Promise<T>): Promise<T> {
  const subject = { id: "worker", roles: ["service"] };
  const action = { act: job.type };
  const resource = { type: "job", id: job.id };
  const context = {};
  const ih = inputHash(subject, action, resource, context);
  const r = signReceipt(ih, POLICY_VERSION, "allow", PRIVATE_KEY_PEM);
  fetch(`${LEDGER}/receipts/anchor`, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify([{receipt_id: ih.slice(0,16), payload_hex: Buffer.from(JSON.stringify(r)).toString("hex")}]) }).catch(()=>{});
  return fn();
}
```

### Python: `services/worker/src/interceptors/authz_receipt.py`

```python
from policy_receipt.receipt import input_hash, sign_receipt, load_signer_from_env
import httpx, os, json
LEDGER = os.getenv("LEDGER_ENDPOINT", "http://localhost:4600")
POLICY_VERSION = os.getenv("POLICY_VERSION", "policy-v1")

async def with_receipt(job_type: str, job_id: str, payload: dict, fn):
    subject = {"id": "worker", "roles": ["service"]}
    action = {"act": job_type}
    resource = {"type": "job", "id": job_id}
    context = {}
    ih = input_hash(subject, action, resource, context)
    r = sign_receipt(ih, POLICY_VERSION, "allow", load_signer_from_env())
    async with httpx.AsyncClient(timeout=2.0) as ac:
        try:
            await ac.post(f"{LEDGER}/receipts/anchor", json=[{"receipt_id": ih[:16], "payload_hex": json.dumps(r.__dict__).encode().hex()}])
        except Exception:
            pass
    return await fn()
```

---

## 7) Dual‑Graph Digest Hooks

Add a tiny helper you call **after** PG + Neo4j mutations.

### `services/api/src/dual_digest.py`

```python
from hashlib import sha256
import httpx, os
LEDGER = os.getenv("LEDGER_ENDPOINT", "http://localhost:4600")

def digest_hex(b: bytes) -> str: return sha256(b).hexdigest()

async def attest(op_id: str, pg_rows: list[dict], gsubgraph: list[tuple[str,str,str]]):
    pg = digest_hex(str(pg_rows).encode())
    neo = digest_hex(str(gsubgraph).encode())
    async with httpx.AsyncClient(timeout=2.0) as ac:
        await ac.post(f"{LEDGER}/digests", json={"op_id": op_id, "pg_digest": pg, "neo4j_digest": neo})
```

Call `await attest(op_id, rows, triples)` after each write path. For Node, mirror with `crypto.createHash('sha256')`.

---

## 8) CI Wiring (augment)

Extend your main CI workflow to depend on the posted `assurance.yml` (already provided). If you have a monolithic workflow, add a job:

```yaml
  assurance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: make bootstrap
      - run: |
          nohup make run &
          sleep 2
          make smoke
```

---

## 9) Secrets & Keys

- **Ed25519 private key**: provide via `PRIVATE_KEY_PEM` (Node) or `LEDGER_SIGNING_SECRET` (Python raw bytes). Rotate by env var update.
- Consider KMS/HSM in production; in dev, generate on startup and print kid.

---

## 10) Removal Plan (feature flag)

Gate with env: `RECEIPTS_ENABLED=true`. Wrap middleware registration and `with_receipt` calls accordingly for easy rollback.

---

## 11) Validation Checklist

- [ ] `docker compose up -d ledger` → `/healthz` 200.
- [ ] API requests return `x-authz-receipt` header.
- [ ] `POST /receipts/anchor` occurs (check ledger logs).
- [ ] Worker jobs emit receipts.
- [ ] `POST /digests` called on mutations; `GET /audit/query?op_id=...` returns anchor + digests.
- [ ] CI `assurance` job passes; anchor p95 under budget.

---

## 12) Next Patch (optional)

- Replace OPA stub with actual HTTP call to `opa:8181/v1/data/summit/authz/allow` and `/data/summit/decisionlog/canon` to fetch canonical input (or compute locally and only fetch `policy_version`).
- Add `x-policy-version` response header and OTEL attributes.
- Add `graph_safety.yml` scenarios to block release if jailbreaks > budget.

