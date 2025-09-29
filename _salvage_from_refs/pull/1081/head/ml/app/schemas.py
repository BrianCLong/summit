from typing import Any

from pydantic import BaseModel, Field


class TextDoc(BaseModel):
    id: str
    text: str


class NLPRequest(BaseModel):
    docs: list[TextDoc]
    language: str | None = "en"
    job_id: str | None = None
    callback_url: str | None = None


class ERRecord(BaseModel):
    id: str
    name: str | None = None
    attrs: dict[str, Any] = Field(default_factory=dict)


class ERRequest(BaseModel):
    records: list[ERRecord]
    threshold: float = 0.82
    job_id: str | None = None
    callback_url: str | None = None


class LinkPredRequest(BaseModel):
    graph_snapshot_id: str
    top_k: int = 50
    edges: list | None = None
    job_id: str | None = None
    callback_url: str | None = None


class CommunityRequest(BaseModel):
    graph_snapshot_id: str
    edges: list | None = None
    resolution: float = 1.0
    job_id: str | None = None
    callback_url: str | None = None


# GNN JSON contracts
class SuggestLinksRequest(BaseModel):
    graph: dict[str, Any] = Field(
        ..., description="Graph data: {edges: [[u,v],...]} or NetworkX-like"
    )
    node_features: dict[str, dict[str, float]] | None = Field(
        default=None, description="Per-node feature dict"
    )
    candidate_edges: list[list[str]] | None = Field(
        default=None, description="Optional candidate edges [u,v]"
    )
    focus_entity_id: str | None = None
    model_name: str = Field(..., description="Registered GNN model name")
    model_version: str | None = Field(default=None, description="Model version label, e.g., v1")
    model_config: dict[str, Any] | None = Field(
        default=None, description="Config if creating/training model"
    )
    task_mode: str = Field(default="predict", description="'train' or 'predict'")
    top_k: int = 50
    job_id: str | None = None
    callback_url: str | None = None


class SuggestLinksQueuedResponse(BaseModel):
    queued: bool
    task_id: str


class DetectAnomaliesRequest(BaseModel):
    graph: dict[str, Any] = Field(
        ..., description="Graph data: {edges: [[u,v],...]} or NetworkX-like"
    )
    node_features: dict[str, dict[str, float]] | None = None
    normal_nodes: list[str] | None = Field(
        default=None, description="Known normal nodes for training"
    )
    model_name: str
    model_version: str | None = None
    model_config: dict[str, Any] | None = None
    task_mode: str = Field(default="predict")
    anomaly_threshold: float = 0.5
    job_id: str | None = None
    callback_url: str | None = None


class DetectAnomaliesQueuedResponse(BaseModel):
    queued: bool
    task_id: str


class EntityLinkRequest(BaseModel):
    text: str = Field(..., description="Text to perform entity linking on.")
    job_id: str | None = None
    callback_url: str | None = None


class LinkedEntity(BaseModel):
    text: str
    label: str
    start_char: int
    end_char: int
    entity_id: str | None = None  # ID of the linked entity in the graph


class EntityLinkResponse(BaseModel):
    job_id: str
    entities: list[LinkedEntity]
    status: str
    completed_at: str


class RelationshipExtractionRequest(BaseModel):
    text: str = Field(..., description="Text to perform relationship extraction on.")
    entities: list[LinkedEntity] = Field(
        ..., description="List of entities identified in the text."
    )
    job_id: str | None = None
    callback_url: str | None = None


class ExtractedRelationship(BaseModel):
    source_entity_id: str
    target_entity_id: str
    type: str
    confidence: float
    text_span: str  # The part of the text that describes the relationship


class RelationshipExtractionResponse(BaseModel):
    job_id: str
    relationships: list[ExtractedRelationship]
    status: str
    completed_at: str


class AISuggestedLink(BaseModel):
    source: str
    target: str
    score: float


class AISuggestLinksRequest(BaseModel):
    graph: dict[str, Any]
    node_id: str = Field(..., description="Source node for suggestions")
    top_k: int = 5


class AISuggestLinksResponse(BaseModel):
    suggestions: list[AISuggestedLink]
