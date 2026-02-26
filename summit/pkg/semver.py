"""SemVer validation helpers for Unity package manifests."""

from __future__ import annotations

import re

SEMVER_RE = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?$")
WILDCARD_TOKENS = ("*", "x", "X")


def validate_semver(version: str, *, production_mode: bool = True) -> bool:
    """Return True when version matches strict semver and wildcard policy."""
    if not isinstance(version, str) or not version:
        return False

    if production_mode and any(token in version for token in WILDCARD_TOKENS):
        return False

    return bool(SEMVER_RE.fullmatch(version))
