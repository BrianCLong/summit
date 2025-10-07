import json, os, re, time
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

PORT = int(os.getenv("PORT", "7860"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
APP_HTML = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Summit Mock API</title>
  <link rel="stylesheet" href="https://unpkg.com/ @picocss/pico@2/css/pico.min.css"/>
  <style> body{max-width:900px;margin:2rem auto} pre{background:#111;color:#ddd;padding:1rem;border-radius:8px;overflow:auto}</style>
</head>
<body>
  <main>
    <h1>Summit Mock API (Docker)</h1>
    <p>This container serves a mock <code>/graphql</code> endpoint suitable for the Summit UI static Space.</p>
    <details open><summary>Try a request</summary>
    <pre>curl -s -X POST http://localhost:{port}/graphql \
  -H 'content-type: application/json' \
  -d '{{"query":"query Investigate($id:ID!){{entity(id:$id){{id label type}} neighbors(id:$id){{id label type edgeLabel}}}}","variables":{{"id":"ACME"}}}}'</pre>
    </details>
    <p>Health: <code>/healthz</code></p>
    <p>Metrics: <code>/metrics</code></p>
  </main>
</body>
</html>
".format(port=PORT)

start_time = time.time()
edit_count = 0
endpoint_metrics = {}

DATA = json.loads(Path(__file__).with_name("sample_graph.json").read_text())

def neighbors_of(entity_id: str):
    # Build neighbor list with edge label
    out = []
    for e in DATA["edges"]:
        if e["src"] == entity_id:
            node = next((n for n in DATA["nodes"] if n["id"] == e["dst"]), None)
            if node: out.append({**node, "edgeLabel": e.get("label","")})
        if e["dst"] == entity_id:
            node = next((n for n in DATA["nodes"] if n["id"] == e["src"]), None)
            if node: out.append({**node, "edgeLabel": e.get("label","")})
    return out

def entity_of(entity_id: str):
    return next((n for n in DATA["nodes"] if n["id"] == entity_id), None)

async def record_metrics(endpoint_name, func, *args, **kwargs):
    start = time.time()
    result = await func(*args, **kwargs)
    latency = time.time() - start

    if endpoint_name not in endpoint_metrics:
        endpoint_metrics[endpoint_name] = {"request_count": 0, "total_latency": 0.0}
    endpoint_metrics[endpoint_name]["request_count"] += 1
    endpoint_metrics[endpoint_name]["total_latency"] += latency
    return result

@app.get("/", response_class=HTMLResponse)
async def index():
    return await record_metrics("index", _index)

async def _index():
    return APP_HTML

@app.get("/healthz", response_class=PlainTextResponse)
async def health():
    return await record_metrics("healthz", _health)

async def _health():
    return "ok"

@app.get("/metrics", response_class=JSONResponse)
async def metrics():
    return await record_metrics("metrics", _metrics)

async def _metrics():
    uptime = time.time() - start_time
    per_endpoint_metrics = {}
    for ep_name, ep_data in endpoint_metrics.items():
        avg_latency = ep_data["total_latency"] / ep_data["request_count"] if ep_data["request_count"] > 0 else 0
        per_endpoint_metrics[ep_name] = {
            "request_count": ep_data["request_count"],
            "average_latency_seconds": avg_latency
        }
    return {"uptime_seconds": uptime, "edit_operations_total": edit_count, "endpoint_metrics": per_endpoint_metrics}

@app.post("/graphql", response_class=JSONResponse)
async def graphql(req: Request):
    return await record_metrics("graphql", _graphql, req)

async def _graphql(req: Request):
    """Very small GraphQL-ish mock: inspects query text and variables."""
    body = await req.json()
    query = body.get("query","")
    variables = body.get("variables",{}) or {}
    ent_id = variables.get("id") or variables.get("entityId") or "ACME"

    # naive parse: if "entity(" present, include entity; if "neighbors(" present, include neighbors
    inc_entity = bool(re.search(r"\bentity\s*(", query))
    inc_neighbors = bool(re.search(r"\bneighbors\s*(", query))

    data = {}
    if inc_entity:
        data["entity"] = entity_of(ent_id)
    if inc_neighbors:
        data["neighbors"] = neighbors_of(ent_id)

    auth_header = req.headers.get("Authorization")
    if auth_header:
        data["authHeader"] = auth_header

    return {"data": data}

@app.put("/entity", response_class=JSONResponse)
async def put_entity(req: Request):
    return await record_metrics("put_entity", _put_entity, req)

async def _put_entity(req: Request):
    entity = await req.json()
    if "id" not in entity or "label" not in entity or "type" not in entity:
        return JSONResponse({"error": "id, label, and type are required"}, status_code=400)
    
    # Check if entity already exists and update, otherwise add
    found = False
    for i, n in enumerate(DATA["nodes"]):
        if n["id"] == entity["id"]:
            DATA["nodes"][i] = entity
            found = True
            break
    if not found:
        DATA["nodes"].append(entity)
    
    global edit_count
    edit_count += 1
    return JSONResponse({"status": "success", "entity": entity})

@app.put("/edge", response_class=JSONResponse)
async def put_edge(req: Request):
    return await record_metrics("put_edge", _put_edge, req)

async def _put_edge(req: Request):
    edge = await req.json()
    if "src" not in edge or "dst" not in edge or "label" not in edge:
        return JSONResponse({"error": "src, dst, and label are required"}, status_code=400)
    
    # Check if edge already exists and update, otherwise add
    found = False
    for i, e in enumerate(DATA["edges"]):
        if e["src"] == edge["src"] and e["dst"] == edge["dst"] and e["label"] == edge["label"]:
            DATA["edges"][i] = edge
            found = True
            break
    if not found:
        DATA["edges"].append(edge)

    global edit_count
    edit_count += 1
    return JSONResponse({"status": "success", "edge": edge})
