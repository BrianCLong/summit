import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from summit.promptpacks.serious_client_tone.evaluator import evaluate_payload


VERSION = "0.1.0"


def load_fixture(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def evaluate_fixtures(fixtures: Iterable[Dict[str, Any]]) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    reports: List[Dict[str, Any]] = []
    metrics: List[Dict[str, Any]] = []
    profiles: List[Dict[str, Any]] = []

    for fixture in fixtures:
        report, metric = evaluate_payload(fixture)
        reports.append(report)
        metrics.append(metric)

        text = "\n".join(
            [
                str(fixture.get("profile", "")),
                str(fixture.get("offer", "")),
                str(fixture.get("draft_message", "")),
            ]
        )
        profiles.append(
            {
                "input_id": metric["input_id"],
                "char_count": len(text),
                "estimated_ms": max(1, len(text) // 20),
            }
        )

    reports = sorted(reports, key=lambda item: item["input_id"])
    metrics = sorted(metrics, key=lambda item: item["input_id"])
    profiles = sorted(profiles, key=lambda item: item["input_id"])

    report_bundle = {
        "version": VERSION,
        "results": reports,
    }
    metrics_bundle = {
        "version": VERSION,
        "metrics": metrics,
    }
    profile_bundle = {
        "version": VERSION,
        "fixtures": profiles,
        "total_estimated_ms": sum(profile["estimated_ms"] for profile in profiles),
    }
    return report_bundle, metrics_bundle, profile_bundle


def run_fixtures(paths: Iterable[Path]) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    fixtures = [load_fixture(path) for path in paths]
    return evaluate_fixtures(fixtures)


def write_bundle(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run serious client tone prompt pack.")
    parser.add_argument(
        "--input",
        nargs="+",
        required=True,
        help="Fixture JSON paths to evaluate.",
    )
    parser.add_argument(
        "--out-dir",
        default="artifacts/serious_client_tone",
        help="Output directory for report.json and metrics.json.",
    )
    args = parser.parse_args()

    input_paths = [Path(path) for path in args.input]
    report, metrics, profile = run_fixtures(input_paths)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    write_bundle(out_dir / "report.json", report)
    write_bundle(out_dir / "metrics.json", metrics)
    write_bundle(out_dir / "profile.json", profile)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
