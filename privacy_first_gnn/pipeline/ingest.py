import json

from ..gates.no_plaintext_sensitive import verify_no_plaintext_sensitive


def ingest_telemetry(topology, encrypted_features, policy):
    """
    Ingest telemetry data, ensuring no plaintext sensitive fields.
    """
    # 1. Verify topology
    success, msg = verify_no_plaintext_sensitive(topology, policy["sensitive_fields"])
    if not success:
        raise ValueError(f"Topology verification failed: {msg}")

    # 2. Verify encrypted features (should only contain ciphertext blobs)
    # The classification should be SENSITIVE_ENCRYPTED
    if encrypted_features.get("classification") != "SENSITIVE_ENCRYPTED":
         raise ValueError("Invalid features classification")

    return {
        "topology": topology,
        "features": encrypted_features["payloads"]
    }
