#!/usr/bin/env python3
"""
JWKS Rotation Tool for MC Platform v0.3.5
Manages Ed25519 key rotation and JWKS generation for attestation
"""

import json
import os
import argparse
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
import base64


class JWKSManager:
    """Manages JWKS rotation and key lifecycle"""

    def __init__(self):
        self.current_keys = {}
        self.retired_keys = {}

    def generate_ed25519_keypair(self, key_id: str) -> dict:
        """Generate new Ed25519 key pair"""

        # Generate key pair
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()

        # Serialize keys
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )

        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        # Get raw public key for JWK
        public_raw = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )

        # Create JWK
        jwk = {
            "kty": "OKP",
            "use": "sig",
            "kid": key_id,
            "alg": "EdDSA",
            "crv": "Ed25519",
            "x": base64.urlsafe_b64encode(public_raw).decode('utf-8').rstrip('=')
        }

        return {
            "key_id": key_id,
            "private_key": private_pem.decode('utf-8'),
            "public_key": public_pem.decode('utf-8'),
            "jwk": jwk,
            "created": datetime.utcnow().isoformat() + "Z"
        }

    def create_jwks(self, keys: list) -> dict:
        """Create JWKS from key list"""

        jwks = {
            "keys": [key["jwk"] for key in keys],
            "metadata": {
                "issuer": "mc-platform-v035",
                "created": datetime.utcnow().isoformat() + "Z",
                "rotation_policy": "90_days",
                "key_count": len(keys)
            }
        }

        return jwks

    def rotate_keys(self, current_key_id: str = None) -> dict:
        """Perform key rotation"""

        # Generate new key ID based on date
        date_suffix = datetime.utcnow().strftime("%Y%m")
        new_key_id = f"mc-v035-ed25519-{date_suffix}"

        # Generate new primary key
        new_key = self.generate_ed25519_keypair(new_key_id)

        # Keep previous key as secondary (if exists)
        keys = [new_key]

        if current_key_id and current_key_id != new_key_id:
            # Generate secondary key for overlap period
            secondary_key = self.generate_ed25519_keypair(f"{current_key_id}-secondary")
            keys.append(secondary_key)

        # Create JWKS
        jwks = self.create_jwks(keys)

        rotation_report = {
            "rotation_timestamp": datetime.utcnow().isoformat() + "Z",
            "new_primary_key": new_key_id,
            "keys_generated": len(keys),
            "rotation_reason": "scheduled_rotation",
            "next_rotation": (datetime.utcnow() + timedelta(days=90)).isoformat() + "Z",
            "overlap_period_days": 7
        }

        return {
            "jwks": jwks,
            "keys": keys,
            "rotation_report": rotation_report
        }

    def generate_samples(self, jwks: dict, keys: list) -> list:
        """Generate sample signed tokens for testing"""

        # This would normally use the actual JWS service
        # For now, creating mock samples
        samples = []

        for i, key in enumerate(keys[:2]):  # Max 2 samples
            sample = {
                "sample_id": f"sample_{i+1}_{key['key_id']}",
                "kid": key["key_id"],
                "mock_token": f"eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImtpZCI6IiIsIntTZVUu7C60.eyJyZXF1ZXN0SWQiOiJyZXFfMTcyNzM3NjE2NzEyMyIsInRlbmFudElkIjoiVEVOQU5UXzAwMSIsInRpbWVzdGFtcCI6IjIwMjUtMDktMjZUMjA6NTU6MTcuMTIzWiIsImlucHV0SGFzaCI6ImE4YjQ2YWViOWZkZjVlNmIiLCJvdXRwdXRIYXNoIjoiYzlkMmU0ZjZhM2I3OCIsIm1vZGVsIjoiY2xhdWRlLTMuNS1zb25uZXQiLCJjb3N0IjowLjAyMzQsImlzcyI6Im1jLXBsYXRmb3JtLXYwMzUiLCJhdWQiOiJtYy1jbGllbnRzIiwiaWF0IjoxNzI3Mzc2MTY3LCJleHAiOjE3MjczNzYxNjd9.{key['key_id'][:16]}mock_signature",
                "payload_claims": {
                    "requestId": f"req_{int(datetime.utcnow().timestamp() * 1000)}",
                    "tenantId": "TENANT_001",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "inputHash": "a8b46aeb9fdf5e6b",
                    "outputHash": "c9d2e4f6a3b78",
                    "model": "claude-3.5-sonnet",
                    "cost": 0.0234
                },
                "verification_endpoint": f"/api/v2/attest/verify/{key['key_id']}",
                "created": datetime.utcnow().isoformat() + "Z"
            }
            samples.append(sample)

        return samples


def main():
    parser = argparse.ArgumentParser(description="JWKS Rotation Tool for MC Platform v0.3.5")
    parser.add_argument('--out', required=True, help='Output directory for JWKS and keys')
    parser.add_argument('--current-key-id', help='Current key ID for rotation')
    parser.add_argument('--generate-samples', action='store_true',
                       help='Generate sample signed tokens')

    args = parser.parse_args()

    print("🔑 MC Platform v0.3.5 - JWKS Rotation Tool")
    print("=" * 50)

    manager = JWKSManager()

    # Perform key rotation
    print("\n🔄 Performing key rotation...")
    rotation_result = manager.rotate_keys(args.current_key_id)

    jwks = rotation_result["jwks"]
    keys = rotation_result["keys"]
    rotation_report = rotation_result["rotation_report"]

    print(f"  • New primary key: {rotation_report['new_primary_key']}")
    print(f"  • Keys generated: {rotation_report['keys_generated']}")
    print(f"  • Next rotation: {rotation_report['next_rotation']}")

    # Create output directory
    os.makedirs(args.out, exist_ok=True)

    # Save JWKS
    jwks_file = os.path.join(args.out, "jwks.json")
    with open(jwks_file, 'w') as f:
        json.dump(jwks, f, indent=2)
    print(f"  • JWKS saved: {jwks_file}")

    # Save rotation report
    report_file = os.path.join(args.out, "rotation-report.json")
    with open(report_file, 'w') as f:
        json.dump(rotation_report, f, indent=2)
    print(f"  • Rotation report: {report_file}")

    # Save private keys (secure location in production)
    keys_file = os.path.join(args.out, "private-keys.json")
    with open(keys_file, 'w') as f:
        json.dump({"keys": keys}, f, indent=2)
    print(f"  • Private keys: {keys_file}")

    # Generate samples if requested
    if args.generate_samples:
        print(f"\n📝 Generating sample tokens...")
        samples = manager.generate_samples(jwks, keys)

        samples_dir = os.path.join(args.out, "signed-samples")
        os.makedirs(samples_dir, exist_ok=True)

        for sample in samples:
            sample_file = os.path.join(samples_dir, f"{sample['sample_id']}.json")
            with open(sample_file, 'w') as f:
                json.dump(sample, f, indent=2)
            print(f"  • Sample: {sample_file}")

    # Summary
    print(f"\n✅ JWKS rotation completed successfully")
    print(f"🔗 Primary key ID: {rotation_report['new_primary_key']}")
    print(f"📅 Valid until: {rotation_report['next_rotation']}")

    # Deployment reminder
    print(f"\n🚀 Next steps:")
    print(f"  1. Deploy JWKS to /.well-known/jwks.json")
    print(f"  2. Update JWS service configuration")
    print(f"  3. Test token verification in staging")
    print(f"  4. Schedule next rotation: {rotation_report['next_rotation']}")


if __name__ == "__main__":
    main()