import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def die(message: str) -> None:
    print(f"[verify_evidence] FAIL: {message}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    index_path = ROOT / "evidence" / "index.json"
    if not index_path.exists():
        die("missing evidence/index.json")

    data = json.loads(index_path.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        die("evidence/index.json version must be 1")

    evidence = data.get("evidence")
    if not isinstance(evidence, dict) or not evidence:
        die("evidence/index.json must include non-empty evidence map")

    for evidence_id, bundle in evidence.items():
        if not isinstance(bundle, dict):
            die(f"evidence entry {evidence_id} must be an object")
        for key in ("report", "metrics", "stamp"):
            path = bundle.get(key)
            if not path:
                die(f"evidence entry {evidence_id} missing {key}")
            file_path = ROOT / path
            if not file_path.exists():
                die(f"missing artifact for {evidence_id}: {path}")

    print("[verify_evidence] OK")


if __name__ == "__main__":
    main()
