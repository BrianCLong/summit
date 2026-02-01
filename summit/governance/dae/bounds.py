from pydantic import BaseModel, Field
from typing import Optional, List

class ExecutionBounds(BaseModel):
    max_steps: int = 10
    max_tool_calls: int = 50
    max_duration_seconds: float = 60.0
    allowed_tools: List[str] = Field(default_factory=list)

class ExecutionCounters(BaseModel):
    steps_count: int = 0
    tool_calls_count: int = 0
    start_time: float = 0.0

    def increment_steps(self):
        self.steps_count += 1

    def increment_tool_calls(self):
        self.tool_calls_count += 1
