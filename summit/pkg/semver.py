from __future__ import annotations

import re

_SEMVER_PATTERN = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


class SemVerError(ValueError):
    """Raised when semantic version validation fails."""


def is_valid_semver(value: str) -> bool:
    return bool(_SEMVER_PATTERN.fullmatch(value))


def validate_semver(value: str, *, production_mode: bool = True) -> None:
    if production_mode and any(token in value for token in ("*", "x", "X")):
        raise SemVerError(f"wildcard versions are not allowed in production mode: {value}")
    if not is_valid_semver(value):
        raise SemVerError(f"invalid semantic version: {value}")
