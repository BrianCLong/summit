"""DID resolution helpers for offline verification."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List

from .base58 import b58decode

ED25519_PREFIX = b"\xed\x01"


@dataclass
class VerificationMethod:
    id: str
    type: str
    controller: str
    publicKeyMultibase: str


@dataclass
class DidDocument:
    id: str
    assertionMethod: List[str]
    verificationMethod: List[VerificationMethod] = field(default_factory=list)


class InMemoryDidResolver:
    """Resolver that holds DID documents in memory."""

    def __init__(self, docs: Iterable[DidDocument] | None = None) -> None:
        self._docs: Dict[str, DidDocument] = {}
        if docs:
            for doc in docs:
                self.register(doc)

    def register(self, doc: DidDocument) -> None:
        self._docs[doc.id] = doc

    async def resolve(self, did: str) -> DidDocument:
        if did.startswith("did:key:"):
            return derive_did_key_document(did)
        try:
            return self._docs[did]
        except KeyError as exc:
            raise KeyError(f"DID document not found for {did}") from exc


def derive_did_key_document(did: str) -> DidDocument:
    fragment = f"{did}#keys-1"
    return DidDocument(
        id=did,
        assertionMethod=[fragment],
        verificationMethod=[
            VerificationMethod(
                id=fragment,
                type="Ed25519VerificationKey2020",
                controller=did,
                publicKeyMultibase=did.replace("did:key:", ""),
            )
        ],
    )


def public_key_from_multibase(multibase: str) -> bytes:
    if not multibase.startswith("z"):
        raise ValueError("Only base58-btc multibase keys are supported")
    decoded = b58decode(multibase[1:])
    if not decoded.startswith(ED25519_PREFIX):
        raise ValueError("Unsupported multicodec prefix for did:key")
    key = decoded[len(ED25519_PREFIX) :]
    if len(key) != 32:
        raise ValueError("Expected 32-byte Ed25519 public key")
    return key
