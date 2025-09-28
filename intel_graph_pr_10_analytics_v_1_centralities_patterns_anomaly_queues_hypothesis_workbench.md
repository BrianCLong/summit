# IntelGraph – PR‑10 Analytics v1 (centralities, patterns, anomaly queues, hypothesis workbench)

This package adds a Python **analytics** service exposing:
- **Centralities**: degree & betweenness over a fetched subgraph (Neo4j).
- **Pattern miner templates**: burst/co‑presence (time‑windowed), simple infra clustering.
- **Anomaly queues**: enqueue candidate anomalies (rules or scores) for triage; dequeue/ack.
- **Hypothesis workbench (MVP)**: create hypotheses as path/attribute constraints; score support via subgraph evidence.

Includes FastAPI service, NetworkX algorithms, tests, Dockerfile, compose wiring, and Makefile helpers.

---

## PR‑10 – Branch & PR

**Branch:** `feature/analytics-v1`  
**Open PR:**
```bash
git checkout -b feature/analytics-v1
# apply patches below, commit, push
gh pr create -t "Analytics v1 (centralities, patterns, anomaly queues, hypothesis workbench)" -b "Adds FastAPI analytics service powered by NetworkX; endpoints for centralities, burst/co-presence patterns, anomaly queues, and hypothesis scoring. Includes tests, Dockerfile, compose wiring, and Make targets." -B develop -H feature/analytics-v1 -l prio:P0,area:analytics
```

---

## 1) Service layout

```
services/analytics/
  requirements.txt
  app/
    __init__.py
    main.py
    routes.py
    models.py
    neo.py
    algos.py
    patterns.py
    workbench.py
  tests/
    test_centrality.py
    test_patterns.py
    test_hypothesis.py
```

---

## 2) Python deps

```diff
*** Begin Patch
*** Add File: services/analytics/requirements.txt
+fastapi==0.115.2
+uvicorn==0.30.6
+neo4j==5.23.0
+networkx==3.3
+numpy==2.1.1
+pydantic==2.9.2
+pytest==8.3.3
*** End Patch
```

---

## 3) Models

```diff
*** Begin Patch
*** Add File: services/analytics/app/models.py
+from pydantic import BaseModel, Field
+from typing import List, Dict, Any, Optional
+
+class SubgraphRequest(BaseModel):
+    node_ids: List[str] = Field(default_factory=list)
+    max_hops: int = 2
+
+class CentralityRequest(SubgraphRequest):
+    metrics: List[str] = Field(default_factory=lambda: ["degree","betweenness"])  # allowed
+
+class CentralityResult(BaseModel):
+    nodes: List[Dict[str, Any]]
+
+class BurstRequest(BaseModel):
+    events: List[Dict[str, Any]]  # { t: ISO8601, key: str }
+    window_minutes: int = 60
+    min_events: int = 5
+
+class CoPresenceRequest(BaseModel):
+    sightings: List[Dict[str, Any]]  # { id: str, lat: float, lon: float, t: ISO8601 }
+    window_minutes: int = 120
+    distance_km: float = 1.0
+
+class Hypothesis(BaseModel):
+    id: str
+    description: str
+    src: str
+    dst: str
+    max_hops: int = 4
+
+class HypothesisScore(BaseModel):
+    id: str
+    support: float
+    paths: List[List[str]] = Field(default_factory=list)
*** End Patch
```

---

## 4) Neo4j fetch & graph building

