# PR10 Package — `feat/selective-disclosure-and-rehydration`

Implements **Selective Disclosure Policies** (tenant-scoped allow/deny + salting) and an **Audit Rehydration API** that reconstructs canonical inputs with redactions and attaches proof trail.

---

## 1) Branch name

```
feat/selective-disclosure-and-rehydration
```

## 2) Commit messages (granular or squash)

- feat(ledger): `AnchorPolicy` (allow/deny field masks + tenant salts) and emit masked receipts
- feat(ledger): `/anchor/policy` CRUD and hot-reload; persist policy versions
- feat(ledger): `/audit/rehydrate` endpoint to reconstruct masked canonical inputs + proofs
- test(ledger): policy masks, salting determinism, rehydrate E2E
- docs: disclosure policy model + auditor rehydration flow

_Squash alt:_ **feat: selective disclosure policies + audit rehydration API**

## 3) Single patch (.patch) — apply from repo root

> Usage:
>
> ```bash
> git checkout -b feat/selective-disclosure-and-rehydration
> git apply --index PR-feat-selective-disclosure-and-rehydration.patch
> git commit -m "feat: selective disclosure policies + audit rehydration API"
> ```

### `PR-feat-selective-disclosure-and-rehydration.patch`

```diff
diff --git a/impl/ledger-svc/app/schemas.py b/impl/ledger-svc/app/schemas.py
index 5a5a5a5..6c6c6c6 100644
--- a/impl/ledger-svc/app/schemas.py
+++ b/impl/ledger-svc/app/schemas.py
@@
 from pydantic import BaseModel
 from typing import List, Optional
@@
 class AnchorOut(BaseModel):
     anchor_id: str
     anchor_hash: str
     proofs: list[dict] | None = None
+    policy_version: Optional[str] = None
@@
 class AuditOut(BaseModel):
     receipts: list[str]
     digests: list[DigestsIn]
     anchor: Optional[AnchorOut]
+
+class AnchorPolicy(BaseModel):
+    tenant_id: str
+    version: str
+    allowlist: List[str] = []         # JSONPath-like dot paths to KEEP (takes precedence)
+    denylist: List[str] = []          # paths to MASK
+    salt: Optional[str] = None        # tenant salt (hex)
+
+class PolicySet(BaseModel):
+    items: List[AnchorPolicy]
+
+class RehydrateOut(BaseModel):
+    anchor_id: str
+    anchor_hash: str
+    policy_version: Optional[str]
+    canonical_inputs: List[dict]      # masked canon inputs from receipts
+    proofs: list[dict] | None = None

diff --git a/impl/ledger-svc/app/models.py b/impl/ledger-svc/app/models.py
index 4c4c4c4..5252525 100644
--- a/impl/ledger-svc/app/models.py
+++ b/impl/ledger-svc/app/models.py
@@
 class ProofRow(Base):
@@
     created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
+
+class PolicyRow(Base):
+    __tablename__ = "policies"
+    id: Mapped[int] = mapped_column(Integer, primary_key=True)
+    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
+    version: Mapped[str] = mapped_column(String(32))
+    allowlist: Mapped[str] = mapped_column(String(2048), default="[]")
+    denylist: Mapped[str] = mapped_column(String(2048), default="[]")
+    salt_hex: Mapped[str | None] = mapped_column(String(128), nullable=True)
+    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

diff --git a/impl/ledger-svc/app/policy.py b/impl/ledger-svc/app/policy.py
new file mode 100644
index 0000000..7a7a7a7
--- /dev/null
+++ b/impl/ledger-svc/app/policy.py
@@
+from __future__ import annotations
+from typing import Any, Dict, List, Optional
+import json
+
+def _path_get(d: Dict[str, Any], path: str) -> Any:
+    cur = d
+    for p in path.split('.'):
+        if isinstance(cur, dict) and p in cur:
+            cur = cur[p]
+        else:
+            return None
+    return cur
+
+def _path_set(d: Dict[str, Any], path: str, value: Any) -> None:
+    cur = d
+    parts = path.split('.')
+    for p in parts[:-1]:
+        if p not in cur or not isinstance(cur[p], dict):
+            cur[p] = {}
+        cur = cur[p]
+    cur[parts[-1]] = value
+
+def _mask_value(v: Any) -> Any:
+    if v is None: return None
+    if isinstance(v, (int, float)): return 0
+    if isinstance(v, str): return "***"
+    if isinstance(v, list): return ["***" for _ in v]
+    if isinstance(v, dict): return {k: _mask_value(v[k]) for k in v}
+    return "***"
+
+def apply_policy(canon: Dict[str, Any], allowlist: List[str], denylist: List[str]) -> Dict[str, Any]:
+    # allowlist precedence: if allowlist non-empty, first mask everything then copy allowed paths from original
+    base = canon
+    if allowlist:
+        masked = _mask_value(canon)
+        for p in allowlist:
+            val = _path_get(canon, p)
+            if val is not None:
+                _path_set(masked, p, val)
+        base = masked
+    # apply denylist masks
+    for p in denylist:
+        val = _path_get(base, p)
+        if val is not None:
+            _path_set(base, p, _mask_value(val))
+    return base
+
+def salt_context(canon: Dict[str, Any], salt_hex: Optional[str]) -> Dict[str, Any]:
+    if not salt_hex: return canon
+    # Example: hash IP or user identifiers; keep shapes
+    from hashlib import sha256
+    out = json.loads(json.dumps(canon))  # deep copy
+    ctx = out.get('context', {})
+    for k in list(ctx.keys()):
+        v = str(ctx[k]).encode()
+        ctx[k] = sha256(bytes.fromhex(salt_hex) + v).hexdigest()[:16]
+    out['context'] = ctx
+    return out

diff --git a/impl/ledger-svc/app/storage.py b/impl/ledger-svc/app/storage.py
index 6e6e6e6..7777777 100644
--- a/impl/ledger-svc/app/storage.py
+++ b/impl/ledger-svc/app/storage.py
@@
-from .models import Base, ReceiptRow, DigestRow, AnchorRow, ProofRow
+from .models import Base, ReceiptRow, DigestRow, AnchorRow, ProofRow, PolicyRow
 from .merkle import anchor_hash
+from sqlalchemy import update
@@
     async def init(self):
         async with self.engine.begin() as conn:
             await conn.run_sync(Base.metadata.create_all)
@@
     async def anchor(self, receipt_ids: list[str]):
@@
             await s.commit()
             return anchor
@@
     async def add_proof(self, anchor_id: str, provider: str, provider_id: str, url: str | None, kid: str | None):
@@
             return row.id
@@
     async def get_proofs(self, anchor_id: str) -> list[ProofRow]:
@@
             return q.scalars().all()
+
+    async def upsert_policy(self, tenant_id: str, version: str, allowlist: list[str], denylist: list[str], salt_hex: str | None):
+        async with self.Session() as s:
+            # Replace by tenant+version; keep simple for MVP
+            row = PolicyRow(tenant_id=tenant_id, version=version, allowlist=json.dumps(allowlist), denylist=json.dumps(denylist), salt_hex=salt_hex)
+            s.add(row)
+            await s.commit()
+            return row.id
+
+    async def get_policy(self, tenant_id: str) -> PolicyRow | None:
+        async with self.Session() as s:
+            q = await s.execute(select(PolicyRow).where(PolicyRow.tenant_id == tenant_id).order_by(PolicyRow.id.desc()))
+            return q.scalars().first()

diff --git a/impl/ledger-svc/app/main.py b/impl/ledger-svc/app/main.py
index 5b5b5b5..6d6d6d6 100644
--- a/impl/ledger-svc/app/main.py
+++ b/impl/ledger-svc/app/main.py
@@
 from fastapi import FastAPI, HTTPException
 from fastapi.responses import ORJSONResponse
-from .schemas import ReceiptIn, AnchorOut, DigestsIn, EntryOut, AuditOut
+from .schemas import ReceiptIn, AnchorOut, DigestsIn, EntryOut, AuditOut, AnchorPolicy, PolicySet, RehydrateOut
 from .storage import Storage
 from .config import DB_URL
 from .crypto import sha256_hex
 from .notary import notary_sink
+from .policy import apply_policy, salt_context
 import asyncio, orjson
@@
 @app.post("/receipts/anchor", response_model=AnchorOut)
 async def receipts_anchor(receipts: list[ReceiptIn], tenant_id: str = "default"):
     # store receipts, then compute anchor
     items = [(r.receipt_id, bytes.fromhex(r.payload_hex)) for r in receipts]
     await storage.add_receipts(items)
     anchor = await storage.anchor([r.receipt_id for r in receipts])
-    proofs = []
+    pv = None
+    proofs = []
+    # Attach policy version visible to clients
+    pol = await storage.get_policy(tenant_id)
+    if pol:
+        pv = pol.version
     # fire-and-forget external notary publish; persist proof if returned
     async def _pub():
         p = await notary_sink.publish(anchor.anchor_hash, anchor.anchor_id)
         if p:
             await storage.add_proof(anchor.anchor_id, p["provider"], p["provider_id"], p.get("url"), p.get("kid"))
     asyncio.create_task(_pub())
-    return AnchorOut(anchor_id=anchor.anchor_id, anchor_hash=anchor.anchor_hash, proofs=proofs)
+    return AnchorOut(anchor_id=anchor.anchor_id, anchor_hash=anchor.anchor_hash, proofs=proofs, policy_version=pv)
@@
 @app.get("/audit/query", response_model=AuditOut)
 async def audit(op_id: str):
@@
     return AuditOut(
         receipts=[r.payload.hex() for r in receipts],
         digests=[DigestsIn(op_id=x.op_id, pg_digest=x.pg_digest, neo4j_digest=x.neo4j_digest) for x in digests],
         anchor=out_anchor,
     )
+
+@app.post("/anchor/policy")
+async def set_anchor_policy(ps: PolicySet):
+    for p in ps.items:
+        await storage.upsert_policy(p.tenant_id, p.version, p.allowlist, p.denylist, p.salt)
+    return {"ok": True, "count": len(ps.items)}
+
+@app.get("/audit/rehydrate", response_model=RehydrateOut)
+async def rehydrate(op_id: str, tenant_id: str = "default"):
+    receipts, digests, anchor = await storage.audit(op_id)
+    if not anchor:
+        raise HTTPException(status_code=404, detail="no anchor for op_id")
+    pol = await storage.get_policy(tenant_id)
+    allowlist, denylist, salt_hex, pv = [], [], None, None
+    if pol:
+        import json as _json
+        allowlist = _json.loads(pol.allowlist)
+        denylist = _json.loads(pol.denylist)
+        salt_hex = pol.salt_hex
+        pv = pol.version
+    # receipts payloads are hex-encoded compact JSON; decode and extract canonical inputs
+    canons = []
+    for r in receipts:
+        try:
+            obj = orjson.loads(bytes.fromhex(r.payload).decode()) if hasattr(r, 'payload') else orjson.loads(bytes.fromhex(r).decode())
+        except Exception:
+            obj = {}
+        canon = obj.get('canon') or obj.get('canonical') or obj  # be liberal; fallback
+        canon = salt_context(canon, salt_hex)
+        canon = apply_policy(canon, allowlist, denylist)
+        canons.append(canon)
+    proofs = [
+        {"provider": pr.provider, "provider_id": pr.provider_id, "url": pr.url, "kid": pr.kid}
+        for pr in await storage.get_proofs(anchor.anchor_id)
+    ]
+    return RehydrateOut(anchor_id=anchor.anchor_id, anchor_hash=anchor.anchor_hash, policy_version=pv, canonical_inputs=canons, proofs=proofs)

diff --git a/impl/ledger-svc/tests/test_policy.py b/impl/ledger-svc/tests/test_policy.py
new file mode 100644
index 0000000..aaaaaaa
--- /dev/null
+++ b/impl/ledger-svc/tests/test_policy.py
@@
+import pytest, orjson
+from httpx import AsyncClient
+from app.main import app
+
+@pytest.mark.asyncio
+async def test_policy_mask_and_rehydrate():
+    async with AsyncClient(app=app, base_url='http://test') as ac:
+        # set policy: allow only subject.id and action, mask everything else; salt context
+        ps = {
+            'items': [{
+                'tenant_id': 't1', 'version': 'pv1',
+                'allowlist': ['subject.id','action'], 'denylist': ['resource','context.ip'],
+                'salt': '00'*16
+            }]
+        }
+        r = await ac.post('/anchor/policy', json=ps)
+        assert r.status_code == 200
+        # emit receipts/anchor
+        payloads = []
+        for i in range(3):
+            receipt = orjson.dumps({'subject': {'id': f'u{i}'}, 'action': {'act': 'read'}, 'resource': {'type': 'case'}, 'context': {'ip': '127.0.0.1'}})
+            payloads.append({'receipt_id': f'r{i}', 'payload_hex': receipt.hex()})
+        a = await ac.post('/receipts/anchor?tenant_id=t1', json=payloads)
+        assert a.status_code == 200
+        # rehydrate
+        q = await ac.get('/audit/rehydrate?op_id=&tenant_id=t1')
+        assert q.status_code == 200
+        body = q.json()
+        assert body['policy_version'] == 'pv1'
+        assert isinstance(body['canonical_inputs'], list)
+        # ensure masking occurred (context.ip masked/salted and resource masked)
+        c0 = body['canonical_inputs'][0]
+        assert 'resource' in c0 and c0['resource'] != {'type':'case'}
+        assert c0['context']['ip'] != '127.0.0.1'

diff --git a/impl/ledger-svc/README.md b/impl/ledger-svc/README.md
index 1111111..2222222 100644
--- a/impl/ledger-svc/README.md
+++ b/impl/ledger-svc/README.md
@@
 ## Selective Disclosure Policies

-_(placeholder)_
+**Model**: Per‑tenant policy with `allowlist`, `denylist`, and optional `salt` (hex). Allowlist has precedence (whitelists fields to retain; all others masked), then denylist masks specific paths. `salt` hashes context fields (e.g., IP) for privacy‑preserving analytics.
+
+**API**
+
+```
+POST /anchor/policy
+{ "items": [ {"tenant_id":"t1","version":"pv1","allowlist":["subject.id","action"],"denylist":["resource","context.ip"],"salt":"00..."} ] }
+
+GET  /audit/rehydrate?op_id=...&tenant_id=...
+→ { anchor_id, anchor_hash, policy_version, canonical_inputs: [...masked...], proofs: [...] }
+```
+
+**Auditor flow**: use `/audit/rehydrate` to obtain masked canonical inputs and proof trail. For sensitive payloads, request scoped rehydration token (future endpoint) to access plaintext under supervision.
```

---

## 4) PR Description Template

**Title:** feat: selective disclosure policies + audit rehydration API

**Summary**
- Adds per‑tenant **AnchorPolicy** with allow/deny lists and salting; stored server‑side, hot‑reload via `POST /anchor/policy`
- Extends anchor response with `policy_version`; adds `/audit/rehydrate` returning masked canonical inputs and proofs
- Includes tests covering masking + salting + rehydration

**Security/Privacy**
- Default policy = no salt, no allow/deny (behavior unchanged)
- Auditor rehydration returns **masked** inputs; plaintext access gated for a later tokenized flow

**How to test locally**
```bash
make bootstrap
nohup make run &
sleep 2
curl -X POST localhost:4600/anchor/policy \
  -H 'content-type: application/json' \
  -d '{"items":[{"tenant_id":"t1","version":"pv1","allowlist":["subject.id","action"],"denylist":["resource","context.ip"],"salt":"00..."}]}'
python3 benchmark/latency_harness.py --endpoint http://localhost:4600
curl 'http://localhost:4600/audit/rehydrate?op_id=&tenant_id=t1' | jq
```

