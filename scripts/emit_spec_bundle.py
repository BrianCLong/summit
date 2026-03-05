import json
import os
import sys
from datetime import UTC, datetime, timezone


def calculate_completeness(spec):
    score = 0
    # Simplified DoD rubric
    if spec.get("scope"):
        score += 5
    if len(spec.get("functional_requirements", [])) > 0:
        score += 5
    if len(spec.get("non_functional_requirements", [])) > 0:
        score += 5
    if len(spec.get("jules_tasks", [])) > 0:
        score += 5
    if len(spec.get("open_questions", [])) == 0:
        score += 5
    return score

def emit_bundle(spec_path, output_path):
    with open(spec_path) as f:
        spec = json.load(f)

    score = calculate_completeness(spec)

    # Determinism for CI
    if os.environ.get("CI") == "true":
        now = datetime(2025, 1, 1, tzinfo=UTC)
        evidence_ts = "1735689600"
    else:
        now = datetime.now(UTC)
        evidence_ts = str(int(now.timestamp()))

    bundle = {
        "spec": spec,
        "metadata": {
            "timestamp": now.isoformat(),
            "mode": "standard",
            "engine_version": "1.0"
        },
        "metrics": {
            "completeness_score": score,
            "requirement_count": len(spec.get("functional_requirements", [])),
            "open_question_count": len(spec.get("open_questions", []))
        },
        "evidence_id": f"EVD-MAESTRO-SPEC-{evidence_ts}"
    }

    with open(output_path, 'w') as f:
        json.dump(bundle, f, indent=2)

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 emit_spec_bundle.py <spec_path> <output_path>")
        sys.exit(1)

    emit_bundle(sys.argv[1], sys.argv[2])
    print(f"Spec bundle emitted to {sys.argv[2]}")

if __name__ == "__main__":
    main()
