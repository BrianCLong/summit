from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class StopCondition(str, Enum):
    FIRST_PROOF = "first_proof"
    MIN_PROOFS = "min_proofs"
    BUDGET_EXHAUSTED = "budget_exhausted"

class GradeMode(str, Enum):
    STRICT = "strict"
    BALANCED = "balanced"
    PERMISSIVE = "permissive"

class ExplorationBudget(BaseModel):
    max_hops: int = Field(default=3, ge=1, description="Maximum depth of graph traversal")
    max_nodes: int = Field(default=500, ge=1, description="Maximum number of nodes to visit")
    max_paths: int = Field(default=50, ge=1, description="Maximum number of paths to collect")
    stop_when: StopCondition = Field(default=StopCondition.BUDGET_EXHAUSTED, description="Condition to stop traversal early")
    min_proofs: Optional[int] = Field(default=None, description="Minimum proofs required if stop_when is min_proofs")

    model_config = ConfigDict(extra="forbid")

class ExplanationBudget(BaseModel):
    max_hops: int = Field(default=2, ge=1, description="Maximum path length to use in final explanation")
    max_paths_in_answer: int = Field(default=5, ge=1, description="Maximum number of distinct paths to cite in answer")

    model_config = ConfigDict(extra="forbid")

class GradingPolicy(BaseModel):
    mode: GradeMode = Field(default=GradeMode.BALANCED, description="Strictness of evidence grading")

    model_config = ConfigDict(extra="forbid")

class ReasoningBudget(BaseModel):
    explore: ExplorationBudget = Field(default_factory=ExplorationBudget)
    explain: ExplanationBudget = Field(default_factory=ExplanationBudget)
    grade: GradingPolicy = Field(default_factory=GradingPolicy)

    model_config = ConfigDict(extra="forbid")
