from __future__ import annotations

import os

import pandas as pd
import networkx as nx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .learners import select_learner
from .models import DiscoverRequest, DiscoverResponse, ExplainResponse, Graph, InterveneRequest
from .simulator import do_calculus, store

app = FastAPI(title="Causal Discovery & Intervention Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class FeatureGuard:
    def __call__(self) -> None:
        enabled = os.getenv("CAUSAL_LAB_ENABLED", "false").lower() == "true"
        if not enabled:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Causal Lab is disabled")


def _to_graph(nx_graph) -> Graph:
    nodes = list(nx_graph.nodes)
    edges = []
    for src, tgt, data in nx_graph.edges(data=True):
        edges.append({"source": src, "target": tgt, "weight": float(data.get("weight", 0.0))})
    return Graph(nodes=nodes, edges=edges)


@app.post("/discover", response_model=DiscoverResponse, dependencies=[Depends(FeatureGuard())])
def discover(request: DiscoverRequest) -> DiscoverResponse:
    df = pd.DataFrame(request.records)
    learner = select_learner(request.method)
    learned = learner.learn(df)
    graph = _to_graph(learned.graph)
    return DiscoverResponse(graph=graph, confidence=learned.confidence, paths=learned.paths)


@app.post("/intervene", dependencies=[Depends(FeatureGuard())])
def intervene(request: InterveneRequest):
    return do_calculus(request)


@app.get("/explain/{simulation_id}", response_model=ExplainResponse, dependencies=[Depends(FeatureGuard())])
def explain(simulation_id: str):
    result = store.get(simulation_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    return result
