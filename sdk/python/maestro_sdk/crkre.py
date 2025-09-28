from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

import httpx


@dataclass
class ShareBackendConfig:
    backend: str


@dataclass
class CreateKeyParams:
    jurisdiction: str
    residency: str
    purpose: str
    threshold: int
    shares: List[ShareBackendConfig]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "jurisdiction": self.jurisdiction,
            "residency": self.residency,
            "purpose": self.purpose,
            "threshold": self.threshold,
            "shares": [asdict(share) for share in self.shares],
        }


@dataclass
class ProvidedShare:
    share_id: str
    share: str

    def to_payload(self) -> Dict[str, str]:
        return {"share_id": self.share_id, "share": self.share}


@dataclass
class DecryptionParams:
    key_id: str
    jurisdiction: str
    residency: str
    purpose: str
    nonce: str
    ciphertext: str
    shares: List[ProvidedShare]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "key_id": self.key_id,
            "jurisdiction": self.jurisdiction,
            "residency": self.residency,
            "purpose": self.purpose,
            "nonce": self.nonce,
            "ciphertext": self.ciphertext,
            "shares": [share.to_payload() for share in self.shares],
        }


@dataclass
class QuorumRecoveryRequest:
    key_id: str
    shares: List[ProvidedShare]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "key_id": self.key_id,
            "shares": [share.to_payload() for share in self.shares],
        }


class CRKREClient:
    """Asynchronous client for the CRKRE jurisdiction-aware key router."""

    def __init__(
        self,
        base_url: str,
        client: Optional[httpx.AsyncClient] = None,
        timeout: float = 10.0,
    ) -> None:
        self._client = client or httpx.AsyncClient(base_url=base_url, timeout=timeout)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def health(self) -> bool:
        response = await self._client.get("/health")
        response.raise_for_status()
        payload = response.json()
        return payload.get("status") == "ok"

    async def create_key(self, params: CreateKeyParams) -> Dict[str, Any]:
        response = await self._client.post("/keys", json=params.to_payload())
        response.raise_for_status()
        return response.json()

    async def encrypt(
        self,
        key_id: str,
        jurisdiction: str,
        residency: str,
        purpose: str,
        plaintext_b64: str,
    ) -> Dict[str, Any]:
        response = await self._client.post(
            "/encrypt",
            json={
                "key_id": key_id,
                "jurisdiction": jurisdiction,
                "residency": residency,
                "purpose": purpose,
                "plaintext": plaintext_b64,
            },
        )
        response.raise_for_status()
        return response.json()

    async def decrypt(self, params: DecryptionParams) -> Dict[str, Any]:
        response = await self._client.post("/decrypt", json=params.to_payload())
        response.raise_for_status()
        return response.json()

    async def recover_quorum(self, request: QuorumRecoveryRequest) -> Dict[str, Any]:
        response = await self._client.post("/quorum/recover", json=request.to_payload())
        response.raise_for_status()
        return response.json()

    async def list_provenance(self, key_id: str) -> List[Dict[str, Any]]:
        response = await self._client.get(f"/keys/{key_id}/provenance")
        response.raise_for_status()
        return response.json()

    async def create_escrow(
        self,
        key_id: str,
        share_ids: List[str],
        ttl_seconds: int,
    ) -> Dict[str, Any]:
        response = await self._client.post(
            f"/keys/{key_id}/escrow",
            json={"share_ids": share_ids, "ttl_seconds": ttl_seconds},
        )
        response.raise_for_status()
        return response.json()

    async def fetch_escrow(self, escrow_id: str) -> Dict[str, Any]:
        response = await self._client.get(f"/escrow/{escrow_id}")
        response.raise_for_status()
        return response.json()


__all__ = [
    "CRKREClient",
    "CreateKeyParams",
    "DecryptionParams",
    "ProvidedShare",
    "QuorumRecoveryRequest",
    "ShareBackendConfig",
]
