#!/usr/bin/env python3
"""
Post-Quantum Attestation (PQA) Verifier
MC Platform v0.3.8 - Quantum-Ready Equilibrium

Hybrid classical + post-quantum cryptographic verification for ultimate future-proof attestation.
Verifies Ed25519 (classical) + Dilithium2 (post-quantum) dual signatures.
"""

import json
import hmac
import hashlib
import base64
import time
from typing import Dict, Any, Optional, List, NamedTuple
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import logging

from .signer import PQAAttestation, PQASignature

logger = logging.getLogger(__name__)

class VerificationResult(NamedTuple):
    """PQA verification result"""
    valid: bool
    classical_valid: bool
    quantum_valid: bool
    timestamp_valid: bool
    signer_trusted: bool
    error_msg: Optional[str] = None

@dataclass
class TrustedSigner:
    """Trusted signer configuration"""
    signer_id: str
    classical_pubkey: bytes
    quantum_pubkey: bytes
    key_version: str
    valid_from: datetime
    valid_until: Optional[datetime] = None

class PQAVerifier:
    """Hybrid classical + post-quantum attestation verifier

    Provides future-proof cryptographic verification using dual signature validation:
    - Classical: Ed25519 (HMAC-SHA256 simulation for demo)
    - Post-Quantum: Dilithium2 (simulated for demo compatibility)

    SLA: <2ms verification latency, 100% quantum-readiness coverage
    """

    def __init__(self, trusted_signers: List[TrustedSigner],
                 max_age_minutes: int = 60):
        self.trusted_signers = {s.signer_id: s for s in trusted_signers}
        self.max_age = timedelta(minutes=max_age_minutes)

        # Performance metrics
        self.verify_count = 0
        self.verify_success_count = 0
        self.total_verify_time = 0.0

        logger.info(f"PQA Verifier initialized: {len(trusted_signers)} trusted signers, "
                   f"max_age={max_age_minutes}min")

    def verify_attestation(self, attestation: PQAAttestation) -> VerificationResult:
        """Verify post-quantum attestation with dual signature validation

        Args:
            attestation: PQA attestation to verify

        Returns:
            Comprehensive verification result
        """
        start_time = time.time()
        self.verify_count += 1

        try:
            # 1. Check signer trust
            signer_trusted, signer = self._check_signer_trust(attestation.signature)
            if not signer_trusted:
                return VerificationResult(
                    valid=False,
                    classical_valid=False,
                    quantum_valid=False,
                    timestamp_valid=False,
                    signer_trusted=False,
                    error_msg=f"Untrusted signer: {attestation.signature.signer_id}"
                )

            # 2. Check timestamp validity
            timestamp_valid = self._check_timestamp_validity(attestation.signature)
            if not timestamp_valid:
                return VerificationResult(
                    valid=False,
                    classical_valid=False,
                    quantum_valid=False,
                    timestamp_valid=False,
                    signer_trusted=True,
                    error_msg="Timestamp outside valid window"
                )

            # 3. Prepare verification data
            sign_data = {
                "payload": json.dumps(attestation.payload, sort_keys=True, separators=(',', ':')),
                "attestation_id": attestation.attestation_id,
                "timestamp": attestation.signature.timestamp,
                "signer_id": attestation.signature.signer_id,
                "key_version": attestation.signature.key_version,
                "metadata": attestation.metadata
            }

            # 4. Verify classical signature
            classical_valid = self._verify_classical(
                sign_data,
                attestation.signature.classical_sig,
                signer.classical_pubkey
            )

            # 5. Verify quantum signature
            quantum_valid = self._verify_quantum(
                sign_data,
                attestation.signature.quantum_sig,
                signer.quantum_pubkey
            )

            # 6. Overall validity requires both signatures
            overall_valid = classical_valid and quantum_valid and timestamp_valid

            if overall_valid:
                self.verify_success_count += 1

            result = VerificationResult(
                valid=overall_valid,
                classical_valid=classical_valid,
                quantum_valid=quantum_valid,
                timestamp_valid=timestamp_valid,
                signer_trusted=signer_trusted
            )

            # Update metrics
            verify_time = time.time() - start_time
            self.total_verify_time += verify_time

            logger.info(f"PQA verification: {attestation.attestation_id}, "
                       f"result={overall_valid}, verify_time={verify_time*1000:.2f}ms")

            return result

        except Exception as e:
            logger.error(f"PQA verification error: {e}")
            return VerificationResult(
                valid=False,
                classical_valid=False,
                quantum_valid=False,
                timestamp_valid=False,
                signer_trusted=False,
                error_msg=f"Verification error: {e}"
            )

    def _check_signer_trust(self, signature: PQASignature) -> tuple[bool, Optional[TrustedSigner]]:
        """Check if signer is trusted and key is valid"""
        signer = self.trusted_signers.get(signature.signer_id)
        if not signer:
            return False, None

        # Check key version match
        if signer.key_version != signature.key_version:
            return False, None

        # Check validity period
        now = datetime.now(timezone.utc)
        if now < signer.valid_from:
            return False, None

        if signer.valid_until and now > signer.valid_until:
            return False, None

        return True, signer

    def _check_timestamp_validity(self, signature: PQASignature) -> bool:
        """Check if signature timestamp is within valid window"""
        try:
            sig_time = datetime.fromisoformat(signature.timestamp.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)

            # Check not too old
            if now - sig_time > self.max_age:
                return False

            # Check not in future (allow 5min clock skew)
            if sig_time > now + timedelta(minutes=5):
                return False

            return True

        except Exception:
            return False

    def _verify_classical(self, data: Dict[str, Any], signature: str, pubkey: bytes) -> bool:
        """Verify classical cryptographic signature (Ed25519 simulation)"""
        try:
            canonical_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
            message_bytes = canonical_json.encode('utf-8')

            # Demo: HMAC-SHA256 verification (production would use Ed25519)
            expected_sig_bytes = hmac.new(
                pubkey,
                message_bytes,
                hashlib.sha256
            ).digest()

            provided_sig_bytes = base64.b64decode(signature)
            return hmac.compare_digest(expected_sig_bytes, provided_sig_bytes)

        except Exception as e:
            logger.warning(f"Classical signature verification error: {e}")
            return False

    def _verify_quantum(self, data: Dict[str, Any], signature: str, pubkey: bytes) -> bool:
        """Verify post-quantum signature (Dilithium2 simulation)"""
        try:
            canonical_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
            message_bytes = canonical_json.encode('utf-8')

            # Demo: Dilithium2 simulation using HMAC with quantum key
            # Production would use actual Dilithium2 verification
            expected_sig_bytes = hmac.new(
                pubkey,
                b"DILITHIUM2:" + message_bytes,
                hashlib.sha512
            ).digest()

            provided_sig_bytes = base64.b64decode(signature)
            return hmac.compare_digest(expected_sig_bytes, provided_sig_bytes)

        except Exception as e:
            logger.warning(f"Quantum signature verification error: {e}")
            return False

    def verify_attestation_chain(self, attestations: List[PQAAttestation]) -> List[VerificationResult]:
        """Verify a chain of linked attestations"""
        results = []
        chain_ids = set()

        for attestation in attestations:
            # Verify individual attestation
            result = self.verify_attestation(attestation)
            results.append(result)

            # Check chain integrity
            if attestation.chain_id in chain_ids:
                logger.warning(f"Duplicate chain_id detected: {attestation.chain_id}")

            chain_ids.add(attestation.chain_id)

        return results

    def get_performance_metrics(self) -> Dict[str, float]:
        """Get verifier performance metrics"""
        avg_verify_time = self.total_verify_time / max(self.verify_count, 1)
        success_rate = self.verify_success_count / max(self.verify_count, 1)

        return {
            "verify_count": self.verify_count,
            "verify_success_count": self.verify_success_count,
            "success_rate_pct": success_rate * 100,
            "avg_verify_time_ms": avg_verify_time * 1000,
            "total_verify_time_s": self.total_verify_time,
            "sla_compliance_pct": 100.0 if avg_verify_time < 0.002 else 0.0  # <2ms SLA
        }


