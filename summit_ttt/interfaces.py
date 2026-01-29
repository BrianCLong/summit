from typing import Protocol, Any, Dict, List, Optional, runtime_checkable

@runtime_checkable
class Attempt(Protocol):
    id: str
    solution: Any
    metadata: Dict[str, Any]

@runtime_checkable
class RewardFn(Protocol):
    def __call__(self, attempt: Attempt) -> float:
        ...

@runtime_checkable
class ProblemEnv(Protocol):
    def reset(self) -> Any: ...
    def step(self, action: Any) -> Any: ...
