"""Deterministic WebMCP transcript ingestion for Summit evidence."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from typing import Any


_REQUIRED_FIELDS = ("origin", "timestamp_ms", "actions")


def _stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def normalize_session_transcript(transcript: dict[str, Any]) -> dict[str, Any]:
    missing = [field for field in _REQUIRED_FIELDS if field not in transcript]
    if missing:
        missing_csv = ", ".join(missing)
        raise ValueError(f"webmcp transcript missing required fields: {missing_csv}")

    if not isinstance(transcript.get("actions"), list):
        raise ValueError("webmcp transcript field 'actions' must be a list")

    normalized_actions = [
        {
            "type": action.get("type", "unknown"),
            "target": action.get("target", ""),
            "timestamp_ms": int(action.get("timestamp_ms", transcript["timestamp_ms"])),
            "payload": action.get("payload", {}),
        }
        for action in transcript["actions"]
    ]
    normalized_actions.sort(key=lambda entry: (entry["timestamp_ms"], entry["type"], entry["target"]))

    base = {
        "origin": transcript["origin"],
        "timestamp_ms": int(transcript["timestamp_ms"]),
        "actions": normalized_actions,
        "meta": transcript.get("meta", {}),
    }
    digest = hashlib.sha256(_stable_json(base).encode("utf-8")).hexdigest()[:12].upper()
    base["evidence_id"] = f"SUMMIT-WEBMCP-{digest}"
    return base


@dataclass(slots=True)
class WebMCPSession:
    transcript: dict[str, Any]

    def to_evidence(self) -> dict[str, Any]:
        return normalize_session_transcript(self.transcript)
