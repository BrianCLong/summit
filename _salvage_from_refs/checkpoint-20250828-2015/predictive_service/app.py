from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import torch
from torch import nn
from pathlib import Path
import uvicorn
import json
import time
from predictive_service.model_registry import load_model # New import
from predictive_service.metrics import INF_REQ, INF_LAT, MODEL_VER # New import

app = FastAPI(title="IntelGraph Predictive Inference")

class SuggestLinksIn(BaseModel):
    caseId: str
    seedNodeIds: List[str]
    topK: int = 20
    threshold: float = 0.65

class Suggestion(BaseModel):
    id: str
    sourceId: str
    targetId: str
    score: float
    reasons: List[Dict[str, Any]] = []
    previewPath: List[str] = []

class SuggestLinksOut(BaseModel):
    suggestions: List[Suggestion]

class ResolveIn(BaseModel):
    caseId: str
    candidates: List[Dict[str, Any]]

# Load embeddings (precomputed, e.g., Node2Vec) as mmap for speed
EMB = {}  # id -> torch.tensor
def load_embeddings(path="/data/node_embeddings.jsonl"):
    global EMB
    EMB = {}
    if not Path(path).exists():
      return
    with open(path, "r") as fh:
        for line in fh:
            r = json.loads(line)
            EMB[r["id"]] = torch.tensor(r["emb"], dtype=torch.float32)

load_embeddings() # Call load_embeddings here

_model = load_model() # Load the model once
MODEL_VER.set(1.0) # Set model version to 1.0 for now, can be dynamic later

def score_pair(sid: str, tid: str) -> float:
    a = EMB.get(sid); b = EMB.get(tid)
    if a is None or b is None:
        return 0.0
    with torch.no_grad():
        score = _model(a.unsqueeze(0), b.unsqueeze(0)).item()
        return float(score)

@app.post("/lp/suggest", response_model=SuggestLinksOut)
def suggest(inp: SuggestLinksIn):
    INF_REQ.inc()
    with INF_LAT.time():
        seeds = [n for n in inp.seedNodeIds if n in EMB]
        if not seeds:
            return {"suggestions": []}
        # naive top-K: compare seeds to all candidates (in practice, restrict by neighborhood/filter)
        candidates = list(EMB.keys())
        out: List[Suggestion] = []
        sid = seeds[0]
        for tid in candidates:
            if tid == sid: continue
            sc = score_pair(sid, tid)
            if sc >= inp.threshold:
                out.append(Suggestion(
                    id=f"{sid}:{tid}:{int(time.time())}",
                    sourceId=sid, targetId=tid, score=sc,
                    reasons=[{"label":"embedding_similarity", "weight": sc}],
                    previewPath=[]
                ))
        out.sort(key=lambda x: x.score, reverse=True)
        return {"suggestions": out[:inp.topK]}

@app.get("/lp/explain/{sid}", response_model=Dict[str, Any])
def explain(sid: str):
    INF_REQ.inc()
    with INF_LAT.time():
        # Stub: return feature attributions + dummy path motifs
        return {
            "id": sid,
            "features": [
                {"name": "embedding_similarity", "value": 0.82, "contribution": 0.61},
                {"name": "temporal_proximity_days", "value": 3, "contribution": 0.21},
            ],
            "paths": [["n12", "n33", "n47"], ["n12", "n50"]],
            "citations": ["features/node_embeddings.jsonl:sha256:..."]
        }

@app.post("/er/resolve")
def resolve(inp: ResolveIn):
    merged, rejected = [], []
    for c in inp.candidates:
        dups = c.get("duplicates", [])
        if len(dups) > 1:
            merged.extend(dups)
        else:
            rejected.extend(dups)
    return {"merged": merged, "rejected": rejected}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
