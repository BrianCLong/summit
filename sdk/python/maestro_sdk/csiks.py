from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

import httpx


class CsiksError(Exception):
    """Raised when the CSIKS service returns a non-success response."""

    def __init__(self, status_code: int, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.details = details


@dataclass
class IssueRequest:
    tenant: str
    action: str
    resource: str
    ttl_seconds: Optional[int] = None
    issued_by: Optional[str] = None
    metadata: Optional[Any] = None


@dataclass
class IssueResponse:
    idempotency_key: str
    expires_at: str
    status: str


@dataclass
class VerifyRequest:
    tenant: str
    action: str
    resource: str
    idempotency_key: str
    fingerprint: Optional[str] = None
    participant: Optional[str] = None
    dedupe_token: Optional[str] = None


@dataclass
class VerifyResponse:
    status: str
    dedupe_count: int
    expires_at: str
    last_seen: str
    conflict_reason: Optional[str]
    replay_hint: Optional[str]
    result: Optional[Any]
    journal: List['JournalEntry']


@dataclass
class CompleteRequest:
    tenant: str
    action: str
    resource: str
    idempotency_key: str
    participant: Optional[str] = None
    success: bool = True
    result: Optional[Any] = None
    note: Optional[str] = None


@dataclass
class CompleteResponse:
    status: str
    result: Optional[Any]
    journal: List['JournalEntry']


@dataclass
class RecordView:
    status: str
    tenant: str
    action: str
    resource: str
    fingerprint: Optional[str]
    dedupe_count: int
    created_at: str
    last_seen: str
    expires_at: str
    conflict_reason: Optional[str]
    result: Optional[Any]
    journal: List['JournalEntry']


@dataclass
class JournalEntry:
    timestamp: str
    participant: Optional[str]
    event: str
    note: Optional[str]
    fingerprint: Optional[str]
    dedupe_count: int
    details: Optional[Any]


class CsiksClient:
    """Minimal async client for the Cross-System Idempotency Key Service."""

    def __init__(
        self,
        base_url: str,
        *,
        headers: Optional[Dict[str, str]] = None,
        timeout: float = 10.0,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self._base_url = base_url.rstrip('/')
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers=headers,
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def issue_key(self, request: IssueRequest) -> IssueResponse:
        response = await self._request('POST', '/keys/issue', json=_drop_none(asdict(request)))
        return _parse_issue_response(response.json())

    async def verify_key(self, request: VerifyRequest) -> VerifyResponse:
        response = await self._request('POST', '/keys/verify', json=_drop_none(asdict(request)))
        return _parse_verify_response(response.json())

    async def complete_key(self, request: CompleteRequest) -> CompleteResponse:
        response = await self._request('POST', '/keys/complete', json=_drop_none(asdict(request)))
        return _parse_complete_response(response.json())

    async def get_record(self, key: str) -> RecordView:
        response = await self._request('GET', f'/keys/{key}')
        return _parse_record_view(response.json())

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        response = await self._client.request(method, path, **kwargs)
        if response.is_error:
            try:
                details = response.json()
                message = details.get('error', response.text)
            except ValueError:
                details = None
                message = response.text
            raise CsiksError(response.status_code, message, details)
        return response


def _drop_none(data: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in data.items() if value is not None}


def _parse_journal(entries: List[Dict[str, Any]]) -> List[JournalEntry]:
    return [
        JournalEntry(
            timestamp=entry['timestamp'],
            participant=entry.get('participant'),
            event=entry['event'],
            note=entry.get('note'),
            fingerprint=entry.get('fingerprint'),
            dedupe_count=entry['dedupe_count'],
            details=entry.get('details'),
        )
        for entry in entries
    ]


def _parse_issue_response(payload: Dict[str, Any]) -> IssueResponse:
    return IssueResponse(
        idempotency_key=payload['idempotency_key'],
        expires_at=payload['expires_at'],
        status=payload['status'],
    )


def _parse_verify_response(payload: Dict[str, Any]) -> VerifyResponse:
    return VerifyResponse(
        status=payload['status'],
        dedupe_count=payload['dedupe_count'],
        expires_at=payload['expires_at'],
        last_seen=payload['last_seen'],
        conflict_reason=payload.get('conflict_reason'),
        replay_hint=payload.get('replay_hint'),
        result=payload.get('result'),
        journal=_parse_journal(payload['journal']),
    )


def _parse_complete_response(payload: Dict[str, Any]) -> CompleteResponse:
    return CompleteResponse(
        status=payload['status'],
        result=payload.get('result'),
        journal=_parse_journal(payload['journal']),
    )


def _parse_record_view(payload: Dict[str, Any]) -> RecordView:
    return RecordView(
        status=payload['status'],
        tenant=payload['tenant'],
        action=payload['action'],
        resource=payload['resource'],
        fingerprint=payload.get('fingerprint'),
        dedupe_count=payload['dedupe_count'],
        created_at=payload['created_at'],
        last_seen=payload['last_seen'],
        expires_at=payload['expires_at'],
        conflict_reason=payload.get('conflict_reason'),
        result=payload.get('result'),
        journal=_parse_journal(payload['journal']),
    )
