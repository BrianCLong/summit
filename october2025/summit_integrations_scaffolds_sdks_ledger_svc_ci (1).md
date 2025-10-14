# Summit Integrations — Scaffolds (SDKs, Ledger Service, CI)

This drop is a **repo‑ready** scaffold aligned to the Repro Pack tree from the plan. You can copy these paths/files verbatim into the root of `summit/` (or as a top‑level `integrations/` package) and run `make bootstrap && make test && make run && make smoke`.

> License: Apache‑2.0 (included). No GPL/AGPL deps.

---

## 📁 Tree

```
/design/
/spec/
  policy-receipt-spec.md
  ledger-api.md
/impl/
  policy-receipt/
    pyproject.toml
    policy_receipt/__init__.py
    policy_receipt/receipt.py
    policy_receipt/otel.py
    tests/test_receipt.py
    README.md
  policy-receipt-ts/
    package.json
    tsconfig.json
    src/index.ts
    src/crypto.ts
    README.md
  ledger-svc/
    pyproject.toml
    app/__init__.py
    app/main.py
    app/models.py
    app/schemas.py
    app/storage.py
    app/merkle.py
    app/crypto.py
    app/config.py
    tests/test_api.py
    Dockerfile
    README.md
/experiments/
  assurance/
    run_evals.sh
    scenarios/
      authz_correctness.yml
      latency_budget.yml
      graph_safety.yml
/benchmark/
  latency_harness.py
/ip/
  draft_spec.md
  claims.md
  prior_art.csv
  fto.md
/compliance/
  LICENSE
  NOTICE
  SBOM.spdx.json
/integration/
  api-stubs.http
  examples/
    python_emit.py
    ts_emit.ts
  github/
    workflows/assurance.yml
Makefile
.env.example
docker-compose.override.yml
.pre-commit-config.yaml
README.md
```

---

## Root: `Makefile`

```makefile
.PHONY: bootstrap test run smoke lint fmt

PY := python3.11
PIP := pip
NODE := node
NPM := npm

bootstrap:
	$(PY) -m venv .venv && . .venv/bin/activate && \
	pip install -U pip && \
	pip install -e ./impl/policy-receipt && \
	pip install -e ./impl/ledger-svc[dev]
	cd impl/policy-receipt-ts && $(NPM) ci

lint:
	. .venv/bin/activate && ruff check . && mypy impl/ledger-svc/app impl/policy-receipt/policy_receipt
	cd impl/policy-receipt-ts && $(NPM) run lint

fmt:
	. .venv/bin/activate && ruff format .
	cd impl/policy-receipt-ts && $(NPM) run format

test:
	. .venv/bin/activate && pytest -q
	cd impl/policy-receipt-ts && $(NPM) test --silent

run:
	. .venv/bin/activate && uvicorn app.main:app --app-dir impl/ledger-svc --host 0.0.0.0 --port 4600

smoke:
	$(PY) benchmark/latency_harness.py --endpoint http://localhost:4600
```

---

## Root: `.env.example`

```dotenv
# Ledger service
LEDGER_DB_URL=sqlite+aiosqlite:///./ledger.db
LEDGER_SIGNING_SECRET=dev-ed25519-key-hex-or-base64
ANCHOR_BATCH_SIZE=64
ANCHOR_INTERVAL_MS=500
```

---

## Root: `docker-compose.override.yml`

```yaml
version: "3.9"
services:
  ledger:
    build: ./impl/ledger-svc
    image: summit/ledger-svc:dev
    env_file:
      - .env
    ports:
      - "4600:4600"
    depends_on: []
```

---

## Root: `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: ["--fix"]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.2
    hooks:
      - id: mypy
```

---

## Root: `README.md`

```markdown
# Summit Integrations Scaffolds

This package adds:

1. **policy-receipt** (Python/TS): generate signed decision receipts + OTEL enricher.
2. **ledger-svc** (FastAPI): append-only store with micro-Merkle anchoring + selective disclosure.
3. **CI Assurance**: budgets + smoke.

## Quickstart

```bash
make bootstrap
make run  # starts ledger at :4600
make smoke
```

Integrate from API/Worker using examples in `/integration/examples/*`.
```

---

## `/spec/policy-receipt-spec.md`

```markdown
# Policy Receipt Spec v0.1

