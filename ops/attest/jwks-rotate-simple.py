#!/usr/bin/env python3
"""
Simplified JWKS Rotation Tool for MC Platform v0.3.5
Manages key rotation and JWKS generation (demo version)
"""

import argparse
import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta


class SimpleJWKSManager:
    """Simplified JWKS manager for demonstration"""

    def __init__(self):
        self.current_keys = {}

    def generate_demo_keypair(self, key_id: str) -> dict:
        """Generate demo key pair (not production-grade)"""

        # Generate random key material
        private_key = secrets.token_bytes(32)
        public_key = hashlib.sha256(private_key).digest()[:32]

        # Create simplified JWK
        jwk = {
            "kty": "oct",  # Symmetric key for demo
            "use": "sig",
            "kid": key_id,
            "alg": "HS256",
            "k": base64.urlsafe_b64encode(private_key).decode("utf-8").rstrip("="),
        }

        return {
            "key_id": key_id,
            "private_key": base64.b64encode(private_key).decode("utf-8"),
            "public_key": base64.b64encode(public_key).decode("utf-8"),
            "jwk": jwk,
            "created": datetime.utcnow().isoformat() + "Z",
        }

    def create_jwks(self, keys: list) -> dict:
        """Create JWKS from key list"""

        jwks = {
            "keys": [key["jwk"] for key in keys],
            "metadata": {
                "issuer": "mc-platform-v035",
                "created": datetime.utcnow().isoformat() + "Z",
                "rotation_policy": "90_days",
                "key_count": len(keys),
                "note": "Demo JWKS - use Ed25519 in production",
            },
        }

        return jwks

    def rotate_keys(self, current_key_id: str = None) -> dict:
        """Perform key rotation"""

        # Generate new key ID based on date
        date_suffix = datetime.utcnow().strftime("%Y%m")
        new_key_id = f"mc-v035-demo-{date_suffix}"

        # Generate new primary key
        new_key = self.generate_demo_keypair(new_key_id)

        # Keep previous key as secondary (if exists)
        keys = [new_key]

        if current_key_id and current_key_id != new_key_id:
            # Generate secondary key for overlap period
            secondary_key = self.generate_demo_keypair(f"{current_key_id}-secondary")
            keys.append(secondary_key)

        # Create JWKS
        jwks = self.create_jwks(keys)

        rotation_report = {
            "rotation_timestamp": datetime.utcnow().isoformat() + "Z",
            "new_primary_key": new_key_id,
            "keys_generated": len(keys),
            "rotation_reason": "scheduled_rotation",
            "next_rotation": (datetime.utcnow() + timedelta(days=90)).isoformat() + "Z",
            "overlap_period_days": 7,
            "algorithm": "HS256-demo",
            "production_note": "Use Ed25519 for production deployment",
        }

        return {"jwks": jwks, "keys": keys, "rotation_report": rotation_report}

    def generate_samples(self, jwks: dict, keys: list) -> list:
        """Generate sample signed tokens for testing"""

        samples = []

        for i, key in enumerate(keys[:2]):  # Max 2 samples
            # Create sample JWS payload
            sample_payload = {
                "requestId": f"req_{int(datetime.utcnow().timestamp() * 1000)}_{i}",
                "tenantId": f"TENANT_00{i+1}",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "inputHash": hashlib.sha256(f"sample_input_{i}".encode()).hexdigest()[:16],
                "outputHash": hashlib.sha256(f"sample_output_{i}".encode()).hexdigest()[:16],
                "model": "claude-3.5-sonnet",
                "cost": 0.0234 + (i * 0.001),
                "provDagId": f"dag_sample_{i}_{key['key_id']}",
            }

            # Create mock JWS token structure
            header = {"typ": "JWT", "alg": "HS256", "kid": key["key_id"]}
            header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
            payload_b64 = (
                base64.urlsafe_b64encode(json.dumps(sample_payload).encode()).decode().rstrip("=")
            )

            # Create mock signature
            signature_data = f"{header_b64}.{payload_b64}"
            mock_signature = hashlib.sha256(signature_data.encode()).hexdigest()[:32]

            mock_token = f"{header_b64}.{payload_b64}.{mock_signature}"

            sample = {
                "sample_id": f"sample_{i+1}_{key['key_id']}",
                "kid": key["key_id"],
                "mock_token": mock_token,
                "payload_claims": sample_payload,
                "verification_endpoint": f"/api/v2/attest/verify/{key['key_id']}",
                "created": datetime.utcnow().isoformat() + "Z",
                "note": "Demo token - implement proper JWS signing in production",
            }
            samples.append(sample)

        return samples