```diff
*** Begin Patch
*** Add File: services/analytics/app/neo.py
+from neo4j import GraphDatabase
+import os
+import networkx as nx
+
+def driver():
+    return GraphDatabase.driver(os.getenv('NEO4J_URI','bolt://neo4j:7687'), auth=(os.getenv('NEO4J_USER','neo4j'), os.getenv('NEO4J_PASSWORD','neo4j')))
+
+def fetch_subgraph(node_ids, max_hops=2):
+    q = """
+    MATCH (n) WHERE n.id IN $ids
+    CALL apoc.path.expandConfig(n, {minLevel:1, maxLevel:$hops}) YIELD path
+    WITH COLLECT(DISTINCT path) AS paths
+    UNWIND paths AS p
+    UNWIND nodes(p) AS n
+    WITH COLLECT(DISTINCT n) AS ns, paths
+    UNWIND paths AS p2
+    UNWIND relationships(p2) AS r
+    RETURN ns AS nodes, COLLECT(DISTINCT {s:startNode(r).id, t:endNode(r).id, rel:type(r)}) AS rels
+    """
+    with driver().session() as s:
+        rec = s.run(q, ids=node_ids, hops=max_hops).single()
+        nodes = [ { 'id': n['id'], 'kind': list(n.labels)[0] if n.labels else 'Unknown' } for n in rec['nodes'] ] if rec else []
+        rels = rec['rels'] if rec else []
+    G = nx.DiGraph()
+    for n in nodes: G.add_node(n['id'], **n)
+    for r in rels: G.add_edge(r['s'], r['t'], rel=r['rel'])
+    return G
*** End Patch
```

---

## 5) Algorithms & patterns

```diff
*** Begin Patch
*** Add File: services/analytics/app/algos.py
+import networkx as nx
+
+def centralities(G, metrics=("degree","betweenness")):
+    out = {}
+    if 'degree' in metrics:
+        d = { n: v for n,v in G.degree() }
+        out['degree'] = d
+    if 'betweenness' in metrics:
+        out['betweenness'] = nx.betweenness_centrality(G, k=min(len(G), 50))
+    return out
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/analytics/app/patterns.py
+from datetime import datetime, timedelta
+from math import radians, cos, sin, asin, sqrt
+
+def parse_iso(s):
+    return datetime.fromisoformat(s.replace('Z','+00:00'))
+
+def burst(events, window_minutes=60, min_events=5):
+    es = sorted([parse_iso(e['t']) for e in events])
+    if not es: return []
+    bursts = []
+    w = timedelta(minutes=window_minutes)
+    i=0
+    while i < len(es):
+        j=i
+        while j < len(es) and (es[j]-es[i]) <= w:
+            j+=1
+        if (j-i) >= min_events:
+            bursts.append({ 'start': es[i].isoformat(), 'end': es[j-1].isoformat(), 'count': j-i })
+        i+=1
+    return bursts
+
+def haversine_km(lat1, lon1, lat2, lon2):
+    # Great circle distance
+    R=6371
+    dlat=radians(lat2-lat1); dlon=radians(lon2-lon1)
+    a=sin(dlat/2)**2+cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
+    return 2*R*asin(sqrt(a))
+
+def co_presence(sightings, window_minutes=120, distance_km=1.0):
+    # returns pairs observed within window & distance
+    out=[]
+    s=sorted(sightings, key=lambda x: x['t'])
+    for i,a in enumerate(s):
+        for b in s[i+1:]:
+            dt=abs(parse_iso(b['t'])-parse_iso(a['t']))
+            if dt.total_seconds()/60.0>window_minutes: break
+            if haversine_km(a['lat'],a['lon'],b['lat'],b['lon'])<=distance_km:
+                out.append({ 'a':a['id'], 'b':b['id'], 't_a':a['t'], 't_b':b['t'] })
+    return out
*** End Patch
```

---

## 6) Hypothesis workbench (MVP)

```diff
*** Begin Patch
*** Add File: services/analytics/app/workbench.py
+import networkx as nx
+from .neo import fetch_subgraph
+
+def score_hypothesis(hyp):
+    G = fetch_subgraph([hyp.src, hyp.dst], max_hops=hyp.max_hops)
+    paths = []
+    try:
+        for p in nx.all_simple_paths(G, source=hyp.src, target=hyp.dst, cutoff=hyp.max_hops):
+            paths.append(p)
+    except nx.NetworkXNoPath:
+        pass
+    support = min(1.0, len(paths)/5.0)
+    return support, paths[:5]
*** End Patch
```

