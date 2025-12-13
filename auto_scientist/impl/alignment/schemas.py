from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class Candidate(BaseModel):
    text: str
    tool_traces: Optional[List[Dict[str, Any]]] = None
    graph_ops: Optional[List[Dict[str, Any]]] = None
    logprobs: Optional[Dict[str, float]] = None

class Preference(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    candidates: List[Candidate]
    chosen_idx: int
    rejected_idx: int
    rationale: Optional[str] = None
    safety_tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AlignmentConfig(BaseModel):
    model_name: str
    learning_rate: float = 1e-6
    batch_size: int = 4
    beta: float = 0.1
    max_steps: int = 1000
    output_dir: str = "./output"
