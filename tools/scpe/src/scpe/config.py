"""Configuration loading and validation for SCPE."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .errors import ConfigError


def load_config(path: str | Path) -> dict[str, Any]:
    """Load a SCPE configuration file (YAML or JSON)."""

    config_path = Path(path)
    if not config_path.exists():
        raise ConfigError(f"Configuration file not found: {config_path}")

    text = config_path.read_text(encoding="utf-8")
    suffix = config_path.suffix.lower()

    try:
        if suffix in {".yaml", ".yml"}:
            data = _load_yaml(text)
        else:
            data = json.loads(text)
    except Exception as exc:  # pragma: no cover - defensive guard
        raise ConfigError(f"Failed to parse configuration: {exc}") from exc

    if not isinstance(data, dict):
        raise ConfigError("Configuration root must be a mapping")

    data.setdefault("version", 1)
    data.setdefault("artifacts", [])

    return data


def _load_yaml(text: str) -> dict[str, Any]:
    try:
        import yaml  # type: ignore
    except ImportError as exc:  # pragma: no cover - runtime guard
        raise ConfigError(
            "PyYAML is required to parse YAML configuration files",
            hint="Install scpe with the 'yaml' extra or convert to JSON",
        ) from exc

    data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ConfigError("YAML configuration must define a mapping at the root")
    return data


def resolve_path(base: Path, path: str | Path) -> Path:
    """Resolve a potentially relative path against a base file."""

    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return (base.parent / candidate).resolve()
