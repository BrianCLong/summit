import argparse
import datetime
import json
import os
import sys
from pathlib import Path

try:
    from .score import score_narrative_risk
except ImportError:
    # Fallback for running script directly
    sys.path.append(str(Path(__file__).resolve().parent))
    from score import score_narrative_risk

ROOT_DIR = Path(__file__).resolve().parents[2]
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"

def load_fixtures(category_dir: Path):
    fixtures = []
    if category_dir.exists():
        for file in category_dir.glob("*.json"):
            with open(file, "r", encoding="utf-8") as f:
                fixtures.append(json.load(f))
    return fixtures

def run_eval(emit_evidence: str = None):
    print("Running Adversarial Narrative Risk Eval Harness...")

    metrics = {
        "overall_stability": 0.0,
        "categories": {
            "obfuscation": {"count": 0, "detected": 0, "detection_rate": 0.0, "score_variance": 0.0},
            "paraphrase": {"count": 0, "detected": 0, "detection_rate": 0.0, "score_variance": 0.0},
            "multilingual": {"count": 0, "detected": 0, "detection_rate": 0.0, "score_variance": 0.0},
            "injection": {"count": 0, "detected": 0, "detection_rate": 0.0, "score_variance": 0.0}
        },
        "total_examples": 0
    }

    # Evaluate each category
    for category in metrics["categories"].keys():
        category_dir = FIXTURE_DIR / category
        fixtures = load_fixtures(category_dir)

        count = len(fixtures)
        metrics["categories"][category]["count"] = count
        metrics["total_examples"] += count

        if count == 0:
            print(f"No fixtures found for {category}.")
            continue

        detected = 0
        total_variance = 0.0

        for fixture in fixtures:
            baseline_text = fixture.get("baseline", "")
            adversarial_text = fixture.get("adversarial", "")

            baseline_result = score_narrative_risk(baseline_text)
            adversarial_result = score_narrative_risk(adversarial_text)

            # Did we detect the risk in the adversarial text?
            if adversarial_result["is_flagged"]:
                detected += 1

            # How stable is the score?
            baseline_score = baseline_result["risk_score"]
            adv_score = adversarial_result["risk_score"]
            variance = abs(baseline_score - adv_score)
            total_variance += variance

        metrics["categories"][category]["detected"] = detected
        metrics["categories"][category]["detection_rate"] = detected / count if count > 0 else 0.0
        metrics["categories"][category]["score_variance"] = total_variance / count if count > 0 else 0.0

    # Calculate overall stability (lower variance = higher stability)
    total_variance = sum(cat["score_variance"] * cat["count"] for cat in metrics["categories"].values())
    if metrics["total_examples"] > 0:
        avg_variance = total_variance / metrics["total_examples"]
        metrics["overall_stability"] = max(0.0, 1.0 - avg_variance)

    print(f"Total examples: {metrics['total_examples']}")
    print(f"Overall Stability: {metrics['overall_stability']:.2f}")

    if emit_evidence:
        output_dir = Path(emit_evidence).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        evd_id = "EVD-ADVERSARIAL-NARRATIVE-EVAL-001"

        report = {
            "evidence_id": evd_id,
            "item_slug": "adversarial-narrative-eval",
            "area": "EVAL",
            "summary": "Adversarial robustness evaluation for narrative risk detection.",
            "artifacts": ["metrics.json", "stamp.json"]
        }

        stamp = {
            "created_at": datetime.datetime.now(datetime.UTC).isoformat()
        }

        (output_dir / "report.json").write_text(json.dumps(report, indent=2))
        (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
        (output_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

        print(f"Evidence emitted to {output_dir}")

        index_path = ROOT_DIR / "evidence" / "index.json"
        if index_path.exists():
            try:
                index = json.loads(index_path.read_text())
                rel_path = str(output_dir.relative_to(ROOT_DIR))

                # Check mapping structure
                if "mappings" in index:
                    index["mappings"][evd_id] = {
                        "report": f"{rel_path}/report.json",
                        "metrics": f"{rel_path}/metrics.json",
                        "stamp": f"{rel_path}/stamp.json",
                        "files": ["report.json", "metrics.json", "stamp.json"]
                    }
                elif "items" in index:
                    existing_item = next((item for item in index["items"] if item["id"] == evd_id), None)
                    if existing_item:
                        existing_item["path"] = f"{rel_path}/report.json"
                    else:
                        index["items"].append({
                            "id": evd_id,
                            "path": f"{rel_path}/report.json"
                        })

                index_path.write_text(json.dumps(index, indent=2))
                print("Updated evidence/index.json")
            except Exception as e:
                print(f"Failed to update index.json: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit-evidence", help="Directory to emit evidence artifacts")
    args = parser.parse_args()

    run_eval(args.emit_evidence)
