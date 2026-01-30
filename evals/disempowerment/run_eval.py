import argparse
import datetime
import json
import sys
from pathlib import Path

# Import the scorer
# Use relative import if running as module, or adjust path
try:
    from .score import score_response
except ImportError:
    # Fallback for running script directly
    sys.path.append(str(Path(__file__).resolve().parent))
    from score import score_response

ROOT_DIR = Path(__file__).resolve().parents[2]
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"

def run(emit_evidence: str = None):
    print("Running Disempowerment Eval Harness...")

    metrics = {
        "confusion_matrix": {},
        "false_positives": 0,
        "false_negatives": 0,
        "accuracy": 0.0,
        "total_examples": 0
    }

    # Load fixtures
    neg_fixtures = list((FIXTURE_DIR / "negative").glob("*.json"))
    pos_fixtures = list((FIXTURE_DIR / "positive").glob("*.json"))

    print(f"Loaded {len(neg_fixtures)} negative and {len(pos_fixtures)} positive fixtures.")

    # Evaluation loop (Mock: scoring the example responses provided in fixtures)
    correct_classifications = 0
    total = 0

    # Negative fixtures (should be flagged as 'severe')
    for fpath in neg_fixtures:
        data = json.loads(fpath.read_text())
        # Use the bad example as if the model produced it
        response = data.get("bad_response_example", "")
        score = score_response(data["prompt"], response)

        # Expectation: detected (severity != none)
        if score["disempowerment_detected"]:
            correct_classifications += 1
        else:
            metrics["false_negatives"] += 1
        total += 1

    # Positive fixtures (should be safe)
    for fpath in pos_fixtures:
        data = json.loads(fpath.read_text())
        # Use the good example
        response = data.get("good_response_example", "")
        score = score_response(data["prompt"], response)

        # Expectation: not detected
        if not score["disempowerment_detected"]:
            correct_classifications += 1
        else:
            metrics["false_positives"] += 1
        total += 1

    metrics["accuracy"] = correct_classifications / total if total > 0 else 0.0
    metrics["total_examples"] = total

    if emit_evidence:
        output_dir = Path(emit_evidence).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        # Deterministic ID matching regex ^EVD-[A-Z0-9-]+-[A-Z]+-[0-9]{3}$
        # EVD-DISPOWERMENT-PATTERNS (Part 1) - EVAL (Part 2) - 001 (Part 3)
        evd_id = "EVD-DISPOWERMENT-PATTERNS-EVAL-001"

        report = {
            "evidence_id": evd_id,
            "item_slug": "disempowerment-patterns",
            "area": "EVAL",
            "summary": "Initial eval harness run (using fixture examples)",
            "artifacts": ["metrics.json", "stamp.json"]
        }

        # Only stamp.json gets timestamp
        stamp = {
            "created_at": datetime.datetime.now(datetime.UTC).isoformat()
        }

        (output_dir / "report.json").write_text(json.dumps(report, indent=2))
        (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
        (output_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

        print(f"Evidence emitted to {output_dir}")

        # Update index.json
        index_path = ROOT_DIR / "evidence" / "index.json"
        if index_path.exists():
            try:
                index = json.loads(index_path.read_text())
                # Check if ID exists, update or append
                existing_item = next((item for item in index["items"] if item["id"] == evd_id), None)
                # report.json path relative to ROOT_DIR
                rel_path = str(output_dir.relative_to(ROOT_DIR) / "report.json")

                if existing_item:
                    existing_item["path"] = rel_path
                else:
                    index["items"].append({
                        "id": evd_id,
                        "path": rel_path
                    })
                index_path.write_text(json.dumps(index, indent=2))
                print("Updated evidence/index.json")
            except Exception as e:
                print(f"Failed to update index.json: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit-evidence", help="Directory to emit evidence artifacts")
    args = parser.parse_args()

    run(args.emit_evidence)
