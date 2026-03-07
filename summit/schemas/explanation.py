from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ExplainMetrics(BaseModel):
    cyclomatic_complexity: int
    function_count: int
    loc: int
    evidence_id: str = Field(default="SUMMIT:TRUST:METRICS:0001")

class Intent(BaseModel):
    component: str
    layer: str
    pattern: List[str]
    dependencies: List[str] = []
    evidence_id: str = Field(default="SUMMIT:INTENT:EXTRACTION:0001")
    error: Optional[str] = None

class ExplanationReport(BaseModel):
    component: str
    purpose: str
    dependencies: List[str]
    risks: str
    evidence_id: str = Field(default="SUMMIT:INTENT:EXPLANATION:0001")

class Stamp(BaseModel):
    evidence_id: str
    path: str
    tool_version: str = "summit-explain-0.1.0"
