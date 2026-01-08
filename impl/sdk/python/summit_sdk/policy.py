"""Policy context modeling."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PolicyContext:
    """Represents governance inputs for a request."""

    tenant: str
    region: str | None = None
    purpose: str | None = None
    sensitivity: str | None = None
    overrides: dict[str, Any] = field(default_factory=dict)

    def merged(self, overrides: dict[str, Any] | None = None) -> PolicyContext:
        data = {
            "tenant": self.tenant,
            "region": self.region,
            "purpose": self.purpose,
            "sensitivity": self.sensitivity,
            "overrides": {**self.overrides, **(overrides or {})},
        }
        return PolicyContext(**data)

    def to_dict(self) -> dict[str, Any]:
        return {
            "tenant": self.tenant,
            "region": self.region,
            "purpose": self.purpose,
            "sensitivity": self.sensitivity,
            "overrides": self.overrides,
        }