def create_demo_verifier(signer_id: str = "mc-pqa-demo") -> PQAVerifier:
    """Create demo PQA verifier with simulated trusted signer"""
    # Demo keys (must match signer keys)
    classical_key = hashlib.sha256(f"{signer_id}:classical".encode()).digest()
    quantum_key = hashlib.sha256(f"{signer_id}:quantum".encode()).digest()

    trusted_signer = TrustedSigner(
        signer_id=signer_id,
        classical_pubkey=classical_key,
        quantum_pubkey=quantum_key,
        key_version="v1.0-hybrid",
        valid_from=datetime.now(timezone.utc) - timedelta(hours=1),
        valid_until=datetime.now(timezone.utc) + timedelta(days=365)
    )

    return PQAVerifier([trusted_signer], max_age_minutes=60)


if __name__ == "__main__":
    # Demo usage
    from .signer import create_demo_signer

    # Create signer and verifier
    signer = create_demo_signer("mc-platform-v038")
    verifier = create_demo_verifier("mc-platform-v038")

    # Test attestation
    test_payload = {
        "service": "agent-workbench",
        "operation": "policy_enforcement",
        "result": "allowed",
        "policy_hash": "sha256:abc123...",
        "tenant_id": "TENANT_001"
    }

    # Sign and verify
    attestation = signer.sign_attestation(test_payload)
    result = verifier.verify_attestation(attestation)

    print("=== PQA Verification Demo ===")
    print(f"Verification Result: {result}")
    print(f"Signer Performance: {signer.get_performance_metrics()}")
    print(f"Verifier Performance: {verifier.get_performance_metrics()}")