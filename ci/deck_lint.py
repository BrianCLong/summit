#!/usr/bin/env python3
import sys
from pathlib import Path

# Add root to sys.path to allow importing from packages
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from packages.summit_decks.summit_decks.lint import lint_tex


def main() -> int:
    bad = ROOT / "fixtures/decks/negative_forbidden_shell/main.tex"
    findings = lint_tex(bad)
    if not findings:
        print("expected lint failures for negative fixture but got none", file=sys.stderr)
        return 2
    print(f"ok: negative fixture fails as expected: {findings}")

    good = ROOT / "fixtures/decks/positive_clean/main.tex"
    findings = lint_tex(good)
    if findings:
        print(f"expected no lint failures for positive fixture but got: {findings}", file=sys.stderr)
        return 3
    print("ok: positive fixture passes as expected")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
