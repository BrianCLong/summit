import glob
import json
import os

from modules.agentplace.evaluator import AgentPlaceEvaluator


def detect_drift():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    manifest_dir = os.path.join(base_dir, "agents", "manifests")
    risk_model_path = os.path.join(base_dir, "modules", "agentplace", "risk_model.yaml")
    schema_path = os.path.join(base_dir, "modules", "agentplace", "schemas", "agent_manifest.schema.json")

    evaluator = AgentPlaceEvaluator(risk_model_path, schema_path)

    manifest_files = glob.glob(os.path.join(manifest_dir, "*.json"))
    scores = []

    for manifest_file in manifest_files:
        with open(manifest_file) as f:
            manifest = json.load(f)
        report = evaluator.evaluate(manifest)
        scores.append(report['risk_score'])

    avg_score = sum(scores) / len(scores) if scores else 0

    # In a real scenario, we'd compare with a historical baseline stored in a file or DB.
    # For now, we'll just report the current average.

    drift_report = {
        "module": "agentplace",
        "average_risk_score": avg_score,
        "manifest_count": len(manifest_files),
        "schema_version": evaluator.schema.get("version", "unknown"),
        "deterministic": True
    }

    print(json.dumps(drift_report, indent=2))

    with open("drift_report.json", "w") as f:
        json.dump(drift_report, f, indent=2)

if __name__ == "__main__":
    detect_drift()
