from fastapi import FastAPI
from pydantic import BaseModel
from time import perf_counter
import re
import os
try:
    import pickle
    import numpy as np
except Exception:
    np = None

app = FastAPI(title="er-service", version="0.1.0")

class CandidatesReq(BaseModel):
    entityId: str | None = None
    entity: dict | None = None
    universe: list[dict] | None = None  # optional list of entities to search

def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z]","", (name or "").lower())

def extract_domain(email: str) -> str | None:
    m = re.match(r"[^@]+@([^@]+)$", email or "")
    return m.group(1).lower() if m else None

def normalize_phone(phone: str) -> str:
    return re.sub(r"\D","", phone or "")

@app.post("/er/v1/candidates")
async def candidates(req: CandidatesReq):
    t0 = perf_counter()
    entity = req.entity or {}
    blocked = []
    if entity:
        key = normalize_name(entity.get("name",""))
        dom = extract_domain(entity.get("email",""))
        ph = normalize_phone(entity.get("phone",""))
        for cand in (req.universe or []):
            ok = False
            if key and normalize_name(cand.get("name","")) == key:
                ok = True
            if dom and extract_domain(cand.get("email","")) == dom:
                ok = True
            if ph and normalize_phone(cand.get("phone","")) == ph:
                ok = True
            if ok:
                blocked.append({"id": cand.get("id"), "features": {"nameKey": key, "domain": dom, "phone": ph}})
    # Cap at 50
    blocked = blocked[:50]
    latency_ms = int((perf_counter() - t0) * 1000)
    return {"candidates": blocked, "latencyMs": latency_ms}

class ScoreReq(BaseModel):
    left: dict
    right: dict

MODEL = None
if os.getenv("MODELS_DIR") and np is not None:
    p = os.path.join(os.getenv("MODELS_DIR"), "logreg.pkl")
    if os.path.exists(p):
        try:
            with open(p, 'rb') as f:
                MODEL = pickle.load(f)
        except Exception:
            MODEL = None

def features(a: dict, b: dict):
    def jacc(a,b):
        sa, sb = set(a or []), set(b or [])
        u = len(sa | sb) or 1
        return len(sa & sb)/u
    same_email = 1.0 if (a.get("email") and a.get("email")==b.get("email")) else 0.0
    name_key = 1.0 if normalize_name(a.get("name","")) == normalize_name(b.get("name","")) else 0.0
    dom_a, dom_b = extract_domain(a.get("email","")), extract_domain(b.get("email",""))
    same_domain = 1.0 if dom_a and dom_b and dom_a==dom_b else 0.0
    phone = 1.0 if normalize_phone(a.get("phone","")) == normalize_phone(b.get("phone","")) else 0.0
    loc = jacc(a.get("locations"), b.get("locations"))
    return [same_email, name_key, same_domain, phone, loc]

@app.post("/er/v1/score")
async def score(req: ScoreReq):
    X = features(req.left, req.right)
    if MODEL and np is not None:
        arr = np.array(X).reshape(1,-1)
        p = float(MODEL.predict_proba(arr)[0,1])
    else:
        # simple heuristic sum normalized
        p = sum(X)/len(X)
    return {"score": p, "explanations": ["emailExact","nameKey","domain","phone","locationOverlap"]}