def main():
    parser = argparse.ArgumentParser(
        description="Simplified JWKS Rotation Tool for MC Platform v0.3.5"
    )
    parser.add_argument("--out", required=True, help="Output directory for JWKS and keys")
    parser.add_argument("--current-key-id", help="Current key ID for rotation")
    parser.add_argument(
        "--generate-samples", action="store_true", help="Generate sample signed tokens"
    )

    args = parser.parse_args()

    print("🔑 MC Platform v0.3.5 - Simplified JWKS Rotation Tool")
    print("=" * 60)
    print("⚠️  Demo version - use Ed25519 for production")

    manager = SimpleJWKSManager()

    # Perform key rotation
    print("\n🔄 Performing key rotation...")
    rotation_result = manager.rotate_keys(args.current_key_id)

    jwks = rotation_result["jwks"]
    keys = rotation_result["keys"]
    rotation_report = rotation_result["rotation_report"]

    print(f"  • New primary key: {rotation_report['new_primary_key']}")
    print(f"  • Keys generated: {rotation_report['keys_generated']}")
    print(f"  • Algorithm: {rotation_report['algorithm']}")
    print(f"  • Next rotation: {rotation_report['next_rotation']}")

    # Create output directory
    os.makedirs(args.out, exist_ok=True)

    # Save JWKS
    jwks_file = os.path.join(args.out, "jwks.json")
    with open(jwks_file, "w") as f:
        json.dump(jwks, f, indent=2)
    print(f"  • JWKS saved: {jwks_file}")

    # Save rotation report
    report_file = os.path.join(args.out, "rotation-report.json")
    with open(report_file, "w") as f:
        json.dump(rotation_report, f, indent=2)
    print(f"  • Rotation report: {report_file}")

    # Save private keys (secure location in production)
    keys_file = os.path.join(args.out, "private-keys.json")
    with open(keys_file, "w") as f:
        json.dump({"keys": keys}, f, indent=2)
    print(f"  • Private keys: {keys_file}")

    # Generate samples if requested
    if args.generate_samples:
        print("\n📝 Generating sample tokens...")
        samples = manager.generate_samples(jwks, keys)

        samples_dir = os.path.join(args.out, "signed-samples")
        os.makedirs(samples_dir, exist_ok=True)

        for sample in samples:
            sample_file = os.path.join(samples_dir, f"{sample['sample_id']}.json")
            with open(sample_file, "w") as f:
                json.dump(sample, f, indent=2)
            print(f"  • Sample: {sample_file}")

    # Summary
    print("\n✅ JWKS rotation completed successfully")
    print(f"🔗 Primary key ID: {rotation_report['new_primary_key']}")
    print(f"📅 Valid until: {rotation_report['next_rotation']}")

    # Production reminder
    print("\n🚀 Next steps:")
    print("  1. Deploy JWKS to /.well-known/jwks.json")
    print("  2. Update JWS service configuration")
    print("  3. Test token verification in staging")
    print(f"  4. Schedule next rotation: {rotation_report['next_rotation']}")
    print("  5. ⚠️  Implement Ed25519 for production deployment")


if __name__ == "__main__":
    main()
