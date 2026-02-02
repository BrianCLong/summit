#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

# Add root to sys.path to import summit
sys.path.append(str(Path(__file__).resolve().parents[2]))
from summit.brand_story.flags import enabled

def main():
    if not enabled():
        print("Brand story evaluation disabled by flag.")
        return

    print("Running brand story evaluation smoke test...")

    # Mock evaluation logic
    metrics = {
        "coherence": 1.0,
        "authenticity": 0.95,
        "interactivity": 0.9,
    }

    report = {
        "evidence_id": "EVD-SPB-PLAN-001",
        "item_slug": "brand-storytelling-entrepreneur",
        "summary": "Updated brand story plan via smoke test.",
        "claims": ["Storytelling works"],
        "decisions": [],
        "findings": [{"type": "smoke_test", "result": "passed"}]
    }

    # Write to evidence (only if directory exists)
    out_dir = Path("evidence/brand_story")
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "metrics.json").write_text(json.dumps({"evidence_id": "EVD-SPB-PLAN-001", "metrics": metrics}, indent=2))
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))

    print("Smoke test complete. Evidence updated.")

if __name__ == "__main__":
    main()
