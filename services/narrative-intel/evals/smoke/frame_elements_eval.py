import hashlib
import json
import os
import sys

# Ensure src is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))

from narrative_intel.pipeline.extract_skeleton import NarrativeSkeletonExtractor


def run_smoke_eval():
    extractor = NarrativeSkeletonExtractor()
    fixtures = [
        {"doc_id": "1", "text": "Narrative A", "lang": "en", "tenant_id": "t1"},
        {"doc_id": "2", "text": "Narrative B", "lang": "en", "tenant_id": "t1"}
    ]

    results = []
    for f in fixtures:
        results.append(extractor.process(**f))

    # Use repo root evidence dir (or local service one)
    # The plan says evidence artifacts must be stored in `artifacts/evidence/...` or `evidence/...`
    # User prompt: "evidence/EVID-NARINT-v1-{sha}/..."
    # I'll use a fixed ID for smoke test
    evidence_dir = "evidence/EVID-NARINT-SMOKE"
    os.makedirs(evidence_dir, exist_ok=True)

    with open(f"{evidence_dir}/report.json", "w") as f:
        json.dump(results, f, indent=2)

    stamp = {
        "eval": "smoke",
        "count": len(results),
        "fingerprint_hash": hashlib.sha256(json.dumps(results, sort_keys=True).encode()).hexdigest()
    }

    with open(f"{evidence_dir}/stamp.json", "w") as f:
        json.dump(stamp, f, indent=2)

if __name__ == "__main__":
    run_smoke_eval()
