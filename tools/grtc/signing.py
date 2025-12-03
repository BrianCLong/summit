"""Signing helpers for GRTC manifests."""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass
class Signer:
    """Utility used to sign and verify manifest payloads."""

    key: bytes
    algorithm: str = "HMAC-SHA256"

    def sign_manifest(self, manifest: Mapping[str, Any]) -> str:
        payload = json.dumps(_strip_signature(manifest), sort_keys=True, separators=(",", ":"))
        digest = hmac.new(self.key, payload.encode("utf-8"), hashlib.sha256)
        return digest.hexdigest()

    def verify_manifest(self, manifest: Mapping[str, Any], signature: str) -> bool:
        expected = self.sign_manifest(manifest)
        return hmac.compare_digest(expected, signature)

    @staticmethod
    def digest(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()


def _strip_signature(manifest: Mapping[str, Any]) -> Mapping[str, Any]:
    if "signature" not in manifest:
        return manifest
    clean = dict(manifest)
    clean.pop("signature", None)
    return clean


def load_signer(key: str | bytes | None) -> Signer:
    if key is None:
        raise ValueError("Signing key must be provided.")
    if isinstance(key, str):
        key_bytes = key.encode("utf-8")
    else:
        key_bytes = key
    if not key_bytes:
        raise ValueError("Signing key may not be empty.")
    return Signer(key=key_bytes)


__all__ = ["Signer", "load_signer"]
