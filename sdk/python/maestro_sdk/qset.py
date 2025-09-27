from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx


@dataclass
class CreateRequestPayload:
    requester: str
    tool: str
    purpose: str
    scopes: Optional[list[str]] = None
    expires_at: Optional[str] = None

    def to_json(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "requester": self.requester,
            "tool": self.tool,
            "purpose": self.purpose,
        }
        if self.scopes is not None:
            payload["scopes"] = self.scopes
        if self.expires_at is not None:
            payload["expiresAt"] = self.expires_at
        return payload


class QsetClient:
    """Minimal client for the QSET service."""

    def __init__(self, base_url: str, approver_key: Optional[str] = None, *, client: Optional[httpx.Client] = None) -> None:
        self._base_url = base_url.rstrip('/')
        self._approver_key = approver_key
        self._client = client or httpx.Client(base_url=self._base_url)

    def close(self) -> None:
        self._client.close()

    def create_request(self, payload: CreateRequestPayload | Dict[str, Any]) -> Dict[str, Any]:
        body = payload.to_json() if isinstance(payload, CreateRequestPayload) else payload
        return self._post('/requests', json=body)

    def get_request(self, request_id: str) -> Dict[str, Any]:
        return self._get(f'/requests/{request_id}')

    def approve_request(self, request_id: str, approver_key: Optional[str] = None) -> Dict[str, Any]:
        return self._post(f'/requests/{request_id}/approve', approver_key=approver_key)

    def deny_request(self, request_id: str, approver_key: Optional[str] = None) -> Dict[str, Any]:
        return self._post(f'/requests/{request_id}/deny', approver_key=approver_key)

    def mint_token(self, request_id: str, approver_key: Optional[str] = None) -> Dict[str, Any]:
        return self._post(f'/requests/{request_id}/mint', approver_key=approver_key)

    def attenuate_token(self, token_id: str, payload: Dict[str, Any], approver_key: Optional[str] = None) -> Dict[str, Any]:
        return self._post(f'/tokens/{token_id}/attenuate', json=payload, approver_key=approver_key)

    def get_ledger_public_key(self) -> str:
        response = self._get('/ledger/public-key')
        return response['publicKey']

    def _headers(self, approver_key: Optional[str] = None) -> Dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        key = approver_key or self._approver_key
        if key:
            headers['X-Approver-Key'] = key
        return headers

    def _get(self, path: str) -> Dict[str, Any]:
        response = self._client.get(path, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def _post(
        self,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        approver_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        response = self._client.post(path, json=json, headers=self._headers(approver_key))
        response.raise_for_status()
        return response.json()

    def __enter__(self) -> "QsetClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()
