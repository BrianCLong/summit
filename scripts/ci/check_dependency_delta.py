#!/usr/bin/env python3
import os
from pathlib import Path


def main() -> int:
    pr_number = os.environ.get("PR_NUMBER") or os.environ.get("GITHUB_PR_NUMBER")
    if not pr_number:
        print("[deps] PR number not provided; skipping PR-specific delta check.")
        return 0

    delta_path = Path(f"docs/deps/PR{pr_number}_dependency_delta.md")
    if not delta_path.exists():
        print(f"[deps] missing dependency delta doc: {delta_path}")
        return 2

    if delta_path.read_text(encoding="utf-8").strip() == "":
        print(f"[deps] dependency delta doc is empty: {delta_path}")
        return 3

    print(f"[deps] dependency delta doc present: {delta_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
