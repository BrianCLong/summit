from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class CipherTensor:
    # placeholder for ciphertext-backed tensor
    payload: bytes

@runtime_checkable
class SecureBackend(Protocol):
    @property
    def name(self) -> str: ...
    def encrypt(self, x: bytes) -> CipherTensor: ...
    def decrypt(self, c: CipherTensor) -> bytes: ...

class PlaintextBackend:
    name = "plaintext"
    def encrypt(self, x: bytes) -> CipherTensor:
        # Mock encryption (identity)
        return CipherTensor(payload=x)
    def decrypt(self, c: CipherTensor) -> bytes:
        return c.payload

class HESimulatedBackend:
    name = "he_simulated"
    def encrypt(self, x: bytes) -> CipherTensor:
        return CipherTensor(payload=b"enc:" + x)
    def decrypt(self, c: CipherTensor) -> bytes:
        assert c.payload.startswith(b"enc:")
        return c.payload[4:]
