from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TextDoc(BaseModel):
    id: str
    text: str

class NLPRequest(BaseModel):
    docs: List[TextDoc]
    language: Optional[str] = "en"
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class ERRecord(BaseModel):
    id: str
    name: Optional[str] = None
    attrs: Dict[str, Any] = Field(default_factory=dict)

class ERRequest(BaseModel):
    records: List[ERRecord]
    threshold: float = 0.82
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class LinkPredRequest(BaseModel):
    graph_snapshot_id: str
    top_k: int = 50
    edges: Optional[list] = None
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class CommunityRequest(BaseModel):
    graph_snapshot_id: str
    edges: Optional[list] = None
    resolution: float = 1.0
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

# GNN JSON contracts
class SuggestLinksRequest(BaseModel):
    graph: Dict[str, Any] = Field(..., description="Graph data: {edges: [[u,v],...]} or NetworkX-like")
    node_features: Optional[Dict[str, Dict[str, float]]] = Field(default=None, description="Per-node feature dict")
    candidate_edges: Optional[List[List[str]]] = Field(default=None, description="Optional candidate edges [u,v]")
    focus_entity_id: Optional[str] = None
    model_name: str = Field(..., description="Registered GNN model name")
    model_version: Optional[str] = Field(default=None, description="Model version label, e.g., v1")
    model_config: Optional[Dict[str, Any]] = Field(default=None, description="Config if creating/training model")
    task_mode: str = Field(default='predict', description="'train' or 'predict'")
    top_k: int = 50
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class SuggestLinksQueuedResponse(BaseModel):
    queued: bool
    task_id: str

class DetectAnomaliesRequest(BaseModel):
    graph: Dict[str, Any] = Field(..., description="Graph data: {edges: [[u,v],...]} or NetworkX-like")
    node_features: Optional[Dict[str, Dict[str, float]]] = None
    normal_nodes: Optional[List[str]] = Field(default=None, description="Known normal nodes for training")
    model_name: str
    model_version: Optional[str] = None
    model_config: Optional[Dict[str, Any]] = None
    task_mode: str = Field(default='predict')
    anomaly_threshold: float = 0.5
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class DetectAnomaliesQueuedResponse(BaseModel):
    queued: bool
    task_id: str

class EntityLinkRequest(BaseModel):
    text: str = Field(..., description="Text to perform entity linking on.")
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class LinkedEntity(BaseModel):
    text: str
    label: str
    start_char: int
    end_char: int
    entity_id: Optional[str] = None # ID of the linked entity in the graph

class EntityLinkResponse(BaseModel):
    job_id: str
    entities: List[LinkedEntity]
    status: str
    completed_at: str

class RelationshipExtractionRequest(BaseModel):
    text: str = Field(..., description="Text to perform relationship extraction on.")
    entities: List[LinkedEntity] = Field(..., description="List of entities identified in the text.")
    job_id: Optional[str] = None
    callback_url: Optional[str] = None

class ExtractedRelationship(BaseModel):
    source_entity_id: str
    target_entity_id: str
    type: str
    confidence: float
    text_span: str # The part of the text that describes the relationship

class RelationshipExtractionResponse(BaseModel):
    job_id: str
    relationships: List[ExtractedRelationship]
    status: str
    completed_at: str
