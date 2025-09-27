from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from typing import Any, Dict, MutableMapping, Optional, Sequence

import requests
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey


@dataclass
class TokenClaims:
    """Structured representation of a policy-bound token."""

    sub: str
    aud: str
    backend: str
    key_id: str
    policy_claims: Dict[str, Any]
    exp: int
    iat: int
    jti: str


class KkpClient:
    """HTTP helper for talking to the Keyless KMS Proxy."""

    def __init__(self, base_url: str, session: Optional[requests.Session] = None) -> None:
        self.base_url = base_url.rstrip('/')
        self.session = session or requests.Session()

    def issue_token(self, payload: MutableMapping[str, Any]) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/token", json=payload, timeout=10
        )
        response.raise_for_status()
        return response.json()

    def decrypt(self, envelope: Dict[str, Any], token: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/envelope/decrypt",
            json={"envelope": envelope, "token": token, "context": context or {}},
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    def fetch_jwks(self) -> Sequence[Dict[str, str]]:
        response = self.session.get(f"{self.base_url}/keys/jwks", timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get("keys", [])


def _b64url_decode(segment: str) -> bytes:
    padding = '=' * ((4 - len(segment) % 4) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def verify_token(token: str, keys: Sequence[Dict[str, str]]) -> TokenClaims:
    """Verify an Ed25519 token using JWKS and return its claims."""

    try:
        header_b64, payload_b64, signature_b64 = token.split('.')
    except ValueError as exc:  # pragma: no cover - defensive
        raise ValueError("token format invalid") from exc

    header = json.loads(_b64url_decode(header_b64))
    if header.get("alg") != "EdDSA":
        raise ValueError("unsupported algorithm")
    kid = header.get("kid")
    if not kid:
        raise ValueError("token missing key id")

    jwk = next((key for key in keys if key.get("kid") == kid), None)
    if jwk is None:
        raise ValueError("unknown key id")

    public_key = _b64url_decode(jwk["x"])
    verify_key = VerifyKey(public_key)

    message = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = _b64url_decode(signature_b64)

    try:
        verify_key.verify(message, signature)
    except BadSignatureError as exc:  # pragma: no cover - defensive
        raise ValueError("signature invalid") from exc

    claims_dict = json.loads(_b64url_decode(payload_b64))
    claims = TokenClaims(**claims_dict)
    if claims.exp <= int(time.time()):
        raise ValueError("token expired")
    return claims
