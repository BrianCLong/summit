"""Policy context modeling."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class PolicyContext:
    """Represents governance inputs for a request."""

    tenant: str
    region: Optional[str] = None
    purpose: Optional[str] = None
    sensitivity: Optional[str] = None
    overrides: Dict[str, Any] = field(default_factory=dict)

    def merged(self, overrides: Optional[Dict[str, Any]] = None) -> "PolicyContext":
        data = {
            "tenant": self.tenant,
            "region": self.region,
            "purpose": self.purpose,
            "sensitivity": self.sensitivity,
            "overrides": {**self.overrides, **(overrides or {})},
        }
        return PolicyContext(**data)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tenant": self.tenant,
            "region": self.region,
            "purpose": self.purpose,
            "sensitivity": self.sensitivity,
            "overrides": self.overrides,
        }

