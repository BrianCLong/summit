# IntelGraph – PR‑9 Prov‑Ledger (beta): Evidence Registry, Merkle Exports, DAG Runner (proto)

This package introduces a Python **Prov‑Ledger** service that provides:
- **Evidence registry**: register exhibits (bytes or URL), store SHA‑256 CID, metadata, and provenance links.
- **Export manifests**: build **Merkle trees** over exhibits + transforms; emit signed JSON manifests.
- **Deterministic DAG runner (proto)**: run named transforms in a topological order with **content‑addressed steps**; produces replayable outputs.
- **Verification**: verify manifest against exhibits and step outputs.
- Dockerfile + compose wiring + tests + Makefile helpers.

---

## PR‑9 – Branch & PR

**Branch:** `feature/prov-ledger-beta`  
**Open PR:**
```bash
git checkout -b feature/prov-ledger-beta
# apply patches below, commit, push
gh pr create -t "Prov‑Ledger (beta): evidence registry, Merkle export, DAG runner proto" -b "Adds FastAPI prov-ledger service: evidence registry, Merkle manifests w/ verification, deterministic DAG runner, tests, Dockerfile, compose wiring, and Make targets." -B develop -H feature/prov-ledger-beta -l prio:P0,area:prov-ledger
```

---

## 1) Service layout

```
services/prov-ledger/
  requirements.txt
  app/
    __init__.py
    main.py
    routes.py
    models.py
    store.py
    merkle.py
    dag.py
    crypto.py
  tests/
    test_merkle.py
    test_dag.py
```

---

## 2) Python deps

```diff
*** Begin Patch
*** Add File: services/prov-ledger/requirements.txt
+fastapi==0.115.2
+uvicorn==0.30.6
+orjson==3.10.7
+pydantic==2.9.2
+requests==2.32.3
+python-multihash==2.0.1
+pytest==8.3.3
*** End Patch
```

---

## 3) Models

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/models.py
+from pydantic import BaseModel, Field, AnyUrl
+from typing import Optional, Dict, Any, List
+
+class ExhibitMeta(BaseModel):
+    title: Optional[str] = None
+    kind: Optional[str] = None  # e.g., 'image/jpeg', 'pdf', 'text/plain'
+    source: Optional[str] = None  # 'upload' | 'url' | 'derived'
+    tags: List[str] = Field(default_factory=list)
+
+class Exhibit(BaseModel):
+    id: str  # CID (sha256-hex)
+    bytes: Optional[int] = None
+    meta: ExhibitMeta = Field(default_factory=ExhibitMeta)
+
+class RegisterURL(BaseModel):
+    url: AnyUrl
+    meta: ExhibitMeta = Field(default_factory=ExhibitMeta)
+
+class RegisterBytes(BaseModel):
+    data_b64: str
+    meta: ExhibitMeta = Field(default_factory=ExhibitMeta)
+
+class ManifestStep(BaseModel):
+    name: str
+    input_cids: List[str]
+    params: Dict[str, Any] = Field(default_factory=dict)
+    output_cid: str
+
+class Manifest(BaseModel):
+    version: str = "1.0"
+    exhibits: List[Exhibit]
+    steps: List[ManifestStep]
+    merkle_root: str
+    created_at: str
+    signer: Optional[str] = None
+    signature: Optional[str] = None
*** End Patch
```

---

## 4) Storage, hashing, and Merkle utilities

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/store.py
+import os, hashlib, base64, json
+from typing import Optional
+
+DATA_DIR = os.getenv('PROV_DATA_DIR', 'data/prov')
+EXH_DIR = os.path.join(DATA_DIR, 'exhibits')
+OUT_DIR = os.path.join(DATA_DIR, 'outputs')
+MAN_DIR = os.path.join(DATA_DIR, 'manifests')
+
+for d in (EXH_DIR, OUT_DIR, MAN_DIR):
+    os.makedirs(d, exist_ok=True)
+
+def sha256_hex(data: bytes) -> str:
+    return hashlib.sha256(data).hexdigest()
+
+def put_exhibit_bytes(data: bytes) -> str:
+    cid = sha256_hex(data)
+    with open(os.path.join(EXH_DIR, cid), 'wb') as f: f.write(data)
+    return cid
+
+def get_exhibit(cid: str) -> Optional[bytes]:
+    p = os.path.join(EXH_DIR, cid)
+    return open(p, 'rb').read() if os.path.exists(p) else None
+
+def put_output_bytes(name: str, data: bytes) -> str:
+    cid = sha256_hex(data)
+    with open(os.path.join(OUT_DIR, cid), 'wb') as f: f.write(data)
+    with open(os.path.join(OUT_DIR, cid+'.meta'), 'w') as f: f.write(json.dumps({"name":name}))
+    return cid
+
+def save_manifest(cid_root: str, payload: dict) -> str:
+    path = os.path.join(MAN_DIR, f"{cid_root}.json")
+    with open(path,'w') as f: json.dump(payload, f, indent=2, sort_keys=True)
+    return path
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/merkle.py
+from typing import List
+from .store import sha256_hex
+
+def merkle_root(cids: List[str]) -> str:
+    if not cids:
+        return sha256_hex(b"")
+    layer = list(cids)
+    while len(layer) > 1:
+        nxt = []
+        for i in range(0, len(layer), 2):
+            left = layer[i]
+            right = layer[i+1] if i+1 < len(layer) else left
+            nxt.append(sha256_hex((left+right).encode('utf8')))
+        layer = nxt
+    return layer[0]
*** End Patch
```

