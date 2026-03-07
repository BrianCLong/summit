import sys
import json
import os

def build_index(dist_dir):
    sha = os.popen("git rev-parse HEAD").read().strip()[:8]
    items = []

    # SBOM
    if os.path.exists(f"{dist_dir}/sbom/summit.spdx.json"):
        items.append({
            "evidence_id": f"EVIDENCE:omb-m26-05:sbom:{sha}:0001",
            "kind": "sbom",
            "path": "sbom/summit.spdx.json"
        })

    # Provenance
    if os.path.exists(f"{dist_dir}/provenance/slsa.intoto.jsonl"):
        items.append({
            "evidence_id": f"EVIDENCE:omb-m26-05:provenance:{sha}:0002",
            "kind": "provenance",
            "path": "provenance/slsa.intoto.jsonl"
        })

    # Vuln
    if os.path.exists(f"{dist_dir}/vuln/vuln-status.json"):
        items.append({
            "evidence_id": f"EVIDENCE:omb-m26-05:vuln:{sha}:0003",
            "kind": "vuln",
            "path": "vuln/vuln-status.json"
        })

    index = {
        "version": "1.0.0",
        "items": items
    }

    with open(f"{dist_dir}/index.json", "w") as f:
        json.dump(index, f, indent=2)

if __name__ == "__main__":
    build_index(sys.argv[1])