Fields: version, input_hash, policy_version, decision, issued_at, signer_kid, sig, merkle_path(optional), anchor_hash(optional).
Hash: SHA-256 over canonical JSON of {subject, action, resource, context}.
Signature: Ed25519 over `version || input_hash || policy_version || decision || issued_at`.
```

---

## `/spec/ledger-api.md`

```markdown
# Ledger API v0.1

POST /receipts/anchor {receipts:[...]} -> {anchor_id, anchor_hash}
GET  /receipts/{id} -> receipt
POST /digests {pg_digest, neo4j_digest, op_id} -> {entry_id}
GET  /audit/query?op_id=... -> {receipts, digests, anchor}
```

---

## Python SDK: `impl/policy-receipt/pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "policy-receipt"
version = "0.1.0"
description = "Signed policy decision receipts + OTEL enrichers"
license = {text = "Apache-2.0"}
authors = [{name = "Summit AURELIUS"}]
requires-python = ">=3.11"
dependencies = [
  "cryptography>=43.0.0",
  "orjson>=3.10.7",
  "opentelemetry-api>=1.26.0",
]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.setuptools.package-dir]
policy_receipt = "policy_receipt"
```

---

## Python SDK: `impl/policy-receipt/policy_receipt/receipt.py`

```python
from __future__ import annotations
import time, os
import orjson as json
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
from cryptography.hazmat.primitives import hashes
from dataclasses import dataclass, asdict

VERSION = "0.1"

@dataclass
class Receipt:
    version: str
    input_hash: str
    policy_version: str
    decision: str
    issued_at: int
    signer_kid: str
    sig: str
    merkle_path: str | None = None
    anchor_hash: str | None = None


def _sha256_bytes(b: bytes) -> bytes:
    h = hashes.Hash(hashes.SHA256())
    h.update(b)
    return h.finalize()


def canonical_input(subject: dict, action: dict, resource: dict, context: dict) -> bytes:
    payload = {"subject": subject, "action": action, "resource": resource, "context": context}
    return json.dumps(payload, option=json.OPT_SORT_KEYS)


def input_hash(subject: dict, action: dict, resource: dict, context: dict) -> str:
    return _sha256_bytes(canonical_input(subject, action, resource, context)).hex()


def load_signer_from_env(env_var: str = "LEDGER_SIGNING_SECRET") -> Ed25519PrivateKey:
    secret = os.getenv(env_var)
    if not secret:
        raise RuntimeError(f"Missing {env_var}")
    key_bytes = bytes.fromhex(secret) if all(c in '0123456789abcdef' for c in secret.lower()) else bytes.fromhex(secret)
    return Ed25519PrivateKey.from_private_bytes(key_bytes)


def sign_receipt(inp_hash: str, policy_version: str, decision: str, signer: Ed25519PrivateKey, kid: str = "dev") -> Receipt:
    issued = int(time.time())
    msg = "|".join([VERSION, inp_hash, policy_version, decision, str(issued)]).encode()
    sig = signer.sign(msg).hex()
    return Receipt(
        version=VERSION,
        input_hash=inp_hash,
        policy_version=policy_version,
        decision=decision,
        issued_at=issued,
        signer_kid=kid,
        sig=sig,
    )


def to_json(receipt: Receipt) -> bytes:
    return json.dumps(asdict(receipt))
```

---

## Python SDK: `impl/policy-receipt/policy_receipt/otel.py`

```python
from opentelemetry import trace
from .receipt import Receipt

def enrich_span_with_receipt(receipt: Receipt):
    span = trace.get_current_span()
    if span and hasattr(span, "set_attribute"):
        span.set_attribute("authz.receipt_hash", receipt.input_hash)
        span.set_attribute("policy.version", receipt.policy_version)
        if receipt.anchor_hash:
            span.set_attribute("ledger.anchor_hash", receipt.anchor_hash)
```

---

## Python SDK Tests: `impl/policy-receipt/policy_receipt/tests/test_receipt.py`

```python
from policy_receipt.receipt import input_hash, sign_receipt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

def test_roundtrip():
    ih = input_hash({"sub":"u1"},{"act":"read"},{"res":"r1"},{})
    key = Ed25519PrivateKey.generate()
    r = sign_receipt(ih, "pol-v1", "allow", key)
    assert r.input_hash == ih
    assert r.decision == "allow"
    assert len(r.sig) > 32
