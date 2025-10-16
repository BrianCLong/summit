#!/usr/bin/env python3
"""
MC Platform Config Integrity Attestation Tool
Hashes and signs Helm values, HPA, NetworkPolicy, ServiceMonitor configurations
"""

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


def collect_config_files() -> dict[str, Any]:
    """Collect all configuration files for attestation"""
    configs = {}

    # Helm values files
    helm_paths = [
        "charts/agent-workbench/values.yaml",
        "charts/agent-workbench/values-prod.yaml",
        "charts/agent-workbench/values-llm-egress.yaml",
    ]

    for path in helm_paths:
        if Path(path).exists():
            with open(path) as f:
                configs[path] = f.read()

    # HPA template
    hpa_path = "charts/agent-workbench/templates/hpa.yaml"
    if Path(hpa_path).exists():
        with open(hpa_path) as f:
            configs[hpa_path] = f.read()

    # NetworkPolicy template
    netpol_path = "charts/agent-workbench/templates/networkpolicy.yaml"
    if Path(netpol_path).exists():
        with open(netpol_path) as f:
            configs[netpol_path] = f.read()

    # ServiceMonitor template
    sm_path = "charts/agent-workbench/templates/servicemonitor.yaml"
    if Path(sm_path).exists():
        with open(sm_path) as f:
            configs[sm_path] = f.read()

    return configs


def generate_config_hash(configs: dict[str, Any]) -> str:
    """Generate SHA-256 hash of all config content"""
    hasher = hashlib.sha256()

    # Sort by path for consistent hashing
    for path in sorted(configs.keys()):
        content = configs[path]
        hasher.update(f"{path}:{content}".encode())

    return hasher.hexdigest()


def create_snapshot(output_path: str) -> None:
    """Create config snapshot with hash and metadata"""
    configs = collect_config_files()
    config_hash = generate_config_hash(configs)

    snapshot = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "platform_version": "v0.3.3-mc",
        "config_hash": config_hash,
        "files": list(configs.keys()),
        "configs": configs,
        "git_commit": get_git_commit(),
        "attestation_method": "sha256_hash",
    }

    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(snapshot, f, indent=2)

    print(f"✅ Config snapshot created: {output_path}")
    print(f"🔒 Config hash: {config_hash}")


def verify_snapshot(snapshot_path: str, signature_path: str = None) -> bool:
    """Verify config snapshot integrity"""
    if not Path(snapshot_path).exists():
        print(f"❌ Snapshot file not found: {snapshot_path}")
        return False

    with open(snapshot_path) as f:
        snapshot = json.load(f)

    # Recalculate hash from current configs
    current_configs = collect_config_files()
    current_hash = generate_config_hash(current_configs)
    snapshot_hash = snapshot.get("config_hash")

    if current_hash == snapshot_hash:
        print("✅ Config integrity verified")
        print(f"🔒 Hash: {current_hash}")
        return True
    else:
        print("❌ Config drift detected!")
        print(f"📄 Snapshot hash: {snapshot_hash}")
        print(f"📄 Current hash:  {current_hash}")

        # Find changed files
        snapshot_configs = snapshot.get("configs", {})
        for path in set(current_configs.keys()) | set(snapshot_configs.keys()):
            current_content = current_configs.get(path, "")
            snapshot_content = snapshot_configs.get(path, "")

            if current_content != snapshot_content:
                print(f"🔄 Changed: {path}")

        return False


def sign_snapshot(snapshot_path: str, signature_path: str) -> None:
    """Sign config snapshot (placeholder for actual signing)"""
    # In production, this would use HSM or GPG signing
    # For now, create a simple signature file

    with open(snapshot_path) as f:
        snapshot_content = f.read()

    # Simple signature (in production, use proper cryptographic signing)
    signature = hashlib.sha256(f"MC_PLATFORM_SIGNATURE:{snapshot_content}".encode()).hexdigest()

    signature_data = {
        "signature": signature,
        "algorithm": "sha256",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "signer": "mc-platform-config-attest",
        "snapshot_file": snapshot_path,
    }

    # Ensure output directory exists
    Path(signature_path).parent.mkdir(parents=True, exist_ok=True)

    with open(signature_path, "w") as f:
        json.dump(signature_data, f, indent=2)

    print(f"✅ Signature created: {signature_path}")


def get_git_commit() -> str:
    """Get current git commit hash"""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return "unknown"


def main():
    parser = argparse.ArgumentParser(description="MC Platform Config Attestation Tool")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Snapshot command
    snapshot_parser = subparsers.add_parser("snapshot", help="Create config snapshot")
    snapshot_parser.add_argument("--out", required=True, help="Output path for snapshot")

    # Verify command
    verify_parser = subparsers.add_parser("verify", help="Verify config integrity")
    verify_parser.add_argument("snapshot", help="Snapshot file to verify")
    verify_parser.add_argument("--signature", help="Signature file to verify")

    # Sign command
    sign_parser = subparsers.add_parser("sign", help="Sign config snapshot")
    sign_parser.add_argument("snapshot", help="Snapshot file to sign")
    sign_parser.add_argument("--out", required=True, help="Output path for signature")

    args = parser.parse_args()

    if args.command == "snapshot":
        create_snapshot(args.out)
    elif args.command == "verify":
        success = verify_snapshot(args.snapshot, args.signature)
        sys.exit(0 if success else 1)
    elif args.command == "sign":
        sign_snapshot(args.snapshot, args.out)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
