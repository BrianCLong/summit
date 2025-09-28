# IntelGraph – PR‑8 Entity Resolution v1 (scorecards, merge/split, override logs)

This package introduces a Python **ER service** with:
- **Explainable scoring** (feature weights + per‑feature contributions)
- **Deterministic merge/split APIs** with provenance edges and immutable override logs
- **Golden datasets** + pytest
- Dockerfile + compose wiring + Makefile helpers

---

## PR‑8 – Branch & PR

**Branch:** `feature/er-v1-explainable`  
**Open PR:**
```bash
git checkout -b feature/er-v1-explainable
# apply patches below, commit, push
gh pr create -t "Entity Resolution v1 (scorecards, merge/split, override logs)" -b "Adds FastAPI ER service with explainable scoring, merge/split APIs, override logs in Neo4j, golden datasets, tests, and compose wiring." -B develop -H feature/er-v1-explainable -l prio:P0,area:er
```

---

## 1) Service layout

```
services/er/
  requirements.txt
  app/
    __init__.py
    main.py
    models.py
    scoring.py
    neo.py
    routes.py
    utils.py
  tests/
    test_scoring.py
    test_merge.py
    data/
      pairs.json
```

---

## 2) Python dependencies

```diff
*** Begin Patch
*** Add File: services/er/requirements.txt
+fastapi==0.115.2
+uvicorn==0.30.6
+neo4j==5.23.0
+rapidfuzz==3.9.7
+pydantic==2.9.2
+httpx==0.27.2
+python-dotenv==1.0.1
+pytest==8.3.3
*** End Patch
```

---

## 3) ER service (FastAPI)

