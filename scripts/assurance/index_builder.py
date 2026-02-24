import json
import hashlib
import os
import sys
from datetime import datetime

def get_sha256(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def build_index(dist_dir, git_sha):
    # Fixed timestamp for determinism
    timestamp = "2026-01-23T00:00:00Z"

    items = []

    mapping = [
        ("sbom", "sbom/summit.spdx.json"),
        ("provenance", "provenance/digests.json"),
        ("provenance", "provenance/slsa.intoto.jsonl"),
    ]

    # Optional vuln status if exists
    vuln_path = os.path.join(dist_dir, "vuln/vuln-status.json")
    if os.path.exists(vuln_path):
        mapping.append(("vuln", "vuln/vuln-status.json"))

    for seq, (kind, rel_path) in enumerate(mapping, 1):
        full_path = os.path.join(dist_dir, rel_path)
        if not os.path.exists(full_path):
            print(f"Warning: {full_path} not found, skipping.")
            continue

        sha256 = get_sha256(full_path)
        evidence_id = f"EVIDENCE:omb-m26-05:{kind}:{git_sha}:{seq:04d}"

        items.append({
            "evidence_id": evidence_id,
            "kind": kind,
            "path": rel_path,
            "sha256": sha256
        })

    index = {
        "version": "1.0.0",
        "metadata": {
            "timestamp": timestamp,
            "policy": "omb-m26-05",
            "git_sha": git_sha
        },
        "items": items
    }

    # Add index itself to items? No, circular. But we can add kind="index" for the index file in the schema if we want.
    # Actually, the schema says items can have kind "index". Maybe we add it after?

    index_path = os.path.join(dist_dir, "index.json")
    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)

    print(f"Index built at {index_path}")

if __name__ == "__main__":
    dist = sys.argv[1] if len(sys.argv) > 1 else "dist/assurance"
    sha = sys.argv[2] if len(sys.argv) > 2 else "0000000000000000000000000000000000000000"
    build_index(dist, sha)
