from __future__ import annotations

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    features: dict[str, float] | None = None
    attrs: dict[str, str] | None = None


class GraphEdge(BaseModel):
    src: str
    dst: str
    undirected: bool | None = None
    features: dict[str, float] | None = None
    attrs: dict[str, str] | None = None


class Subgraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    directed: bool | None = None
    metadata: dict[str, str] | None = None


class ModelOutput(BaseModel):
    task: str
    target: dict[str, str]
    score: float
    logits: list[float] | None = None
    label: str | None = None


class ModelMeta(BaseModel):
    name: str
    version: str
    gradients: bool | None = None
    node_feature_names: list[str] | None = None
    edge_feature_names: list[str] | None = None


class ExplainRequest(BaseModel):
    subgraph: Subgraph
    outputs: list[ModelOutput]
    model: ModelMeta
    options: dict[str, str] | None = None


class Importance(BaseModel):
    id: str
    type: str
    score: float


class PathExplanation(BaseModel):
    path: list[str]
    score: float
    rationale: str


class CounterfactualEdit(BaseModel):
    op: str
    payload: dict[str, str]
    cost: float


class Counterfactual(BaseModel):
    target: dict[str, str]
    new_score: float
    delta: float
    edits: list[CounterfactualEdit]


class Robustness(BaseModel):
    stability: float
    details: dict[str, list[str]] | dict[str, float]


class Fairness(BaseModel):
    enabled: bool
    parity: dict[str, float] | None = None
    notes: list[str] = []


class VizPayload(BaseModel):
    nodes: list[dict[str, float | str]]
    edges: list[dict[str, float | str]]
    legend: dict[str, str]


class ExplainResponse(BaseModel):
    importances: list[Importance]
    paths: list[PathExplanation]
    counterfactuals: list[Counterfactual]
    robustness: Robustness
    fairness: Fairness
    viz: VizPayload
    audit_id: str
