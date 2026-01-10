from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class Edge(BaseModel):
    source: str
    target: str
    weight: float


class Graph(BaseModel):
    nodes: list[str]
    edges: list[Edge]

    def adjacency(self) -> dict[str, dict[str, float]]:
        adjacency: dict[str, dict[str, float]] = {node: {} for node in self.nodes}
        for edge in self.edges:
            adjacency[edge.source][edge.target] = edge.weight
        return adjacency


class DiscoverRequest(BaseModel):
    method: str = Field(default="notears", pattern="^(notears|pc|granger)$")
    records: list[dict[str, float]]
    time_order: str | None = None

    @model_validator(mode="after")
    def ensure_numeric(self) -> DiscoverRequest:
        for row in self.records:
            for value in row.values():
                if not isinstance(value, (int, float)):
                    raise ValueError("All record values must be numeric.")
        return self


class DiscoverResponse(BaseModel):
    graph: Graph
    confidence: float
    paths: list[list[str]]


class Intervention(BaseModel):
    node: str
    value: float


class InterveneRequest(BaseModel):
    graph: Graph
    interventions: list[Intervention]
    baseline: dict[str, float] | None = None
    k_paths: int = 3


class Effect(BaseModel):
    node: str
    delta: float
    confidence: float
    contributing_paths: list[list[str]]


class InterveneResponse(BaseModel):
    simulation_id: str
    effects: list[Effect]
    graph: Graph


class ExplainResponse(BaseModel):
    simulation_id: str
    graph: Graph
    effects: list[Effect]
    confidence: float
