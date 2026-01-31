from abc import ABC, abstractmethod
from typing import Any

from codemode.policy import SandboxPolicy


class SandboxRunner(ABC):
    def __init__(self, policy: SandboxPolicy):
        self.policy = policy

    @abstractmethod
    def run_code(self, code: str) -> Any:
        pass
