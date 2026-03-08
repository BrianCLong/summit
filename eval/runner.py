import argparse
import json
from pathlib import Path
from typing import Any, Dict, List


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def evaluate_output(
    promptspec_id: str, output: dict[str, Any], rubric: dict[str, Any]
) -> dict[str, Any]:
    required_fields: list[str] = rubric.get("required_fields", [])
    missing_fields = [field for field in required_fields if field not in output]
    completeness_score = 1.0 if not missing_fields else 0.0

    output_text = json.dumps(output, sort_keys=True).lower()
    risk_phrases = rubric.get("risk_phrases", [])
    risk_hits = [phrase for phrase in risk_phrases if phrase in output_text]
    risk_score = 0.0 if not risk_hits else 1.0

    return {
        "promptspec_id": promptspec_id,
        "missing_fields": missing_fields,
        "risk_hits": risk_hits,
        "scores": {
            "completeness": completeness_score,
            "risk": risk_score
        },
        "pass": completeness_score == 1.0 and risk_score == 0.0
    }


def run_eval(fixture_path: Path, rubric_path: Path) -> dict[str, Any]:
    fixture = load_json(fixture_path)
    rubric_bundle = load_json(rubric_path)

    promptspec_id = fixture["promptspec_id"]
    output = fixture["output"]
    rubric = rubric_bundle["rubrics"][promptspec_id]

    result = evaluate_output(promptspec_id, output, rubric)
    return {
        "version": "0.1.0",
        "results": [result]
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run PromptSpec evaluation.")
    parser.add_argument("--fixture", required=True, help="Path to fixture JSON.")
    parser.add_argument("--rubric", required=True, help="Path to rubric JSON.")
    parser.add_argument("--out", required=False, help="Optional output JSON path.")
    args = parser.parse_args()

    output = run_eval(Path(args.fixture), Path(args.rubric))
    output_json = json.dumps(output, sort_keys=True)

    if args.out:
        Path(args.out).write_text(output_json + "\n")
        return

    print(output_json)


if __name__ == "__main__":
    main()
