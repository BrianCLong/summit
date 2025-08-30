#!/usr/bin/env python3
import argparse
import datetime
import hashlib
import hmac
import json
import os
from pathlib import Path

import yaml


def load_federation_config():
    yml_file = Path("federation.yml")
    if yml_file.exists():
        with open(yml_file) as f:
            return yaml.safe_load(f)
    return {}


def ping_peer(peer_name: str):
    config = load_federation_config()
    peers = config.get("peers", {})

    if peer_name not in peers:
        print(f"Error: Peer '{peer_name}' not found in federation.yml")
        return

    peer_info = peers[peer_name]
    endpoint = peer_info.get("endpoint")

    if endpoint:
        print(f"Pinging {peer_name} at {endpoint}...")
        # In a real scenario, you'd make an HTTP request here
        print(f"Peer '{peer_name}' is ok (mock response)")
    else:
        print(f"Error: Endpoint not defined for peer '{peer_name}'")


def share_data(peer_name: str, what: str):
    config = load_federation_config()
    peers = config.get("peers", {})

    if peer_name not in peers:
        print(f"Error: Peer '{peer_name}' not found in federation.yml")
        return

    peer_info = peers[peer_name]
    hmac_secret_env = peer_info.get("hmac_secret_env")

    if not hmac_secret_env:
        print(f"Error: HMAC secret environment variable not defined for peer '{peer_name}'")
        return

    hmac_secret = os.getenv(hmac_secret_env)
    if not hmac_secret:
        print(f"Error: Environment variable '{hmac_secret_env}' not set. Cannot sign data.")
        return

    log_dir = "logs/fed"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"{peer_name}.jsonl")

    timestamp = datetime.datetime.now().isoformat()

    # Mock data based on 'what'
    data_payload = {"timestamp": timestamp, "peer": peer_name, "type": what, "content": {}}

    if what == "status":
        data_payload["content"] = {"status": "healthy", "uptime": "12h", "version": "v1.0"}
    elif what == "metrics":
        data_payload["content"] = {"cpu_usage": 0.5, "memory_usage": 0.7}
    else:
        print(f"Warning: Unknown data type '{what}'. Sharing empty content.")

    data_json = json.dumps(data_payload, sort_keys=True)  # Sort keys for consistent HMAC

    # Generate HMAC signature
    signature = hmac.new(
        hmac_secret.encode("utf-8"), data_json.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    signed_record = {"data": data_payload, "signature": signature}

    with open(log_file, "a") as f:
        f.write(json.dumps(signed_record) + "\n")
    print(f"Shared '{what}' data with '{peer_name}' and wrote to {log_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Manage federated interoperability for Symphony Orchestra."
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Ping command
    ping_parser = subparsers.add_parser("ping", help="Ping a federated peer.")
    ping_parser.add_argument("--peer", required=True, help="Name of the peer to ping.")

    # Share command
    share_parser = subparsers.add_parser("share", help="Share data with a federated peer.")
    share_parser.add_argument("--peer", required=True, help="Name of the peer to share data with.")
    share_parser.add_argument(
        "--what", required=True, help="Type of data to share (e.g., 'status', 'metrics')."
    )

    args = parser.parse_args()

    if args.command == "ping":
        ping_peer(args.peer)
    elif args.command == "share":
        share_data(args.peer, args.what)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