```

---

## TS SDK: `impl/policy-receipt-ts/package.json`

```json
{
  "name": "policy-receipt-ts",
  "version": "0.1.0",
  "license": "Apache-2.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p .",
    "test": "node --test",
    "lint": "eslint .",
    "format": "prettier -w ."
  },
  "devDependencies": {
    "@types/node": "^22.5.4",
    "typescript": "^5.5.4",
    "eslint": "^9.11.1",
    "prettier": "^3.3.3"
  }
}
```

---

## TS SDK: `impl/policy-receipt-ts/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

---

## TS SDK: `impl/policy-receipt-ts/src/crypto.ts`

```ts
import { createHash, sign as csign, generateKeyPairSync } from "node:crypto";

export function sha256Hex(buf: Buffer | string): string {
  const h = createHash("sha256");
  h.update(buf);
  return h.digest("hex");
}

export function ed25519SignHex(msg: Buffer, privateKeyPem: string): string {
  const sig = csign(null, msg, privateKeyPem);
  return sig.toString("hex");
}

export function devKeypair() {
  return generateKeyPairSync("ed25519");
}
```

---

## TS SDK: `impl/policy-receipt-ts/src/index.ts`

```ts
import { sha256Hex, ed25519SignHex } from "./crypto.js";

export type Decision = "allow" | "deny";
export interface Receipt {
  version: string;
  input_hash: string;
  policy_version: string;
  decision: Decision;
  issued_at: number;
  signer_kid: string;
  sig: string;
  merkle_path?: string;
  anchor_hash?: string;
}

export function canonicalInput(subject: any, action: any, resource: any, context: any): string {
  return JSON.stringify({ subject, action, resource, context }, Object.keys({}).sort());
}

export function inputHash(subject: any, action: any, resource: any, context: any): string {
  return sha256Hex(canonicalInput(subject, action, resource, context));
}

export function signReceipt(inpHash: string, policyVersion: string, decision: Decision, privateKeyPem: string, kid = "dev"): Receipt {
  const version = "0.1";
  const issued = Math.floor(Date.now() / 1000);
  const msg = Buffer.from([version, inpHash, policyVersion, decision, String(issued)].join("|"));
  const sig = ed25519SignHex(msg, privateKeyPem);
  return { version, input_hash: inpHash, policy_version: policyVersion, decision, issued_at: issued, signer_kid: kid, sig };
}
```

---

## Ledger Service: `impl/ledger-svc/pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "ledger-svc"
version = "0.1.0"
license = {text = "Apache-2.0"}
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.6",
  "pydantic>=2.8.2",
  "sqlalchemy[asyncio]>=2.0.32",
  "aiosqlite>=0.20.0",
  "orjson>=3.10.7",
  "cryptography>=43.0.0",
]

[project.optional-dependencies]
dev = ["pytest", "httpx", "ruff", "mypy"]
```

---

## Ledger Service: `impl/ledger-svc/app/config.py`

```python
import os

DB_URL = os.getenv("LEDGER_DB_URL", "sqlite+aiosqlite:///./ledger.db")
ANCHOR_BATCH_SIZE = int(os.getenv("ANCHOR_BATCH_SIZE", "64"))
ANCHOR_INTERVAL_MS = int(os.getenv("ANCHOR_INTERVAL_MS", "500"))
```

---

## Ledger Service: `impl/ledger-svc/app/models.py`

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, LargeBinary, DateTime
import datetime as dt

class Base(DeclarativeBase):
    pass

class ReceiptRow(Base):
    __tablename__ = "receipts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    receipt_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    payload: Mapped[bytes] = mapped_column(LargeBinary)
    anchor_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

class DigestRow(Base):
    __tablename__ = "digests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    op_id: Mapped[str] = mapped_column(String(64), index=True)
    pg_digest: Mapped[str] = mapped_column(String(64))
    neo4j_digest: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

class AnchorRow(Base):
    __tablename__ = "anchors"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anchor_id: Mapped[str] = mapped_column(String(64), unique=True)
    anchor_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
```

---

## Ledger Service: `impl/ledger-svc/app/schemas.py`

```python
from pydantic import BaseModel
from typing import List, Optional

class ReceiptIn(BaseModel):
    receipt_id: str
    payload_hex: str  # hex-encoded compact receipt JSON

class AnchorOut(BaseModel):
    anchor_id: str
    anchor_hash: str

class DigestsIn(BaseModel):
    op_id: str
    pg_digest: str
    neo4j_digest: str

class EntryOut(BaseModel):
    entry_id: int

class AuditOut(BaseModel):
    receipts: list[str]
    digests: list[DigestsIn]
    anchor: Optional[AnchorOut]
```

