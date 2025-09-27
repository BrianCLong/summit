from __future__ import annotations

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

PolicyEntity = Dict[str, Any]


@dataclass
class PolicyDecision:
    allow: bool
    reason: str


class PolicyClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout: float = 5.0,
        transport: Optional[httpx.BaseTransport] = None,
    ) -> None:
        self._base_url = base_url.rstrip('/')
        self._timeout = timeout
        self._transport = transport
        self._client = httpx.Client(base_url=self._base_url, timeout=timeout, transport=transport)
        self._async_client: Optional[httpx.AsyncClient] = None

    def evaluate(
        self,
        *,
        subject: PolicyEntity,
        resource: PolicyEntity,
        action: str,
        context: PolicyEntity,
    ) -> PolicyDecision:
        response = self._client.post(
            '/v1/data/policy/decision',
            json={'input': {'subject': subject, 'resource': resource, 'action': action, 'context': context}},
        )
        response.raise_for_status()
        return self._parse_response(response.json())

    async def evaluate_async(
        self,
        *,
        subject: PolicyEntity,
        resource: PolicyEntity,
        action: str,
        context: PolicyEntity,
    ) -> PolicyDecision:
        client = await self._ensure_async_client()
        response = await client.post(
            '/v1/data/policy/decision',
            json={'input': {'subject': subject, 'resource': resource, 'action': action, 'context': context}},
        )
        response.raise_for_status()
        return self._parse_response(response.json())

    async def _ensure_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self._timeout,
                transport=self._transport,
            )
        return self._async_client

    def close(self) -> None:
        self._client.close()

    async def aclose(self) -> None:
        if self._async_client is not None:
            await self._async_client.aclose()
            self._async_client = None

    @staticmethod
    def _parse_response(data: Dict[str, Any]) -> PolicyDecision:
        result = data.get('result')
        if not isinstance(result, dict):
            raise ValueError('OPA response missing result')
        allow = bool(result.get('allow', False))
        reason = str(result.get('reason', 'unknown'))
        return PolicyDecision(allow=allow, reason=reason)


__all__ = ['PolicyClient', 'PolicyDecision', 'PolicyEntity']
