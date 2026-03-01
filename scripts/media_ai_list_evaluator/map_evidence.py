import json
import os
import sys

# Add directory to path to import ingest
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from ingest import ingest

def map_evidence(filepath, output_dir):
    try:
        tools = ingest(filepath)
    except SystemExit:
        # Pass the exit code up
        raise

    evidence = []
    for i, tool in enumerate(tools):
        evidence_id = f"SUMMIT-EVIDENCE-MEDIA-{i:03d}"
        evidence.append({
            "id": evidence_id,
            "tool_name": tool["name"],
            "claims": tool["claims"]
        })

    # Sort deterministically
    evidence = sorted(evidence, key=lambda x: x["id"])

    output_data = {
        "source_status": "verified",
        "evidence": evidence,
        "policy": "allow"
    }

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'evidence.json')

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"Mapped {len(evidence)} evidence records to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 map_evidence.py <path_to_yaml> <output_dir>", file=sys.stderr)
        sys.exit(1)
    filepath = sys.argv[1]
    output_dir = sys.argv[2]
    map_evidence(filepath, output_dir)
