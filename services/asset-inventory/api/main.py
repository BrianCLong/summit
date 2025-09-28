from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
import os, json, sqlite3
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response, Request

app = FastAPI(title="CompanyOS Asset Inventory", version="0.1.0")
DB_PATH = os.getenv("DB_PATH", "./data/inventory.db")

REQS = Counter("asset_api_requests_total","API requests",["route","method","code"])
LAT  = Histogram("asset_api_request_seconds","Latency",["route"])

@app.middleware("http")
async def metrics_mw(request: Request, call_next):
    route = request.url.path
    with LAT.labels(route).time():
        resp = await call_next(request)
    REQS.labels(route, request.method, resp.status_code).inc()
    return resp

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

def conn():
    return sqlite3.connect(DB_PATH)

class EndpointIn(BaseModel):
    id: str
    kind: str
    url: str
    auth_mode: str = "none"

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/api/v1/accounts")
def accounts(provider: str | None = None):
    q = "select id, provider, name, status, raw from inventory_cloud_accounts"
    params = []
    if provider:
        q += " where provider=?"; params=[provider]
    with conn() as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(q, params).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/v1/monitoring")
def monitoring(kind: str | None = None):
    q = "select id, kind, url, status, raw from inventory_monitoring_endpoints"
    params = []
    if kind:
        q += " where kind=?"; params=[kind]
    with conn() as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(q, params).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/v1/monitoring")
def upsert_endpoint(ep: EndpointIn):
    with conn() as c:
        c.execute(
            "insert into inventory_monitoring_endpoints (id,kind,url,auth_mode,status,raw,provenance)\n             values (?,?,?,?,?,'{}','{\"method\":\"api\"}')\n             on conflict(id) do update set url=excluded.url, auth_mode=excluded.auth_mode",
            (ep.id, ep.kind, ep.url, ep.auth_mode, "active")
        )
        c.commit()
        c.commit()
    return {"ok": True}

