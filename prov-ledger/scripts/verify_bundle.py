import requests
import json
import argparse
from pymerkle import InmemoryTree as MerkleTree

def verify_bundle(bundle_path: str, api_url: str):
    """Verifies a disclosure bundle against the prov-ledger service."""
    with open(bundle_path, 'r') as f:
        bundle = json.load(f)

    evidence_checksums = []
    for evidence_id in bundle["evidence_ids"]:
        response = requests.get(f"{api_url}/evidence/{evidence_id}")
        if response.status_code != 200:
            print(f"Error: Could not retrieve evidence with ID {evidence_id}")
            return
        evidence_checksums.append(response.json()["checksum"])

    tree = MerkleTree(algorithm='sha256')
    for checksum in evidence_checksums:
        tree.append_entry(checksum.encode('utf-8'))

    if tree.get_state() == bundle["merkle_root"]:
        print("Verification successful: Merkle root matches.")
        exit(0)
    else:
        print("Verification failed: Merkle root does not match.")
        exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify a prov-ledger disclosure bundle.")
    parser.add_argument("bundle_path", help="The path to the disclosure bundle JSON file.")
    parser.add_argument("--api_url", default="http://127.0.0.1:8000", help="The URL of the prov-ledger API.")
    args = parser.parse_args()

    verify_bundle(args.bundle_path, args.api_url)
