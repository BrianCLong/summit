"""Python client for the Temporal Access Token Service (TATS)."""
from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from typing import Dict, Iterable, Optional, Protocol

import requests
from nacl.signing import VerifyKey


@dataclass
class IssueTokenRequest:
    audience: str
    dataset_ids: Iterable[str]
    purposes: Iterable[str]
    row_scopes: Optional[Dict[str, Iterable[str]]] = None
    ttl_seconds: Optional[int] = None
    nonce: Optional[str] = None


@dataclass
class AttenuationRequest:
    parent_token: str
    dataset_ids: Optional[Iterable[str]] = None
    purposes: Optional[Iterable[str]] = None
    row_scopes: Optional[Dict[str, Iterable[str]]] = None
    ttl_seconds: Optional[int] = None
    nonce: Optional[str] = None


@dataclass
class TokenResponse:
    token: str
    token_id: str
    expires_at: int


@dataclass
class TokenClaims:
    jti: str
    audience: str
    dataset_ids: Iterable[str]
    purposes: Iterable[str]
    issued_at: int
    expires_at: int
    nonce: str
    parent: Optional[str] = None
    row_scopes: Optional[Dict[str, Iterable[str]]] = None


class ReplayCache(Protocol):
    def check_and_store(self, jti: str, expires_at: int) -> bool:
        """Return True if the token is new and recorded, False if replayed."""


class MemoryReplayCache:
    """Simple in-memory replay cache suitable for single-process verifiers."""

    def __init__(self) -> None:
        self._cache: Dict[str, int] = {}

    def check_and_store(self, jti: str, expires_at: int) -> bool:
        now = int(time.time())
        expired = [key for key, exp in self._cache.items() if exp <= now]
        for key in expired:
            self._cache.pop(key, None)
        if jti in self._cache:
            return False
        self._cache[jti] = expires_at
        return True


class TatsClient:
    def __init__(self, base_url: str, session: Optional[requests.Session] = None) -> None:
        self._base_url = base_url.rstrip('/')
        self._session = session or requests.Session()

    def issue_token(self, request: IssueTokenRequest) -> TokenResponse:
        payload = {
            'audience': request.audience,
            'dataset_ids': list(request.dataset_ids),
            'purposes': list(request.purposes),
        }
        if request.row_scopes is not None:
            payload['row_scopes'] = {k: list(v) for k, v in request.row_scopes.items()}
        if request.ttl_seconds is not None:
            payload['ttl_seconds'] = int(request.ttl_seconds)
        if request.nonce is not None:
            payload['nonce'] = request.nonce
        response = self._session.post(f'{self._base_url}/v1/tokens', json=payload, timeout=10)
        response.raise_for_status()
        return TokenResponse(**response.json())

    def attenuate(self, request: AttenuationRequest) -> TokenResponse:
        payload = {'parent_token': request.parent_token}
        if request.dataset_ids is not None:
            payload['dataset_ids'] = list(request.dataset_ids)
        if request.purposes is not None:
            payload['purposes'] = list(request.purposes)
        if request.row_scopes is not None:
            payload['row_scopes'] = {k: list(v) for k, v in request.row_scopes.items()}
        if request.ttl_seconds is not None:
            payload['ttl_seconds'] = int(request.ttl_seconds)
        if request.nonce is not None:
            payload['nonce'] = request.nonce
        response = self._session.post(f'{self._base_url}/v1/attenuate', json=payload, timeout=10)
        response.raise_for_status()
        return TokenResponse(**response.json())

    def public_key(self) -> str:
        response = self._session.get(f'{self._base_url}/v1/keys', timeout=5)
        response.raise_for_status()
        payload = response.json()
        return payload['public_key']


def verify_token(
    token: str,
    public_key: str | bytes,
    cache: ReplayCache,
    *,
    expected_audience: Optional[str] = None,
    required_datasets: Optional[Iterable[str]] = None,
    required_row_scopes: Optional[Dict[str, Iterable[str]]] = None,
    required_purposes: Optional[Iterable[str]] = None,
    now: Optional[int] = None,
) -> TokenClaims:
    header_b64, payload_b64, signature_b64 = _split_token(token)
    message = f"{header_b64}.{payload_b64}".encode()
    signature = base64.urlsafe_b64decode(_pad_base64(signature_b64))
    key_bytes = (
        base64.b64decode(public_key)
        if isinstance(public_key, str)
        else public_key
    )
    VerifyKey(key_bytes).verify(message, signature)

    claims_payload = json.loads(base64.urlsafe_b64decode(_pad_base64(payload_b64)))
    claims = TokenClaims(**claims_payload)

    current_time = now if now is not None else int(time.time())
    if claims.expires_at <= current_time:
        raise ValueError('token expired')
    if expected_audience and claims.audience != expected_audience:
        raise ValueError('audience mismatch')

    if required_datasets:
        datasets = set(claims.dataset_ids)
        if not set(required_datasets).issubset(datasets):
            raise ValueError('dataset mismatch')

    if required_row_scopes:
        row_scopes = {k: set(v) for k, v in (claims.row_scopes or {}).items()}
        datasets = set(claims.dataset_ids)
        for dataset, rows in required_row_scopes.items():
            if dataset not in row_scopes:
                if dataset not in datasets:
                    raise ValueError('row scope mismatch')
                continue
            if not set(rows).issubset(row_scopes[dataset]):
                raise ValueError('row scope mismatch')

    if required_purposes:
        purposes = set(claims.purposes)
        if not set(required_purposes).issubset(purposes):
            raise ValueError('purpose mismatch')

    if not cache.check_and_store(claims.jti, claims.expires_at):
        raise ValueError('replay detected')

    return claims


def _split_token(token: str) -> tuple[str, str, str]:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError('token format invalid')
    return parts[0], parts[1], parts[2]


def _pad_base64(value: str) -> str:
    return value + '=' * ((4 - len(value) % 4) % 4)
