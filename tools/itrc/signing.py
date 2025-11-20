"""Signing helpers for capsules and receipts."""

from __future__ import annotations

import base64
import hmac
from dataclasses import dataclass
from hashlib import sha256
from typing import Dict


SIGNATURE_ALGORITHM = "HMAC-SHA256"


@dataclass(frozen=True)
class Signature:
    algorithm: str
    key_id: str
    signature: str

    def as_dict(self) -> Dict[str, str]:
        return {
            "algorithm": self.algorithm,
            "key_id": self.key_id,
            "signature": self.signature,
        }


class Signer:
    """Utility that signs payloads and verifies signatures."""

    def __init__(self, key: bytes, key_id: str) -> None:
        if not key:
            raise ValueError("Signing key must not be empty")
        self._key = key
        self._key_id = key_id

    def sign(self, payload: bytes) -> Signature:
        digest = hmac.new(self._key, payload, sha256).digest()
        return Signature(algorithm=SIGNATURE_ALGORITHM, key_id=self._key_id, signature=base64.b64encode(digest).decode("ascii"))

    def verify(self, payload: bytes, signature: Signature) -> None:
        if signature.algorithm != SIGNATURE_ALGORITHM:
            raise ValueError(f"Unsupported signature algorithm: {signature.algorithm}")
        expected = hmac.new(self._key, payload, sha256).digest()
        provided = base64.b64decode(signature.signature)
        if not hmac.compare_digest(expected, provided):
            raise ValueError("Signature verification failed")


class Verifier:
    """Verifier that shares its implementation with :class:`Signer`."""

    def __init__(self, key: bytes) -> None:
        if not key:
            raise ValueError("Verification key must not be empty")
        self._key = key

    def verify(self, payload: bytes, signature: Signature) -> None:
        if signature.algorithm != SIGNATURE_ALGORITHM:
            raise ValueError(f"Unsupported signature algorithm: {signature.algorithm}")
        expected = hmac.new(self._key, payload, sha256).digest()
        provided = base64.b64decode(signature.signature)
        if not hmac.compare_digest(expected, provided):
            raise ValueError("Signature verification failed")


def signature_from_dict(data: Dict[str, str]) -> Signature:
    return Signature(algorithm=data["algorithm"], key_id=data["key_id"], signature=data["signature"])
