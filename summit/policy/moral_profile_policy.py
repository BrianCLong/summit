from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MoralPolicy:
    # deny-by-default: must be explicitly enabled by operator
    enabled: bool = False
    # purpose tag required for any persisted profile
    require_purpose_tag: bool = True
    # retention in days (sensitive psychographic inference)
    retention_days: int = 30

def assert_can_persist_profile(*, enabled: bool, purpose_tag: str) -> None:
    if not enabled:
        raise PermissionError("Moral layer disabled")
    if not purpose_tag or not purpose_tag.strip():
        raise PermissionError("Missing purpose_tag")
