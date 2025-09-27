"""Signed evaluation report generation."""

from __future__ import annotations

import hmac
import json
from dataclasses import asdict, is_dataclass
from hashlib import sha256
from typing import Any, Mapping, Sequence


def _serialize(obj: Any) -> Any:
    if is_dataclass(obj):
        return {k: _serialize(v) for k, v in asdict(obj).items()}
    if isinstance(obj, Mapping):
        return {str(k): _serialize(v) for k, v in sorted(obj.items())}
    if isinstance(obj, Sequence) and not isinstance(obj, (str, bytes, bytearray)):
        return [_serialize(v) for v in obj]
    return obj


def _canonical_json(payload: Mapping[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def generate_report(payload: Mapping[str, Any], secret: str) -> bytes:
    serialized = _serialize(payload)
    canonical = _canonical_json({"payload": serialized})
    signature = hmac.new(secret.encode("utf-8"), canonical, sha256).hexdigest()
    return _canonical_json({"payload": serialized, "signature": signature})


def verify_report(report_bytes: bytes, secret: str) -> bool:
    document = json.loads(report_bytes.decode("utf-8"))
    signature = document.get("signature", "")
    payload = {"payload": document.get("payload")}
    canonical = _canonical_json(payload)
    expected = hmac.new(secret.encode("utf-8"), canonical, sha256).hexdigest()
    return hmac.compare_digest(signature, expected)

