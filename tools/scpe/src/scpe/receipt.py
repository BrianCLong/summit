"""Attested receipt generation and verification."""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

from . import __version__
from .errors import ReceiptError
from .utils import canonical_json

INTEGRITY_ALGORITHM = "sha256"


def build_receipt(
    *,
    config_path: Path,
    config: dict[str, Any],
    verification: dict[str, Any],
) -> dict[str, Any]:
    receipt: dict[str, Any] = {
        "scpe": {"version": __version__},
        "config": {
            "path": config_path.as_posix(),
            "version": config.get("version", 1),
        },
        "build": config.get("build", {}),
        "artifacts": verification.get("artifacts", []),
        "sbom": verification.get("sbom", {}),
        "result": {
            "status": "passed",
            "checks": verification.get("checks", []),
        },
    }

    sanitized = _sanitize(receipt)
    sanitized["integrity"] = _compute_integrity(sanitized)
    return sanitized


def write_receipt(receipt: dict[str, Any], path: Path) -> None:
    serialized = canonical_json(receipt)
    path.write_text(serialized, encoding="utf-8")


def verify_receipt(path: Path) -> dict[str, Any]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
        raise ReceiptError(f"Receipt is not valid JSON: {path}") from exc

    if not isinstance(document, dict):
        raise ReceiptError("Receipt must be a JSON object")

    recorded_integrity = document.get("integrity")
    if not isinstance(recorded_integrity, dict):
        raise ReceiptError("Receipt missing integrity information")

    expected = _compute_integrity(document)
    if expected != recorded_integrity:
        raise ReceiptError(
            "Receipt integrity mismatch",
            hint=f"Expected digest {expected['value']} but found {recorded_integrity.get('value')}",
        )

    return document


def _compute_integrity(document: dict[str, Any]) -> dict[str, str]:
    snapshot = {k: v for k, v in document.items() if k != "integrity"}
    serialized = canonical_json(snapshot)
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return {"algorithm": INTEGRITY_ALGORITHM, "value": digest}


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize(v) for v in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value
