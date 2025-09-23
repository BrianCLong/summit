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