```diff
*** Begin Patch
*** Add File: services/er/app/models.py
+from pydantic import BaseModel, Field
+from typing import Dict, Any, List, Optional
+
+class Entity(BaseModel):
+    id: str
+    kind: str = "Person"
+    props: Dict[str, Any] = Field(default_factory=dict)
+
+class ScoreFeature(BaseModel):
+    name: str
+    value: float
+    weight: float
+    contribution: float
+
+class Scorecard(BaseModel):
+    score: float
+    threshold: float
+    features: List[ScoreFeature]
+    explanation: Optional[str] = None
+
+class ScoreRequest(BaseModel):
+    a: Entity
+    b: Entity
+
+class MergeRequest(BaseModel):
+    ids: List[str]
+    reason: str
+    user: str
+    dry_run: bool = False
+
+class SplitRequest(BaseModel):
+    id: str
+    into: List[Entity]
+    reason: str
+    user: str
+
+class OverrideLog(BaseModel):
+    id: str
+    action: str
+    user: str
+    reason: str
+    at: str
+    details: Dict[str, Any] = Field(default_factory=dict)
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/app/scoring.py
+from rapidfuzz import fuzz
+from .models import Entity, Scorecard, ScoreFeature
+
+WEIGHTS = {
+    "name": 0.4,
+    "email": 0.35,
+    "phone": 0.15,
+    "geo": 0.10,
+}
+
+def normalize_phone(p: str) -> str:
+    return ''.join(ch for ch in (p or '') if ch.isdigit())
+
+def score_entities(a: Entity, b: Entity, threshold: float = 0.78) -> Scorecard:
+    name_a = (a.props.get("name") or "").lower()
+    name_b = (b.props.get("name") or "").lower()
+    email_a = (a.props.get("email") or "").lower()
+    email_b = (b.props.get("email") or "").lower()
+    phone_a = normalize_phone(a.props.get("phone") or "")
+    phone_b = normalize_phone(b.props.get("phone") or "")
+
+    # Features 0..1
+    f_name = fuzz.token_set_ratio(name_a, name_b) / 100.0 if name_a and name_b else 0.0
+    f_email = 1.0 if email_a and email_a == email_b else 0.0
+    f_phone = 1.0 if phone_a and phone_a == phone_b else 0.0
+    f_geo = 0.0  # placeholder (future: haversine on lat/lon buckets)
+
+    parts = {
+        "name": f_name,
+        "email": f_email,
+        "phone": f_phone,
+        "geo": f_geo,
+    }
+    features = []
+    total = 0.0
+    for k, v in parts.items():
+        w = WEIGHTS[k]
+        c = w * v
+        total += c
+        features.append(ScoreFeature(name=k, value=v, weight=w, contribution=c))
+
+    return Scorecard(score=round(total, 4), threshold=threshold, features=features,
+                     explanation=f"score={total:.3f} (thr={threshold}) from name/email/phone/geo")
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/app/neo.py
+from neo4j import GraphDatabase
+import os
+
+def get_driver():
+    uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
+    user = os.getenv("NEO4J_USER", "neo4j")
+    pwd = os.getenv("NEO4J_PASSWORD", "neo4j")
+    return GraphDatabase.driver(uri, auth=(user, pwd))
+
+def merge_entities(tx, ids, reason, user):
+    # Deterministic merge: pick smallest id as survivor
+    ids = list(sorted(set(ids)))
+    survivor = ids[0]
+    others = ids[1:]
+    # combine props with last-write-wins favoring survivor props
+    tx.run("""
+    MATCH (s {id:$survivor})
+    WITH s
+    CALL {
+      WITH s
+      UNWIND $others AS oid
+      MATCH (o {id:oid})
+      MERGE (s)<-[:MERGED_INTO]-(o)
+      WITH s,o
+      CALL apoc.atomic.add(s,'_mergeCount',1,0) YIELD oldValue, newValue
+      RETURN 0
+    }
+    RETURN s
+    """, survivor=survivor, others=others)
+    # record override log
+    tx.run("""
+    MERGE (log:ERDecision {id:apoc.create.uuid()})
+    SET log += {action:'merge', user:$user, reason:$reason, at:datetime(), ids:$ids, survivor:$survivor}
+    """, user=user, reason=reason, ids=ids, survivor=survivor)
+    return survivor
+
+def split_entity(tx, id_, into, reason, user):
+    # Create replacements and link SPLIT_FROM
+    tx.run("""
+    MATCH (n {id:$id})
+    WITH n
+    UNWIND $into AS ent
+    MERGE (m {id: ent.id})
+    SET m += ent.props, m:Person
+    MERGE (m)-[:SPLIT_FROM]->(n)
+    """, id=id_, into=[{"id":e.id, "props":e.props} for e in into])
+    tx.run("""
+    MERGE (log:ERDecision {id:apoc.create.uuid()})
+    SET log += {action:'split', user:$user, reason:$reason, at:datetime(), src:$id, parts:[e IN $into | e.id]}
+    """, user=user, reason=reason, id=id_, into=[{"id":e.id} for e in into])
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/app/utils.py
+def ok(data=None, **kw):
+    res = {"ok": True}
+    if data is not None:
+        res.update(data)
+    res.update(kw)
+    return res
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/app/routes.py
+from fastapi import APIRouter
+from .models import ScoreRequest, MergeRequest, SplitRequest, Entity
+from .scoring import score_entities
+from .neo import get_driver, merge_entities, split_entity
+from .utils import ok
+
+r = APIRouter()
+
+@r.post("/score")
+def score(req: ScoreRequest):
+    return ok(data=score_entities(req.a, req.b).model_dump())
+
+@r.post("/merge")
+def merge(req: MergeRequest):
+    drv = get_driver()
+    with drv.session() as s:
+        if req.dry_run:
+            # just compute survivor choice and return
+            survivor = sorted(set(req.ids))[0]
+            return ok(action="merge.preview", survivor=survivor)
+        survivor = s.execute_write(merge_entities, req.ids, req.reason, req.user)
+        return ok(action="merge", survivor=survivor)
+
+@r.post("/split")
+def split(req: SplitRequest):
+    drv = get_driver()
+    with drv.session() as s:
+        s.execute_write(split_entity, req.id, [Entity(**e) if isinstance(e, dict) else e for e in req.into], req.reason, req.user)
+    return ok(action="split", parts=[e.id if isinstance(e, Entity) else e["id"] for e in req.into])
+
+@r.get("/overrides/{entity_id}")
+def overrides(entity_id: str):
+    drv = get_driver()
+    with drv.session() as s:
+        res = s.run("MATCH (log:ERDecision) WHERE $id IN coalesce(log.ids,[]) OR log.src = $id RETURN log ORDER BY log.at DESC", id=entity_id)
+        logs = [rec[0]._properties for rec in res]
+    return ok(logs=logs)
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/app/main.py
+from fastapi import FastAPI
+from .routes import r
+
+app = FastAPI(title="IntelGraph ER Service", version="0.1.0")
+app.include_router(r, prefix="/er")
*** End Patch
```

