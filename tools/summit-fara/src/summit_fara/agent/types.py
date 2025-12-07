from dataclasses import dataclass, field
from typing import List, Optional, Any

@dataclass
class Task:
    id: str
    description: str
    type: str
    context: dict = field(default_factory=dict)

@dataclass
class Action:
    type: str  # 'browser', 'graph', 'cli', 'python'
    params: dict
    timestamp: float

@dataclass
class Trajectory:
    task_id: str
    actions: List[Action] = field(default_factory=list)
    screenshots: List[str] = field(default_factory=list) # paths to screenshots
    reward: float = 0.0
    success: bool = False
    metadata: dict = field(default_factory=dict)

@dataclass
class ExecutionResult:
    success: bool
    output: str
    trajectory: Trajectory
