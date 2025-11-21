"""SafeJoin Python SDK for interacting with the SafeJoin PSI engine."""
from __future__ import annotations

import base64
import dataclasses
import hashlib
import hmac
import math
import secrets
import time
from typing import Dict, Iterable, List, Optional, Tuple

import requests
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

DEFAULT_BLOOM_M = 2048
DEFAULT_BLOOM_K = 3


def _laplace_noise(scale: float) -> float:
    u = secrets.randbelow(10_000_000) / 10_000_000.0
    magnitude = max(1e-12, 1.0 - 2.0 * abs(u - 0.5))
    return -scale * math.copysign(1.0, u - 0.5) * math.log(magnitude)


@dataclasses.dataclass
class NoisyAggregate:
    noisy_sum: float
    noisy_count: float


class SimpleBloom:
    """Simple bloom filter compatible with the SafeJoin service."""

    def __init__(self, m: int = DEFAULT_BLOOM_M, k: int = DEFAULT_BLOOM_K):
        self.m = m
        self.k = k
        self.bits = bytearray((m + 7) // 8)

    def insert(self, value: bytes) -> None:
        for i in range(self.k):
            digest = hashlib.sha256(value + bytes([i])).digest()
            idx = int.from_bytes(digest[:8], "big") % self.m
            self.bits[idx // 8] |= 1 << (idx % 8)

    def encode(self) -> Dict[str, object]:
        return {
            "m": self.m,
            "k": self.k,
            "bits": base64.b64encode(bytes(self.bits)).decode("utf-8"),
        }


class SafeJoinParticipant:
    def __init__(self) -> None:
        self._private_key = x25519.X25519PrivateKey.generate()
        public_key = self._private_key.public_key()
        self.public_key_b64 = base64.b64encode(
            public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)
        ).decode("utf-8")

    def derive_shared_secret(self, peer_public_key: str) -> bytes:
        peer_bytes = base64.b64decode(peer_public_key)
        peer_key = x25519.X25519PublicKey.from_public_bytes(peer_bytes)
        shared = self._private_key.exchange(peer_key)
        return shared

    @staticmethod
    def hash_tokens(shared_secret: bytes, keys: Iterable[str]) -> List[str]:
        tokens: List[str] = []
        for key in keys:
            mac = hmac.new(shared_secret, key.encode("utf-8"), hashlib.sha256)
            tokens.append(base64.b64encode(mac.digest()).decode("utf-8"))
        return tokens

    @staticmethod
    def aggregates_with_noise(
        hashed_tokens: Iterable[str],
        values: Iterable[float],
        epsilon: float,
        shared_secret: bytes,
    ) -> Dict[str, NoisyAggregate]:
        scale = 1.0 / max(epsilon, 1e-6)
        aggregates: Dict[str, NoisyAggregate] = {}
        for token, value in zip(hashed_tokens, values):
            entry = aggregates.setdefault(token, NoisyAggregate(0.0, 0.0))
            entry.noisy_sum += value + _laplace_noise(scale)
            entry.noisy_count += 1.0 + _laplace_noise(scale)
        return aggregates


class SafeJoinClient:
    """HTTP client for orchestrating SafeJoin sessions."""

    def __init__(self, base_url: str, session: Optional[requests.Session] = None):
        self.base_url = base_url.rstrip("/")
        self.session = session or requests.Session()

    def create_session(
        self,
        mode: str,
        expected_participants: int = 2,
        epsilon: Optional[float] = None,
        fault_probability: Optional[float] = None,
    ) -> str:
        payload: Dict[str, object] = {"mode": mode, "expected_participants": expected_participants}
        if epsilon is not None:
            payload.setdefault("mode_config", {})
        if mode == "aggregate":
            payload = {
                "mode": {"mode": "aggregate", "epsilon": epsilon or 1.0},
                "expected_participants": expected_participants,
                "fault_probability": fault_probability,
            }
        else:
            payload = {
                "mode": {"mode": "intersection_only"},
                "expected_participants": expected_participants,
                "fault_probability": fault_probability,
            }
        resp = self.session.post(f"{self.base_url}/sessions", json=payload)
        resp.raise_for_status()
        return resp.json()["session_id"]

    def register(self, session_id: str, participant: SafeJoinParticipant, participant_id: str) -> Optional[str]:
        resp = self.session.post(
            f"{self.base_url}/sessions/{session_id}/register",
            json={"participant_id": participant_id, "public_key": participant.public_key_b64},
        )
        if resp.status_code == 202:
            return None
        resp.raise_for_status()
        data = resp.json()
        return data.get("peer_public_key")

    def wait_for_peer(self, session_id: str, participant_id: str, timeout: float = 30.0) -> str:
        deadline = time.time() + timeout
        while time.time() < deadline:
            resp = self.session.get(
                f"{self.base_url}/sessions/{session_id}/peer",
                params={"participant_id": participant_id},
            )
            if resp.status_code == 202:
                time.sleep(0.5)
                continue
            resp.raise_for_status()
            return resp.json()["peer_public_key"]
        raise TimeoutError("peer not available within timeout")

    def upload(
        self,
        session_id: str,
        participant_id: str,
        hashed_tokens: List[str],
        bloom: SimpleBloom,
        aggregates: Optional[Dict[str, NoisyAggregate]] = None,
    ) -> None:
        payload: Dict[str, object] = {
            "participant_id": participant_id,
            "hashed_tokens": hashed_tokens,
            "bloom_filter": bloom.encode(),
        }
        if aggregates:
            payload["aggregates"] = {
                token: dataclasses.asdict(report) for token, report in aggregates.items()
            }
        resp = self.session.post(f"{self.base_url}/sessions/{session_id}/upload", json=payload)
        resp.raise_for_status()

    def fetch_result(self, session_id: str) -> Dict[str, object]:
        resp = self.session.get(f"{self.base_url}/sessions/{session_id}/result")
        resp.raise_for_status()
        return resp.json()


def prepare_payload(
    participant: SafeJoinParticipant,
    peer_public_key: str,
    records: Iterable[Tuple[str, float]],
    epsilon: Optional[float] = None,
) -> Tuple[List[str], SimpleBloom, Optional[Dict[str, NoisyAggregate]]]:
    shared_secret = participant.derive_shared_secret(peer_public_key)
    keys = [k for k, _ in records]
    hashed_tokens = participant.hash_tokens(shared_secret, keys)
    bloom = SimpleBloom()
    for token in hashed_tokens:
        bloom.insert(base64.b64decode(token))
    aggregates: Optional[Dict[str, NoisyAggregate]] = None
    if epsilon is not None:
        values = [v for _, v in records]
        aggregates = participant.aggregates_with_noise(hashed_tokens, values, epsilon, shared_secret)
    return hashed_tokens, bloom, aggregates
