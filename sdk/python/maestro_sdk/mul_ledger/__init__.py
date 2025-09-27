"""Model Usage Ledger SDK for Python."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, Iterable, List, Optional
import json
import time

import httpx


@dataclass
class ModelUsageEvent:
    """Data structure describing a single model usage event."""

    model: str
    version: str
    dataset_lineage_id: str
    consent_scope: str
    dp_budget_spend: float
    policy_hash: str
    output_artifact_ids: Iterable[str]
    event_id: Optional[str] = None
    timestamp: Optional[str] = None

    def to_payload(self) -> Dict[str, Any]:
        data = asdict(self)
        data["output_artifact_ids"] = list(self.output_artifact_ids)
        return data


class MulLedgerClient:
    """Client for interacting with the MUL ledger HTTP API."""

    def __init__(
        self,
        base_url: str,
        *,
        client: Optional[httpx.Client] = None,
        timeout: float = 5.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = client or httpx.Client(base_url=self._base_url, timeout=timeout)
        self._owns_client = client is None

    def __enter__(self) -> "MulLedgerClient":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def log_event(self, event: ModelUsageEvent) -> Dict[str, Any]:
        response = self._client.post("/events", json=event.to_payload())
        response.raise_for_status()
        return response.json()

    def query_events(self, **filters: Any) -> List[Dict[str, Any]]:
        response = self._client.get("/events", params=filters)
        response.raise_for_status()
        payload = response.json()
        events = payload.get("events")
        if isinstance(events, list):
            return events
        raise ValueError("Unexpected response payload for events query")

    def integrity_status(self) -> Dict[str, Any]:
        response = self._client.get("/integrity")
        if response.status_code == 409:
            return response.json()
        response.raise_for_status()
        return response.json()

    def export_monthly_compliance_pack(self, month: str) -> Dict[str, Any]:
        response = self._client.get("/compliance-pack", params={"month": month})
        response.raise_for_status()
        return response.json()

    def benchmark_log_event(self, event: ModelUsageEvent, iterations: int = 25) -> float:
        durations: List[float] = []
        for _ in range(iterations):
            start = time.perf_counter()
            self.log_event(event)
            durations.append(time.perf_counter() - start)
        return sum(durations) / len(durations)


class MockTransportFactory:
    """Utilities for creating mock transports during testing."""

    @staticmethod
    def create(responses: Dict[str, Dict[str, Any]]) -> httpx.MockTransport:
        def handler(request: httpx.Request) -> httpx.Response:
            key = f"{request.method} {request.url.path}"
            data = responses.get(key)
            if data is None:
                return httpx.Response(404, json={"error": "not found"})
            body = data.get("json")
            if callable(body):
                body = body(json.loads(request.content.decode("utf-8")))
            return httpx.Response(data.get("status", 200), json=body)

        return httpx.MockTransport(handler)

