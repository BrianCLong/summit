"""Lightweight Python client for the Query-Time Pseudonymization Gateway."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional


class QpgError(RuntimeError):
    """Raised when the gateway returns a non-success status code."""


@dataclass
class TokenizeResult:
    payload: Dict[str, Any]


class QpgClient:
    """Client for interacting with the QPG service."""

    def __init__(self, base_url: str, opener: Optional[urllib.request.OpenerDirector] = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._opener = opener or urllib.request.build_opener()

    def tokenize(self, tenant: str, purpose: str, payload: Dict[str, Any]) -> TokenizeResult:
        body = json.dumps({"tenant": tenant, "purpose": purpose, "payload": payload}).encode("utf-8")
        request = urllib.request.Request(
            url=f"{self._base_url}/tokenize",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        response = self._execute(request)
        data = json.loads(response.read().decode("utf-8"))
        return TokenizeResult(payload=data["payload"])

    def reveal(self, tenant: str, purpose: str, field: str, token: str, shares: Iterable[str]) -> str:
        body = json.dumps(
            {
                "tenant": tenant,
                "purpose": purpose,
                "field": field,
                "token": token,
                "shares": list(shares),
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            url=f"{self._base_url}/reveal",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        response = self._execute(request)
        data = json.loads(response.read().decode("utf-8"))
        return data["value"]

    def _execute(self, request: urllib.request.Request) -> urllib.response.addinfourl:
        try:
            response = self._opener.open(request)
        except urllib.error.HTTPError as exc:  # pragma: no cover - thin wrapper
            raise QpgError(f"gateway returned {exc.code}") from exc
        return response
