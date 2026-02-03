from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, List


@dataclass
class Result:
    artifacts: list[str] = field(default_factory=list)
    cost_ms: int = 0

@dataclass
class Config:
    max_cost_ms: int = 1000
    max_output_bytes: int = 1024 * 1024
    allowlisted_tools: list[str] = field(default_factory=list)

class Scout(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def run(self, ctx: Any, cfg: Config) -> Result:
        pass
