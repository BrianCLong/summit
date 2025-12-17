from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

import httpx


@dataclass
class RowScope:
    """Represents a DLC row scope."""

    kind: str
    rows: Optional[List[str]] = None

    @classmethod
    def all(cls) -> "RowScope":
        return cls(kind="all")

    @classmethod
    def explicit(cls, rows: Iterable[str]) -> "RowScope":
        return cls(kind="explicit", rows=list(rows))

    def to_payload(self) -> Dict[str, Any]:
        if self.kind == "explicit":
            return {"kind": "explicit", "rows": list(self.rows or [])}
        return {"kind": "all"}


@dataclass
class LeaseSpec:
    dataset_id: str
    purposes: List[str]
    row_scope: RowScope
    expiry: str
    revocation_hook: Optional[str] = None

    def to_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "dataset_id": self.dataset_id,
            "purposes": list(self.purposes),
            "row_scope": self.row_scope.to_payload(),
            "expiry": self.expiry,
        }
        if self.revocation_hook is not None:
            payload["revocation_hook"] = self.revocation_hook
        return payload


class DlcClient:
    """Lightweight HTTP client for the DLC service."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout: Optional[float] = 10.0,
        client: Optional[httpx.Client] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        if client is None:
            self._client = httpx.Client(base_url=self._base_url, timeout=timeout)
            self._owns_client = True
        else:
            self._client = client
            self._owns_client = False

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "DlcClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        self.close()

    def create_lease(self, spec: LeaseSpec) -> Dict[str, Any]:
        response = self._client.post("/leases", json=spec.to_payload())
        response.raise_for_status()
        return response.json()

    def attenuate(self, parent_id: str, spec: LeaseSpec) -> Dict[str, Any]:
        response = self._client.post(f"/leases/{parent_id}/attenuate", json=spec.to_payload())
        response.raise_for_status()
        return response.json()

    def record_access(self, lease_id: str, row_id: str) -> Dict[str, Any]:
        response = self._client.post(f"/leases/{lease_id}/access", json={"row_id": row_id})
        response.raise_for_status()
        return response.json()

    def close_lease(self, lease_id: str) -> Dict[str, Any]:
        response = self._client.post(f"/leases/{lease_id}/close")
        response.raise_for_status()
        return response.json()

    def revoke_lease(self, lease_id: str, reason: Optional[str] = None) -> None:
        response = self._client.post(f"/leases/{lease_id}/revoke", json={"reason": reason})
        response.raise_for_status()

    def list_leases(self) -> List[Dict[str, Any]]:
        response = self._client.get("/leases")
        response.raise_for_status()
        return response.json()

    def get_lease(self, lease_id: str) -> Dict[str, Any]:
        response = self._client.get(f"/leases/{lease_id}")
        response.raise_for_status()
        return response.json()