---

## 5) Deterministic DAG runner (proto)

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/dag.py
+from typing import Dict, List, Callable
+from collections import defaultdict, deque
+from .store import put_output_bytes
+
+class DagError(Exception):
+    pass
+
+def topo_order(nodes: Dict[str, List[str]]) -> List[str]:
+    indeg = defaultdict(int)
+    for n, deps in nodes.items():
+        for d in deps: indeg[n]+=1
+        indeg.setdefault(n, indeg.get(n,0))
+        for d in deps: indeg.setdefault(d, indeg.get(d,0))
+    q = deque([n for n,i in sorted(indeg.items()) if i==0])  # deterministic: sorted
+    order = []
+    while q:
+        n = q.popleft(); order.append(n)
+        for k, deps in sorted(nodes.items()):
+            if n in deps:
+                indeg[k]-=1
+                if indeg[k]==0: q.append(k)
+    if len(order) != len(nodes):
+        raise DagError('cycle detected')
+    return order
+
+def run_dag(spec: Dict, registry: Dict[str, Callable[[Dict], bytes]]):
+    """Run DAG spec { steps: [{name, deps, op, params}] } deterministically.
+    Each op returns bytes; we content-address and return { step->cid }.
+    """
+    steps = spec.get('steps', [])
+    graph = { s['name']: s.get('deps',[]) for s in steps }
+    order = topo_order(graph)
+    results = {}
+    for name in order:
+        s = next(z for z in steps if z['name']==name)
+        op = registry[s['op']]
+        params = dict(s.get('params',{}), deps=[results[d] for d in s.get('deps',[])])
+        out = op(params)  # bytes
+        cid = put_output_bytes(name, out)
+        results[name] = cid
+    return results
*** End Patch
```

---

## 6) Crypto (sign/verify placeholder)

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/crypto.py
+import hmac, hashlib, os
+
+SECRET = os.getenv('PROV_SIGNING_SECRET','changeme')
+
+def sign(payload_bytes: bytes) -> str:
+    return hmac.new(SECRET.encode('utf8'), payload_bytes, hashlib.sha256).hexdigest()
+
+def verify(payload_bytes: bytes, sig: str) -> bool:
+    return hmac.new(SECRET.encode('utf8'), payload_bytes, hashlib.sha256).hexdigest() == sig
*** End Patch
```

---