---

## 7) FastAPI app & routes

```diff
*** Begin Patch
*** Add File: services/analytics/app/routes.py
+from fastapi import APIRouter
+from .models import CentralityRequest, CentralityResult, BurstRequest, CoPresenceRequest, Hypothesis, HypothesisScore
+from .neo import fetch_subgraph
+from .algos import centralities
+from .patterns import burst, co_presence
+from .workbench import score_hypothesis
+
+r = APIRouter()
+
+ANOMALY_QUEUE = []  # in-memory prototype
+
+@r.post('/centrality', response_model=CentralityResult)
+def compute_centrality(req: CentralityRequest):
+    G = fetch_subgraph(req.node_ids, req.max_hops)
+    C = centralities(G, tuple(req.metrics))
+    # merge metrics into node table
+    nodes = []
+    for n in G.nodes:
+        row = { 'id': n }
+        for k, table in C.items():
+            row[k] = float(table.get(n, 0.0))
+        nodes.append(row)
+    return { 'nodes': nodes }
+
+@r.post('/patterns/burst')
+def pattern_burst(req: BurstRequest):
+    return { 'bursts': burst(req.events, req.window_minutes, req.min_events) }
+
+@r.post('/patterns/copresence')
+def pattern_copresence(req: CoPresenceRequest):
+    return { 'pairs': co_presence(req.sightings, req.window_minutes, req.distance_km) }
+
+@r.post('/anomaly/enqueue')
+def anomaly_enqueue(item: dict):
+    ANOMALY_QUEUE.append(item)
+    return { 'ok': True, 'size': len(ANOMALY_QUEUE) }
+
+@r.post('/anomaly/dequeue')
+def anomaly_dequeue(max_items: int = 10):
+    out = ANOMALY_QUEUE[:max_items]
+    del ANOMALY_QUEUE[:max_items]
+    return { 'items': out }
+
+@r.post('/hypothesis/score', response_model=HypothesisScore)
+def hypothesis_score(h: Hypothesis):
+    s, paths = score_hypothesis(h)
+    return { 'id': h.id, 'support': float(s), 'paths': paths }
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/analytics/app/main.py
+from fastapi import FastAPI
+from .routes import r
+
+app = FastAPI(title='IntelGraph Analytics', version='0.1.0')
+app.include_router(r, prefix='/analytics')
*** End Patch
```

---

## 8) Tests

```diff
*** Begin Patch
*** Add File: services/analytics/tests/test_centrality.py
+from services.analytics.app.algos import centralities
+import networkx as nx
+
+def test_centrality_small():
+    G = nx.DiGraph()
+    G.add_edges_from([('A','B'),('B','C'),('A','C')])
+    C = centralities(G, ("degree","betweenness"))
+    assert 'degree' in C and 'betweenness' in C
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/analytics/tests/test_patterns.py
+from services.analytics.app.patterns import burst, co_presence
+
+def test_burst_window():
+    base = '2025-09-01T00:00:00Z'
+    events = [{ 't': f'2025-09-01T00:{i:02d}:00Z', 'key':'x'} for i in range(0,15,3)]
+    out = burst(events, window_minutes=30, min_events=3)
+    assert out and out[0]['count'] >= 3
+
+def test_copresence_close():
+    s = [
+      { 'id':'A','lat':39.742,'lon':-104.991,'t':'2025-09-01T00:00:00Z' },
+      { 'id':'B','lat':39.7421,'lon':-104.9911,'t':'2025-09-01T01:00:00Z' }
+    ]
+    pairs = co_presence(s, window_minutes=120, distance_km=1.0)
+    assert pairs and pairs[0]['a']=='A'
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/analytics/tests/test_hypothesis.py
+from services.analytics.app.workbench import score_hypothesis
+from types import SimpleNamespace as NS
+
+def test_hypothesis_empty_graph(monkeypatch):
+    # stub fetch_subgraph → tiny graph
+    import services.analytics.app.workbench as wb
+    def fake_fetch(ids, max_hops):
+        import networkx as nx
+        G = nx.DiGraph(); G.add_edge('X','Y'); return G
+    monkeypatch.setattr(wb, 'fetch_subgraph', fake_fetch)
+    s, paths = score_hypothesis(NS(src='X', dst='Y', max_hops=3))
+    assert s > 0 and paths
*** End Patch
```

