import json
import pathlib
import sys
from typing import Any, Dict, Iterable, List, Optional

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from narratives.frames.stub import extract_frame
from narratives.frames.validation import is_valid_frame_label


def load_cases(path: pathlib.Path) -> List[Dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("cases", [])


def evaluate(cases: Iterable[Dict[str, Any]]) -> List[str]:
    failures: List[str] = []
    for case in cases:
        event: Dict[str, Any] = case.get("event", {})
        expect_valid: Optional[bool] = case.get("expect_valid")
        label = extract_frame(event)
        valid = is_valid_frame_label(label)
        if expect_valid is True and not valid:
            failures.append(case.get("id", "unknown-case"))
        if expect_valid is False and valid:
            failures.append(case.get("id", "unknown-case"))
    return failures


def main() -> int:
    root = pathlib.Path("eval/narratives/fixtures")
    positive = load_cases(root / "frames_positive.json")
    negative = load_cases(root / "frames_negative.json")
    failures = evaluate(positive) + evaluate(negative)
    if failures:
        print("GATE-FRAME-CONTRACT failed for cases:")
        for case_id in failures:
            print(f"- {case_id}")
        return 1
    print("GATE-FRAME-CONTRACT passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