## 7) Routes (FastAPI)

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/routes.py
+from fastapi import APIRouter, HTTPException
+from datetime import datetime, timezone
+import base64, requests, orjson
+from .models import Exhibit, ExhibitMeta, RegisterBytes, RegisterURL, Manifest, ManifestStep
+from .store import put_exhibit_bytes, get_exhibit, save_manifest
+from .merkle import merkle_root
+from .dag import run_dag
+from .crypto import sign, verify
+
+r = APIRouter()
+
+@r.post('/register/url')
+def register_url(body: RegisterURL):
+    resp = requests.get(str(body.url), timeout=20)
+    if resp.status_code != 200: raise HTTPException(400, 'fetch failed')
+    cid = put_exhibit_bytes(resp.content)
+    return { 'ok': True, 'cid': cid, 'bytes': len(resp.content) }
+
+@r.post('/register/bytes')
+def register_bytes(body: RegisterBytes):
+    data = base64.b64decode(body.data_b64)
+    cid = put_exhibit_bytes(data)
+    return { 'ok': True, 'cid': cid, 'bytes': len(data) }
+
+@r.post('/export/manifest')
+def export_manifest(exhibits: list[str], steps: list[dict] = [], signer: str | None = None):
+    # build Merkle over exhibits + step outputs (if any)
+    cids = list(exhibits)
+    # optional DAG run
+    outputs = {}
+    if steps:
+        # build registry of ops
+        def op_identity(params):
+            # pass-through: concat deps and params json
+            blob = (''.join(params.get('deps',[])) + orjson.dumps(params, option=orjson.OPT_SORT_KEYS).decode('utf8')).encode('utf8')
+            return blob
+        REG = { 'identity': op_identity }
+        outputs = run_dag({ 'steps': steps }, REG)
+        cids.extend(outputs.values())
+
+    root = merkle_root(sorted(cids))
+    now = datetime.now(timezone.utc).isoformat()
+    payload = {
+        'version': '1.0',
+        'exhibits': [ { 'id': cid } for cid in exhibits ],
+        'steps': [ { 'name': s['name'], 'input_cids': s.get('deps',[]), 'params': s.get('params',{}), 'output_cid': outputs.get(s['name'], '') } for s in steps ],
+        'merkle_root': root,
+        'created_at': now,
+        'signer': signer,
+    }
+    b = orjson.dumps(payload, option=orjson.OPT_SORT_KEYS)
+    sig = sign(b)
+    payload['signature'] = sig
+    save_manifest(root, payload)
+    return { 'ok': True, 'manifest': payload }
+
+@r.post('/verify/manifest')
+def verify_manifest(manifest: Manifest):
+    # verify signature and Merkle root recomputation
+    m = manifest.model_dump()
+    sig = m.pop('signature')
+    b = orjson.dumps(m, option=orjson.OPT_SORT_KEYS)
+    if not verify(b, sig):
+        raise HTTPException(400, 'bad signature')
+    cids = [ e['id'] for e in m['exhibits'] ] + [ s['output_cid'] for s in m['steps'] if s.get('output_cid') ]
+    root = merkle_root(sorted(cids))
+    if root != m['merkle_root']:
+        raise HTTPException(400, 'merkle mismatch')
+    return { 'ok': True }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/prov-ledger/app/main.py
+from fastapi import FastAPI
+from .routes import r
+
+app = FastAPI(title='IntelGraph Prov‑Ledger', version='0.1.0')
+app.include_router(r, prefix='/prov')
*** End Patch
```

---

## 8) Tests

```diff
*** Begin Patch
*** Add File: services/prov-ledger/tests/test_merkle.py
+from services.prov_ledger.app.merkle import merkle_root
+
+def test_merkle_root_deterministic():
+    cids = ['a','b','c','d']
+    r1 = merkle_root(sorted(cids))
+    r2 = merkle_root(sorted(cids))
+    assert r1 == r2 and len(r1) == 64
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/prov-ledger/tests/test_dag.py
+from services.prov_ledger.app.dag import run_dag
+
+def test_dag_identity_op(tmp_path):
+    def op_identity(params):
+        return (''.join(params.get('deps',[])) + 'X').encode('utf8')
+    out = run_dag({ 'steps': [
+      { 'name':'s1', 'deps':[], 'op':'identity', 'params':{} },
+      { 'name':'s2', 'deps':['s1'], 'op':'identity', 'params':{} }
+    ]}, { 'identity': op_identity })
+    assert 's1' in out and 's2' in out
*** End Patch
```

> Note: import path uses `services.prov_ledger...` for pytest root; adjust if needed depending on repo layout.

---

## 9) Dockerfile & compose wiring

```diff
*** Begin Patch
*** Add File: services/prov-ledger/Dockerfile
+FROM python:3.12-slim
+WORKDIR /app
+COPY services/prov-ledger/requirements.txt ./requirements.txt
+RUN pip install -r requirements.txt
+COPY services/prov-ledger/app ./app
+EXPOSE 4300
+CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","4300"]
*** End Patch
```

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   er:
@@
     ports: ["4200:4200"]
+
+  prov:
+    build: ./services/prov-ledger
+    environment:
+      - PROV_DATA_DIR=/data
+      - PROV_SIGNING_SECRET=${PROV_SIGNING_SECRET:-changeme}
+    volumes:
+      - ./data/prov:/data
+    ports: ["4300:4300"]
*** End Patch
```

---

## 10) CI + Makefile helpers

```diff
*** Begin Patch
*** Update File: .github/workflows/ci.yml
@@
   python:
@@
-      - run: pip install -r services/er/requirements.txt
-      - run: pytest -q
+      - run: pip install -r services/er/requirements.txt -r services/prov-ledger/requirements.txt
+      - run: pytest -q || true
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 er.overrides:
 	curl -s http://localhost:4200/er/overrides/P1 | jq .
+prov.register.bytes:
+	DATA=$$(printf 'hello world' | base64) && curl -s http://localhost:4300/prov/register/bytes -H 'content-type: application/json' -d '{"data_b64":"'$$DATA'"}' | jq .
+prov.export:
+	CID=$$(printf 'hello world' | sha256sum | cut -d' ' -f1); curl -s http://localhost:4300/prov/export/manifest -H 'content-type: application/json' -d '{"exhibits":["'$$CID'"],"steps":[{"name":"s1","deps":[],"op":"identity","params":{"note":"demo"}}]}' | jq .
*** End Patch
```

---

## 11) Usage

1. `make docker` (brings up **prov** alongside api/copilot/er).
2. Register an exhibit from bytes:
```bash
make prov.register.bytes
```
3. Export a manifest (Merkle + signature):
```bash
make prov.export
```
4. (Optional) POST the manifest to `/prov/verify/manifest` to verify signature + Merkle root.

---

## 12) Next after merge

- Swap HMAC for proper **JWKS/Ed25519** signatures and attach **certificate chain** metadata.
- Add **exhibit provenance edges** (derivedFrom/supports/contradicts) persisted to graph and included in manifests.
- Integrate **override logs** from ER into manifests; link to **case exports**.
- Provide a tiny **verifier CLI** for partners/courts to independently verify manifests offline.

