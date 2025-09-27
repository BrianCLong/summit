"""Typed HTTP client for the slice registry."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Mapping, Optional

import httpx


@dataclass(frozen=True)
class SliceHandle:
    name: str
    version: str


class SliceRegClient:
    """High level helper for fetching versioned slices for training/eval."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout: Optional[float] = 10.0,
        client: Optional[httpx.Client] = None,
    ) -> None:
        self._own_client = client is None
        self._client = client or httpx.Client(base_url=base_url, timeout=timeout)

    def close(self) -> None:
        if self._own_client:
            self._client.close()

    def get_slice(self, name: str, version: str) -> Dict[str, Any]:
        response = self._client.get(f"/slices/{name}/{version}")
        response.raise_for_status()
        return response.json()

    # The API mirrors the naming from product requirements.
    def getSlice(self, handle: SliceHandle | str, version: Optional[str] = None) -> Dict[str, Any]:
        if isinstance(handle, SliceHandle):
            name = handle.name
            ver = handle.version
        else:
            if version is None:
                raise ValueError("version must be provided when handle is a string")
            name = handle
            ver = version
        return self.get_slice(name, ver)

    def diff(self, name: str, baseline: str, candidate: str) -> Dict[str, Any]:
        response = self._client.get(f"/slices/{name}/{baseline}/diff/{candidate}")
        response.raise_for_status()
        return response.json()

    def coverage(
        self,
        name: str,
        version: str,
        traffic_events: Iterable[Mapping[str, Any]],
    ) -> Dict[str, Any]:
        payload = {"traffic_events": [dict(event) for event in traffic_events]}
        response = self._client.post(f"/slices/{name}/{version}/coverage", json=payload)
        response.raise_for_status()
        return response.json()

    def list_versions(self, name: str) -> Dict[str, Any]:
        response = self._client.get(f"/slices/{name}")
        response.raise_for_status()
        return response.json()

    def __enter__(self) -> "SliceRegClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
