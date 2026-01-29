from abc import ABC, abstractmethod
from codemode.policy import SandboxPolicy
from typing import Any

class SandboxRunner(ABC):
    def __init__(self, policy: SandboxPolicy):
        self.policy = policy

    @abstractmethod
    def run_code(self, code: str) -> Any:
        pass
