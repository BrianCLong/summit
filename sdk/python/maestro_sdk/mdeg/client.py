from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class Destination:
    provider: str
    bucket: str
    region: str


@dataclass
class TransferRequest:
    request_id: str
    destination: Destination
    data_class: str
    bytes: int
    policy_id: str = ""


@dataclass
class ManifestRecord:
    manifest_id: str
    request_id: str
    policy_id: str
    destination: Destination
    data_class: str
    bytes: int
    cost: float
    timestamp: str
    signature: str
    reconciled: bool
    provider_bytes: Optional[int] = None
    provider_cost: Optional[float] = None


@dataclass
class TransferResponse:
    allowed: bool
    reason: Optional[str]
    window_end: Optional[str]
    manifest: Optional[ManifestRecord]


class MdegClient:
    """Lightweight client for the Multicloud Data Egress Governor HTTP API."""

    def __init__(self, base_url: str, timeout: float = 10.0):
        self._client = httpx.Client(base_url=base_url, timeout=timeout)

    def close(self) -> None:
        self._client.close()

    def request_transfer(self, transfer: TransferRequest) -> TransferResponse:
        payload = {
            "requestId": transfer.request_id,
            "policyId": transfer.policy_id,
            "destination": {
                "provider": transfer.destination.provider,
                "bucket": transfer.destination.bucket,
                "region": transfer.destination.region,
            },
            "dataClass": transfer.data_class,
            "bytes": transfer.bytes,
        }
        response = self._client.post("/transfers", json=payload)
        response.raise_for_status()
        data = response.json()
        manifest_data = data.get("manifest")
        manifest = _parse_manifest(manifest_data) if manifest_data else None
        return TransferResponse(
            allowed=data.get("allowed", False),
            reason=data.get("reason"),
            window_end=data.get("windowEnd"),
            manifest=manifest,
        )

    def get_manifest(self, manifest_id: str) -> ManifestRecord:
        response = self._client.get(f"/manifests/{manifest_id}")
        response.raise_for_status()
        return _parse_manifest(response.json())

    def reconcile_manifest(self, manifest_id: str, provider_bytes: int, provider_cost: float) -> ManifestRecord:
        payload = {"providerBytes": provider_bytes, "providerCost": provider_cost}
        response = self._client.post(f"/manifests/{manifest_id}/reconcile", json=payload)
        response.raise_for_status()
        return _parse_manifest(response.json())

    def policies(self) -> dict:
        response = self._client.get("/policies")
        response.raise_for_status()
        return response.json()

    def __enter__(self) -> "MdegClient":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:  # type: ignore[override]
        self.close()


def _parse_manifest(data: dict) -> ManifestRecord:
    destination = data.get("destination", {})
    return ManifestRecord(
        manifest_id=data["manifestId"],
        request_id=data["requestId"],
        policy_id=data["policyId"],
        destination=Destination(
            provider=destination.get("provider", ""),
            bucket=destination.get("bucket", ""),
            region=destination.get("region", ""),
        ),
        data_class=data.get("dataClass", ""),
        bytes=data.get("bytes", 0),
        cost=data.get("cost", 0.0),
        timestamp=data.get("timestamp", ""),
        signature=data.get("signature", ""),
        reconciled=data.get("reconciled", False),
        provider_bytes=data.get("providerBytes"),
        provider_cost=data.get("providerCost"),
    )