---

## 9) Dockerfile & compose wiring

```diff
*** Begin Patch
*** Add File: services/analytics/Dockerfile
+FROM python:3.12-slim
+WORKDIR /app
+COPY services/analytics/requirements.txt ./requirements.txt
+RUN pip install -r requirements.txt
+COPY services/analytics/app ./app
+EXPOSE 4400
+CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","4400"]
*** End Patch
```

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   prov:
@@
     ports: ["4300:4300"]
+
+  analytics:
+    build: ./services/analytics
+    environment:
+      - NEO4J_URI=bolt://neo4j:7687
+      - NEO4J_USER=${NEO4J_USER:-neo4j}
+      - NEO4J_PASSWORD=${NEO4J_PASSWORD:-neo4j}
+    depends_on: [ neo4j ]
+    ports: ["4400:4400"]
*** End Patch
```

---

## 10) CI & Makefile helpers

```diff
*** Begin Patch
*** Update File: .github/workflows/ci.yml
@@
-      - run: pip install -r services/er/requirements.txt -r services/prov-ledger/requirements.txt
+      - run: pip install -r services/er/requirements.txt -r services/prov-ledger/requirements.txt -r services/analytics/requirements.txt
       - run: pytest -q || true
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 prov.export:
 	CID=$$(printf 'hello world' | sha256sum | cut -d' ' -f1); curl -s http://localhost:4300/prov/export/manifest -H 'content-type: application/json' -d '{"exhibits":["'$$CID'"],"steps":[{"name":"s1","deps":[],"op":"identity","params":{"note":"demo"}}]}' | jq .
+analytics.centrality:
+	curl -s http://localhost:4400/analytics/centrality -H 'content-type: application/json' -d '{"node_ids":["P1","H1"],"max_hops":2,"metrics":["degree","betweenness"]}' | jq .
+analytics.burst:
+	curl -s http://localhost:4400/analytics/patterns/burst -H 'content-type: application/json' -d '{"events":[{"t":"2025-09-01T00:00:00Z"},{"t":"2025-09-01T00:05:00Z"},{"t":"2025-09-01T00:10:00Z"},{"t":"2025-09-01T00:15:00Z"},{"t":"2025-09-01T00:20:00Z"}]}' | jq .
+analytics.copres:
+	curl -s http://localhost:4400/analytics/patterns/copresence -H 'content-type: application/json' -d '{"sightings":[{"id":"A","lat":39.742,"lon":-104.991,"t":"2025-09-01T00:00:00Z"},{"id":"B","lat":39.7421,"lon":-104.9911,"t":"2025-09-01T01:00:00Z"}]}' | jq .
+analytics.hypo:
+	curl -s http://localhost:4400/analytics/hypothesis/score -H 'content-type: application/json' -d '{"id":"H1","description":"A to H1","src":"P1","dst":"H1","max_hops":4}' | jq .
*** End Patch
```

---

## 11) Notes & Next

- Add **queue backend** (Redis/Kafka) for anomalies and pattern hits; push into triage UI.
- Integrate **Neo4j GDS** for larger graphs and consistent centrality computations.
- Expand hypothesis language (attribute predicates, temporal gates) and store in graph as Claim nodes.
- Surface analytics overlays in the tri‑pane UI (edge thickness by centrality; timebrush to burst windows).

