#!/usr/bin/env python3
from typing import Any, Dict, List
import argparse
import json
import os
import sys
from pathlib import Path

# Add repo root to python path so we can import summit
sys.path.append(str(Path(__file__).resolve().parent.parent))

from summit.evals.repetition_eval import evaluate_prompt_hygiene


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark Prompt Repetition Policy")
    parser.add_argument("--output-dir", default="artifacts/repetition", help="Directory to save artifacts")
    args = parser.parse_args()

    # Create output directory
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Define test prompts (Deterministic Fixtures)
    fixtures = [
        {
            "id": "prompt-001",
            "desc": "Baseline - no repetition",
            "text": "Write a poem about the sea. Make it rhyme."
        },
        {
            "id": "prompt-002",
            "desc": "Beneficial - short command repetition",
            "text": "Keep it short. keep it short. Don't ramble."
        },
        {
            "id": "prompt-003",
            "desc": "Harmful - long redundant text",
            "text": "This is a very long instruction that is repeated unnecessarily and it goes on and on and on and on and on and on and on and on and on and on and on and on. " * 10 + "This is a very long instruction that is repeated unnecessarily."
        }
    ]

    report: Dict[str, Any] = {
        "summary": {"total": 0, "harmful": 0, "beneficial": 0, "reinforced": 0},
        "details": []
    }

    metrics: Dict[str, Any] = {
        "repetition_scores": [],
        "harmful_rate": 0.0
    }

    for item in fixtures:
        result = evaluate_prompt_hygiene(item["text"])
        classification = result["classification"]

        entry = {
            "id": item["id"],
            "desc": item["desc"],
            "score": classification["score"],
            "class": classification["class"],
            "action": result["action_taken"]
        }
        report["details"].append(entry)

        # Update summary
        report["summary"]["total"] += 1
        if classification["class"] == "harmful":
            report["summary"]["harmful"] += 1
        elif classification["class"] == "beneficial":
            report["summary"]["beneficial"] += 1

        if result["action_taken"] == "reinforced":
            report["summary"]["reinforced"] += 1

        metrics["repetition_scores"].append(classification["score"])

    # Calculate aggregate metrics
    if report["summary"]["total"] > 0:
        metrics["harmful_rate"] = report["summary"]["harmful"] / report["summary"]["total"]

    # Write artifacts
    with open(out_dir / "report.json", "w") as f:
        json.dump(report, f, indent=2)

    with open(out_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Also write a 'stamp.json' for evidence verification
    # Using a static timestamp for determinism in this proof-of-concept,
    # but normally this would be current time.
    # The prompt requested deterministic benchmarking harness, so maybe keep it static or argument driven.
    # However, "evidence-verify CI check mandates that evidence/stamp.json has a timestamp strictly later..."
    # So I should use current time.
    import time
    with open(out_dir / "stamp.json", "w") as f:
        json.dump({"timestamp": time.time(), "version": "1.0"}, f)

    print(f"Benchmark complete. Artifacts saved to {out_dir}")
    print(json.dumps(report, indent=2))

    # Exit with error if harmful rate is too high (CI Gate logic)
    if metrics["harmful_rate"] > 0.5: # Example threshold
        print("FAIL: Harmful repetition rate exceeds threshold")
        sys.exit(1)

if __name__ == "__main__":
    main()
