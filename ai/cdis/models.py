from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class Edge(BaseModel):
    source: str
    target: str
    weight: float


class Graph(BaseModel):
    nodes: List[str]
    edges: List[Edge]

    def adjacency(self) -> Dict[str, Dict[str, float]]:
        adjacency: Dict[str, Dict[str, float]] = {node: {} for node in self.nodes}
        for edge in self.edges:
            adjacency[edge.source][edge.target] = edge.weight
        return adjacency


class DiscoverRequest(BaseModel):
    method: str = Field(default="notears", pattern="^(notears|pc|granger)$")
    records: List[Dict[str, float]]
    time_order: Optional[str] = None

    @model_validator(mode="after")
    def ensure_numeric(self) -> "DiscoverRequest":
        for row in self.records:
            for value in row.values():
                if not isinstance(value, (int, float)):
                    raise ValueError("All record values must be numeric.")
        return self


class DiscoverResponse(BaseModel):
    graph: Graph
    confidence: float
    paths: List[List[str]]


class Intervention(BaseModel):
    node: str
    value: float


class InterveneRequest(BaseModel):
    graph: Graph
    interventions: List[Intervention]
    baseline: Optional[Dict[str, float]] = None
    k_paths: int = 3


class Effect(BaseModel):
    node: str
    delta: float
    confidence: float
    contributing_paths: List[List[str]]


class InterveneResponse(BaseModel):
    simulation_id: str
    effects: List[Effect]
    graph: Graph


class ExplainResponse(BaseModel):
    simulation_id: str
    graph: Graph
    effects: List[Effect]
    confidence: float
