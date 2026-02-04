import json
import re
from pathlib import Path

PII_PATTERNS = [
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),  # email
]

def main() -> int:
    # Deny-by-default: require evidence bundle present
    evidence_dir = Path("evidence")
    if not evidence_dir.exists():
        print("FAIL: evidence/ missing")
        return 2
    # Simple PII scan over evidence outputs (expand as needed)
    # We scan all json files in evidence/ except maybe schemas themselves?
    # But schemas shouldn't contain PII either.
    for p in evidence_dir.rglob("*.json"):
        txt = p.read_text(errors="ignore")
        if any(rx.search(txt) for rx in PII_PATTERNS):
            print(f"FAIL: PII-like pattern in {p}")
            return 3
    print("OK: privacy graph gate")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
