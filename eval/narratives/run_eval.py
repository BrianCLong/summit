import json
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from narratives.frames.stub import extract_frame
from narratives.frames.validation import is_valid_frame_label

EVIDENCE_ID = "EVD-NARRATIVE_IOPS_20260129-FRAMES-001"
EVIDENCE_DIR = pathlib.Path("evidence") / EVIDENCE_ID
FIXTURES_DIR = pathlib.Path("eval/narratives/fixtures")


def load_cases(path: pathlib.Path) -> List[Dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8")).get("cases", [])


def run_cases(cases: List[Dict[str, Any]]) -> Tuple[int, int, List[str]]:
    passed = 0
    failed = 0
    failed_cases: List[str] = []
    for case in cases:
        label = extract_frame(case.get("event", {}))
        expected_valid = case.get("expect_valid")
        actual_valid = is_valid_frame_label(label)
        if expected_valid is True and actual_valid:
            passed += 1
        elif expected_valid is False and not actual_valid:
            passed += 1
        else:
            failed += 1
            failed_cases.append(case.get("id", "unknown-case"))
    return passed, failed, failed_cases


def write_json(path: pathlib.Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    positive = load_cases(FIXTURES_DIR / "frames_positive.json")
    negative = load_cases(FIXTURES_DIR / "frames_negative.json")
    passed_pos, failed_pos, failed_cases_pos = run_cases(positive)
    passed_neg, failed_neg, failed_cases_neg = run_cases(negative)

    total_passed = passed_pos + passed_neg
    total_failed = failed_pos + failed_neg
    coverage = total_passed / max(1, total_passed + total_failed)
    failed_cases = sorted(failed_cases_pos + failed_cases_neg)

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    report = {
        "evidence_id": EVIDENCE_ID,
        "summary": "Narrative frames contract fixtures evaluated with deterministic stub.",
        "fixtures": {
            "positive": len(positive),
            "negative": len(negative),
        },
        "results": {
            "passed": total_passed,
            "failed": total_failed,
            "failed_cases": failed_cases,
        },
    }
    metrics = {
        "frame_contract_coverage": coverage,
        "passed": total_passed,
        "failed": total_failed,
    }
    stamp = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    write_json(EVIDENCE_DIR / "report.json", report)
    write_json(EVIDENCE_DIR / "metrics.json", metrics)
    write_json(EVIDENCE_DIR / "stamp.json", stamp)


if __name__ == "__main__":
    main()
