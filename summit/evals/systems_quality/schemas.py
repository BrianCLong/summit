from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SystemQualityMetrics(BaseModel):
    defect_density: float = Field(..., description="Failing tests per line of code changed")
    rework_rate: float = Field(..., description="Percentage of files modified more than once in the commit range")
    variance_score: float = Field(0.0, description="Standard deviation of scores across multiple runs")
    escape_rate: float = Field(0.0, description="Post-merge bug incidence (mocked for now)")

class SystemQualityReport(BaseModel):
    # Allow lowercase in ID
    evidence_id: str = Field(..., pattern=r"^SYSQ-[a-zA-Z0-9\-]+$")
    timestamp: datetime = Field(default_factory=datetime.now)
    agent_id: str
    repo_path: str
    commit_range: str
    metrics: SystemQualityMetrics
    summary: str
    environment: str = "ci"
    backend: str = "systems_quality_evaluator"
    artifacts: list[str] = []
