"""GraphQL client helpers for IntelGraph integration."""

from __future__ import annotations

from typing import Any

import httpx


class GraphQLClient:
    """Tiny async GraphQL client used to call IntelGraph services."""

    def __init__(
        self, endpoint: str, api_key: str | None = None, timeout_seconds: int = 30
    ) -> None:
        self._endpoint = endpoint
        self._headers = {"Content-Type": "application/json"}
        if api_key:
            self._headers["x-api-key"] = api_key
        self._timeout = timeout_seconds

    async def execute(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = {"query": query, "variables": variables or {}}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(self._endpoint, json=payload, headers=self._headers)
            response.raise_for_status()
            data = response.json()
        if "errors" in data:
            raise RuntimeError(f"GraphQL error: {data['errors']}")
        return data.get("data", {})
