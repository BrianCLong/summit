"""Semantic version validation utilities for Unity package manifests."""

from __future__ import annotations

import re

SEMVER_PATTERN = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


class SemVerError(ValueError):
    """Raised when a semantic version does not meet policy."""


def validate_semver(version: str, *, production_mode: bool = True) -> str:
    """Validate a strict ``MAJOR.MINOR.PATCH`` semantic version.

    Args:
        version: Candidate version string.
        production_mode: When true, wildcard syntax is denied.

    Returns:
        The original version when valid.

    Raises:
        SemVerError: If the version is not strict semver.
    """

    candidate = version.strip()
    if production_mode and any(token in candidate for token in ("*", "x", "X")):
        raise SemVerError(f"Wildcard versions are not allowed in production mode: {version!r}")

    if not SEMVER_PATTERN.fullmatch(candidate):
        raise SemVerError(f"Version must use strict MAJOR.MINOR.PATCH format: {version!r}")

    return candidate
