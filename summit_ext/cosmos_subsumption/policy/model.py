from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

Exposure = Literal["private", "internal", "internet"]

@dataclass(frozen=True)
class AuthPolicy:
    required: bool = True
    provider: Optional[str] = None  # e.g. "oidc"

@dataclass(frozen=True)
class ExposureRule:
    app_id: str
    exposure: Exposure = "private"
    domain: Optional[str] = None
    auth: AuthPolicy = AuthPolicy(required=True, provider="oidc")
    breakglass: bool = False  # explicit unsafe override
