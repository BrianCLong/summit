"""Offline verification helpers for consent receipts."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:  # pragma: no cover - optional dependency
    from nacl.signing import VerifyKey
except ImportError:  # pragma: no cover
    VerifyKey = None  # type: ignore

from .dids import InMemoryDidResolver, public_key_from_multibase
from .revocation import JsonRevocationRegistry


@dataclass
class VerificationResult:
    verified: bool
    reason: Optional[str] = None


class ConsentVerifier:
    """Verify consent receipts offline."""

    def __init__(
        self,
        resolver: InMemoryDidResolver,
        revocations: JsonRevocationRegistry | None = None,
    ) -> None:
        self.resolver = resolver
        self.revocations = revocations

    async def verify(
        self,
        credential: Dict[str, Any],
        *,
        at_time: datetime | None = None,
    ) -> VerificationResult:
        proof = credential.get("proof")
        if not proof:
            return VerificationResult(False, "Missing proof")

        unsigned = dict(credential)
        unsigned.pop("proof", None)
        payload = _canonicalize(unsigned)

        if VerifyKey is None:
            return VerificationResult(False, "PyNaCl is required for signature verification")

        try:
            doc = await self.resolver.resolve(str(credential["issuer"]))
        except Exception as exc:  # pragma: no cover - passthrough
            return VerificationResult(False, str(exc))

        verification_method_id = proof.get("verificationMethod")
        method = next(
            (vm for vm in doc.verificationMethod if vm.id == verification_method_id),
            None,
        )
        if not method:
            return VerificationResult(False, "Verification method missing from DID document")

        public_key = public_key_from_multibase(method.publicKeyMultibase)
        signature = _b64url_decode(proof.get("proofValue", ""))

        try:
            VerifyKey(public_key).verify(payload, signature)
        except Exception:  # pragma: no cover - signature failure
            return VerificationResult(False, "Signature verification failed")

        now = at_time or datetime.now(timezone.utc)
        expiry = credential.get("expirationDate")
        if expiry:
            exp_raw = str(expiry)
            if exp_raw.endswith("Z"):
                exp_raw = exp_raw[:-1] + "+00:00"
            exp_time = datetime.fromisoformat(exp_raw)
            if exp_time.tzinfo is None:
                exp_time = exp_time.replace(tzinfo=timezone.utc)
            if now > exp_time:
                return VerificationResult(False, "Credential expired")

        if self.revocations:
            revoked = await self.revocations.is_revoked(str(credential["id"]))
            if revoked:
                return VerificationResult(False, "Credential revoked")

        return VerificationResult(True)


def _canonicalize(value: Dict[str, Any]) -> bytes:
    return json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _b64url_decode(value: str) -> bytes:
    padded = value + "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))
