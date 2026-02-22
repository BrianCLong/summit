from __future__ import annotations
from abc import ABC, abstractmethod

class IdentityAdapter(ABC):
    @abstractmethod
    def authenticate(self, token: str) -> bool:
        """Authenticate a user token."""
        pass

    @abstractmethod
    def elevate(self, token: str) -> bool:
        """Elevate a user session to admin (sudo mode)."""
        pass