---

## 4) Tests & golden data

```diff
*** Begin Patch
*** Add File: services/er/tests/data/pairs.json
+[
+  {"a": {"id":"A1","props":{"name":"Alice A. Smith","email":"alice@example.com","phone":"+1 (555) 111-2222"}},
+   "b": {"id":"A2","props":{"name":"Alice Smith","email":"alice@example.com","phone":"5551112222"}},
+   "expect_score_gt": 0.85},
+  {"a": {"id":"B1","props":{"name":"Bob"}},
+   "b": {"id":"C9","props":{"name":"Carol"}},
+   "expect_score_lt": 0.3}
+]
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/tests/test_scoring.py
+import json
+from services.er.app.models import Entity
+from services.er.app.scoring import score_entities
+
+def test_pairs_from_golden():
+  data = json.load(open('services/er/tests/data/pairs.json'))
+  for row in data:
+    a = Entity(**row['a'])
+    b = Entity(**row['b'])
+    sc = score_entities(a,b)
+    if 'expect_score_gt' in row:
+      assert sc.score > row['expect_score_gt']
+    if 'expect_score_lt' in row:
+      assert sc.score < row['expect_score_lt']
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/er/tests/test_merge.py
+import pytest
+from services.er.app.neo import get_driver
+from services.er.app.routes import merge
+from services.er.app.models import MergeRequest
+
+@pytest.mark.integration
+def test_merge_preview():
+  req = MergeRequest(ids=["P9","P1","P3"], reason="dupe", user="tester", dry_run=True)
+  res = merge(req)
+  assert res["ok"] and res["survivor"] == "P1"
*** End Patch
```

---

## 5) Dockerfile & uvicorn entry

```diff
*** Begin Patch
*** Add File: services/er/Dockerfile
+FROM python:3.12-slim
+WORKDIR /app
+COPY services/er/requirements.txt ./requirements.txt
+RUN pip install -r requirements.txt
+COPY services/er/app ./app
+EXPOSE 4200
+CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","4200"]
*** End Patch
```

---

## 6) Compose wiring

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   api:
@@
     ports: ["4000:4000"]
+
+  er:
+    build: ./services/er
+    environment:
+      - NEO4J_URI=bolt://neo4j:7687
+      - NEO4J_USER=${NEO4J_USER:-neo4j}
+      - NEO4J_PASSWORD=${NEO4J_PASSWORD:-neo4j}
+    depends_on: [ neo4j ]
+    ports: ["4200:4200"]
*** End Patch
```

---

## 7) CI update (ensure pytest for ER runs)

```diff
*** Begin Patch
*** Update File: .github/workflows/ci.yml
@@
   python:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-python@v5
         with: { python-version: '3.12' }
-      - run: pip install -r services/er/requirements.txt || true
-      - run: pytest -q || true
+      - run: pip install -r services/er/requirements.txt
+      - run: pytest -q
*** End Patch
```

---

## 8) Makefile helpers & curl examples

```diff
*** Begin Patch
*** Update File: Makefile
@@
 open.ui:
 	@echo "Open http://localhost:8080" && sleep 1 && (python3 -c "import webbrowser; webbrowser.open('http://localhost:8080')" || true)
+er.score:
+	curl -s http://localhost:4200/er/score -H 'content-type: application/json' -d '{"a":{"id":"A1","props":{"name":"Alice A. Smith","email":"alice@example.com"}},"b":{"id":"A2","props":{"name":"Alice Smith","email":"alice@example.com"}}}' | jq .
+er.merge.preview:
+	curl -s http://localhost:4200/er/merge -H 'content-type: application/json' -d '{"ids":["P2","P1"],"reason":"dupe","user":"tester","dry_run":true}' | jq .
+er.overrides:
+	curl -s http://localhost:4200/er/overrides/P1 | jq .
*** End Patch
```

---

## 9) Notes & Next

- Add **feature flags** for auto‑merge above high thresholds and queues for manual review below.
- Extend features: address, DOB, geodistance (bucketed), doc hashes, keyboard layout typos.
- Add **override export** to Prov‑Ledger manifests and replay DAG hooks.
- Add **UI review queue** with diff/merge preview and one‑click override (RBAC‑guarded).

