import json
import os
import sys

# Ensure root is in path
sys.path.append(os.getcwd())

from federated_gnn.src.crypto.signatures import verify_signature


def check_update_signature(envelope_path: str, party_spec_path: str) -> bool:
    try:
        with open(envelope_path) as f:
            envelope = json.load(f)
        with open(party_spec_path) as f:
            spec = json.load(f)

        if envelope.get('party_id') != spec.get('party_id'):
            print(f"Mismatching party_id: envelope={envelope.get('party_id')}, spec={spec.get('party_id')}")
            return False

        is_valid = verify_signature(envelope, spec)
        if not is_valid:
            print(f"Signature verification failed for party {envelope.get('party_id')}")
            return False

        return True
    except Exception as e:
        print(f"Error verifying signature: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: verify_update_signature.py <envelope_json> <party_spec_json>")
        sys.exit(1)

    if not check_update_signature(sys.argv[1], sys.argv[2]):
        sys.exit(1)
    print("Signature Verified")
    sys.exit(0)
