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
    _require_keys(payload, {"evidence_id", "summary", "artifacts", "environment", "backend"})
    _enforce_no_additional(payload, {"evidence_id", "summary", "artifacts", "environment", "backend", "run_id"})
    _validate_evidence_id(payload["evidence_id"])
    if not isinstance(payload["summary"], str):
        raise ValueError("summary must be a string")
    if not isinstance(payload["environment"], str):
        raise ValueError("environment must be a string")
    if not isinstance(payload["backend"], str):
        raise ValueError("backend must be a string")
    if "run_id" in payload and not isinstance(payload["run_id"], str):
        raise ValueError("run_id must be a string")
    artifacts = payload["artifacts"]
    if not isinstance(artifacts, list) or not all(
        isinstance(item, str) for item in artifacts
    ):
        raise ValueError("artifacts must be a list of strings")


def validate_metrics(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"evidence_id", "metrics"})
    _enforce_no_additional(payload, {"evidence_id", "metrics", "run_id"})
    _validate_evidence_id(payload["evidence_id"])
    if "run_id" in payload and not isinstance(payload["run_id"], str):
        raise ValueError("run_id must be a string")
    metrics = payload["metrics"]
    if not isinstance(metrics, dict):
        raise ValueError("metrics must be an object")
    for value in metrics.values():
        if not isinstance(value, (bool, int, float, str)):
            raise ValueError("metrics values must be number, string, or boolean")


def validate_stamp(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"created_at", "git_commit", "run_id"})
    _enforce_no_additional(payload, {"created_at", "git_commit", "run_id", "evidence_id"})
    _validate_iso8601(payload["created_at"])
    if not isinstance(payload["git_commit"], str):
        raise ValueError("git_commit must be a string")
    if not isinstance(payload["run_id"], str):
        raise ValueError("run_id must be a string")
    if "evidence_id" in payload:
        _validate_evidence_id(payload["evidence_id"])


def validate_index(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"evidence"})
    _enforce_no_additional(payload, {"evidence"})
    evidence = payload["evidence"]
    if not isinstance(evidence, dict):
        raise ValueError("evidence must be an object")
    for eid, paths in evidence.items():
        _validate_evidence_id(eid)
        if not isinstance(paths, dict):
            raise ValueError("evidence entries must be objects")
        _require_keys(paths, {"report", "metrics", "stamp"})
        _enforce_no_additional(paths, {"report", "metrics", "stamp"})
        for key in ("report", "metrics", "stamp"):
            if not isinstance(paths[key], str):
                raise ValueError(f"{key} must be a string")