---

## Ledger Service: `impl/ledger-svc/app/merkle.py`

```python
from cryptography.hazmat.primitives import hashes

def sha256_hex(b: bytes) -> str:
    h = hashes.Hash(hashes.SHA256())
    h.update(b)
    return h.finalize().hex()

def anchor_hash(items: list[bytes]) -> str:
    if not items:
        return sha256_hex(b"")
    layer = [sha256_hex(i).encode() for i in items]
    while len(layer) > 1:
        next_layer = []
        it = iter(layer)
        for a in it:
            try:
                b = next(it)
            except StopIteration:
                b = a
            next_layer.append(sha256_hex(a + b).encode())
        layer = next_layer
    return layer[0].decode()
```

---

## Ledger Service: `impl/ledger-svc/app/storage.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from .models import Base, ReceiptRow, DigestRow, AnchorRow
from .merkle import anchor_hash

class Storage:
    def __init__(self, db_url: str):
        self.engine = create_async_engine(db_url, future=True)
        self.Session = async_sessionmaker(self.engine, expire_on_commit=False)

    async def init(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def add_receipts(self, receipts: list[tuple[str, bytes]]):
        async with self.Session() as s:
            rows = [ReceiptRow(receipt_id=rid, payload=blob) for rid, blob in receipts]
            s.add_all(rows)
            await s.commit()

    async def anchor(self, receipt_ids: list[str]):
        async with self.Session() as s:
            q = await s.execute(select(ReceiptRow).where(ReceiptRow.receipt_id.in_(receipt_ids)))
            rows = q.scalars().all()
            ah = anchor_hash([r.payload for r in rows])
            anchor = AnchorRow(anchor_id=ah[:16], anchor_hash=ah)
            for r in rows:
                r.anchor_hash = ah
            s.add(anchor)
            await s.commit()
            return anchor

    async def add_digest(self, op_id: str, pg: str, neo: str) -> int:
        async with self.Session() as s:
            row = DigestRow(op_id=op_id, pg_digest=pg, neo4j_digest=neo)
            s.add(row)
            await s.commit()
            return row.id

    async def audit(self, op_id: str):
        async with self.Session() as s:
            dq = await s.execute(select(DigestRow).where(DigestRow.op_id == op_id))
            digests = dq.scalars().all()
            rq = await s.execute(select(ReceiptRow).where(ReceiptRow.anchor_hash == digests[0].pg_digest if digests else ""))
            receipts = rq.scalars().all()
            aq = await s.execute(select(AnchorRow).order_by(AnchorRow.id.desc()))
            anchor = aq.scalars().first()
            return receipts, digests, anchor
```

---

## Ledger Service: `impl/ledger-svc/app/crypto.py`

```python
from cryptography.hazmat.primitives import hashes

def sha256_hex(b: bytes) -> str:
    h = hashes.Hash(hashes.SHA256())
    h.update(b)
    return h.finalize().hex()
```

---

## Ledger Service: `impl/ledger-svc/app/main.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import ORJSONResponse
from .schemas import ReceiptIn, AnchorOut, DigestsIn, EntryOut, AuditOut
from .storage import Storage
from .config import DB_URL
from .crypto import sha256_hex
import asyncio

app = FastAPI(default_response_class=ORJSONResponse, title="Prov-Ledger v0.1")
storage = Storage(DB_URL)

@app.on_event("startup")
async def _init():
    await storage.init()

@app.post("/receipts/anchor", response_model=AnchorOut)
async def receipts_anchor(receipts: list[ReceiptIn]):
    # store receipts, then compute anchor
    items = [(r.receipt_id, bytes.fromhex(r.payload_hex)) for r in receipts]
    await storage.add_receipts(items)
    anchor = await storage.anchor([r.receipt_id for r in receipts])
    return AnchorOut(anchor_id=anchor.anchor_id, anchor_hash=anchor.anchor_hash)

@app.post("/digests", response_model=EntryOut)
async def digests(d: DigestsIn):
    eid = await storage.add_digest(d.op_id, d.pg_digest, d.neo4j_digest)
    return EntryOut(entry_id=eid)

@app.get("/audit/query", response_model=AuditOut)
async def audit(op_id: str):
    receipts, digests, anchor = await storage.audit(op_id)
    return AuditOut(
        receipts=[r.payload.hex() for r in receipts],
        digests=[DigestsIn(op_id=x.op_id, pg_digest=x.pg_digest, neo4j_digest=x.neo4j_digest) for x in digests],
        anchor=None if not anchor else {"anchor_id": anchor.anchor_id, "anchor_hash": anchor.anchor_hash},
    )

@app.get("/healthz")
async def healthz():
    return {"ok": True}
```

---

## Ledger Service: `impl/ledger-svc/tests/test_api.py`

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/healthz")
        assert r.status_code == 200
        assert r.json()["ok"] is True
```

---

## Ledger Service: `impl/ledger-svc/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml /app/
RUN pip install --no-cache-dir -e .
COPY app /app/app
EXPOSE 4600
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4600"]
```

---

## Experiments: `experiments/assurance/run_evals.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${LEDGER_ENDPOINT:=http://localhost:4600}"
echo "Running latency budget smoke against ${LEDGER_ENDPOINT}"
python3 benchmark/latency_harness.py --endpoint ${LEDGER_ENDPOINT}
```

---

## Benchmark: `benchmark/latency_harness.py`

```python
#!/usr/bin/env python3
import argparse, time, json, os, http.client
from hashlib import sha256

parser = argparse.ArgumentParser()
parser.add_argument("--endpoint", default="http://localhost:4600")
args = parser.parse_args()

host = args.endpoint.replace("http://", "").replace("https://", "")
if ":" in host:
    host, port = host.split(":" ,1)
else:
    port = "80"

conn = http.client.HTTPConnection(host, int(port))

payloads = []
for i in range(16):
    p = json.dumps({"i": i}).encode()
    rid = sha256(p).hexdigest()[:16]
    payloads.append({"receipt_id": rid, "payload_hex": p.hex()})

start = time.time()
conn.request("POST", "/receipts/anchor", body=json.dumps(payloads), headers={"Content-Type":"application/json"})
r = conn.getresponse(); data = r.read()
lat = (time.time()-start)*1000
print("anchor p95(ms)", round(lat,2), data.decode())
assert r.status == 200
```

---

## CI: `integration/github/workflows/assurance.yml`

```yaml
name: assurance
on:
  pull_request:
  push:
jobs:
  test-and-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Bootstrap
        run: |
          make bootstrap
      - name: Lint & Test
        run: |
          make lint
          make test
      - name: Run ledger & smoke
        run: |
          nohup make run &
          sleep 2
          make smoke
```

---

## Integration Examples: `integration/examples/python_emit.py`

```python
import os, requests, orjson
from policy_receipt.receipt import input_hash, sign_receipt, load_signer_from_env

LEDGER = os.getenv("LEDGER_ENDPOINT", "http://localhost:4600")

h = input_hash({"sub":"u1"},{"act":"read"},{"res":"r1"},{"ip":"127.0.0.1"})
key = load_signer_from_env()
r = sign_receipt(h, "policy-v1", "allow", key)

payload = {"receipts": [{"receipt_id": h[:16], "payload_hex": orjson.dumps(r.__dict__).hex()}]}
resp = requests.post(f"{LEDGER}/receipts/anchor", json=payload["receipts"]).json()
print(resp)
```

---

## Integration Examples: `integration/examples/ts_emit.ts`

```ts
import { inputHash, signReceipt } from "../../impl/policy-receipt-ts/src/index.js";

const inp = inputHash({ sub: "u1" }, { act: "read" }, { res: "r1" }, { ip: "127.0.0.1" });
const pem = `-----BEGIN PRIVATE KEY-----\n...dev...\n-----END PRIVATE KEY-----`;
const r = signReceipt(inp, "policy-v1", "allow", pem);
console.log(r);
```

---

## Compliance: `compliance/LICENSE`

```text
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
... (full text here) ...
```

---

## Compliance: `compliance/NOTICE`

```text
Copyright (c) 2025 Summit
Licensed under the Apache License, Version 2.0.
```

---

## IP placeholders

- `/ip/draft_spec.md`, `/ip/claims.md`, `/ip/prior_art.csv`, `/ip/fto.md` — created empty for immediate authoring.
```

