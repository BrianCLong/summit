from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Mapping

EVIDENCE_ID_PATTERN = re.compile(r"^EVD-[A-Z0-9\-]+$")


def _require_keys(payload: Mapping[str, Any], required: set[str]) -> None:
    missing = required - set(payload.keys())
    if missing:
        raise ValueError(f"Missing required keys: {sorted(missing)}")


def _enforce_no_additional(payload: Mapping[str, Any], allowed: set[str]) -> None:
    extras = set(payload.keys()) - allowed
    if extras:
        raise ValueError(f"Unexpected keys: {sorted(extras)}")


def _validate_evidence_id(value: Any) -> None:
    if not isinstance(value, str) or not EVIDENCE_ID_PATTERN.match(value):
        raise ValueError("evidence_id must match ^EVD-[A-Z0-9\\-]+$")


def _validate_iso8601(value: Any) -> None:
    if not isinstance(value, str):
        raise ValueError("created_at must be a string")
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    try:
        datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("created_at must be ISO-8601 date-time") from exc


def validate_report(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"evidence_id", "summary", "environment", "backend", "artifacts"})
    _enforce_no_additional(payload, {"evidence_id", "summary", "environment", "backend", "artifacts"})
    _validate_evidence_id(payload["evidence_id"])
    if not isinstance(payload["summary"], str):
        raise ValueError("summary must be a string")
    if not isinstance(payload["environment"], str):
        raise ValueError("environment must be a string")
    if not isinstance(payload["backend"], str):
        raise ValueError("backend must be a string")
    artifacts = payload["artifacts"]
    if not isinstance(artifacts, list) or not all(
        isinstance(item, str) for item in artifacts
    ):
        raise ValueError("artifacts must be a list of strings")


def validate_metrics(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"evidence_id", "metrics"})
    _enforce_no_additional(payload, {"evidence_id", "metrics"})
    _validate_evidence_id(payload["evidence_id"])
    metrics = payload["metrics"]
    if not isinstance(metrics, dict):
        raise ValueError("metrics must be an object")
    for value in metrics.values():
        if not isinstance(value, (bool, int, float, str)):
            raise ValueError("metrics values must be number, string, or boolean")


def validate_stamp(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"created_at", "git_commit", "run_id"})
    _enforce_no_additional(payload, {"created_at", "git_commit", "run_id"})
    _validate_iso8601(payload["created_at"])
    if not isinstance(payload["git_commit"], str):
        raise ValueError("git_commit must be a string")
    if not isinstance(payload["run_id"], str):
        raise ValueError("run_id must be a string")


def validate_index(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"items"})
    _enforce_no_additional(payload, {"items"})
    items = payload["items"]
    if not isinstance(items, list):
        raise ValueError("items must be an array")
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("items entries must be objects")
        _require_keys(item, {"evidence_id", "report", "metrics", "stamp"})
        _enforce_no_additional(item, {"evidence_id", "report", "metrics", "stamp"})
        _validate_evidence_id(item["evidence_id"])
        for key in ("report", "metrics", "stamp"):
            if not isinstance(item[key], str):
                raise ValueError(f"{key} must be a string")
