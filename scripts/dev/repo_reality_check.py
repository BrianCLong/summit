#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ASSUMED_DIRS = ["src", "tests", "docs", "scripts", "ci", ".github"]
ASSUMED_CI = [".github/workflows/*.yml", "ci/*.yml"]
ASSUMED_TEST_RUNNERS = ["pytest", "pnpm test", "make smoke"]
MUST_NOT_TOUCH_HINTS = ["core", "release", "infra"]


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    top_dirs = sorted(path.name for path in root.iterdir() if path.is_dir())
    verified_dirs = [name for name in ASSUMED_DIRS if (root / name).exists()]
    missing_assumed_dirs = [name for name in ASSUMED_DIRS if name not in verified_dirs]

    ci_files = sorted([str(path.relative_to(root)) for path in (root / ".github" / "workflows").glob("*.yml")])
    ci_files += sorted([str(path.relative_to(root)) for path in (root / "ci").glob("*.yml")]) if (root / "ci").exists() else []

    test_runners: list[str] = []
    if (root / "pyproject.toml").exists():
        test_runners.append("pytest (assumed)")
    if (root / "package.json").exists():
        test_runners.append("pnpm test (assumed)")
    if (root / "Makefile").exists():
        test_runners.append("make smoke (assumed)")

    must_not_touch = [f"{name}/**" for name in top_dirs if any(hint in name for hint in MUST_NOT_TOUCH_HINTS)]

    doc = {
        "verified_directories": verified_dirs,
        "assumed_but_not_verified_directories": missing_assumed_dirs,
        "verified_ci_configs": ci_files,
        "assumed_ci_patterns": ASSUMED_CI,
        "verified_test_runners": test_runners,
        "assumed_test_runners": ASSUMED_TEST_RUNNERS,
        "must_not_touch_patterns": must_not_touch,
    }

    output_path = root / "docs" / "repo_assumptions.md"
    lines = [
        "# Repo Reality Check",
        "",
        "## Verified directories",
        *(f"- `{entry}`" for entry in doc["verified_directories"]),
        "",
        "## Assumed but not verified directories",
        *(f"- `{entry}`" for entry in doc["assumed_but_not_verified_directories"]),
        "",
        "## Verified CI configs",
        *(f"- `{entry}`" for entry in doc["verified_ci_configs"]),
        "",
        "## Assumed CI patterns",
        *(f"- `{entry}`" for entry in doc["assumed_ci_patterns"]),
        "",
        "## Verified test runners",
        *(f"- `{entry}`" for entry in doc["verified_test_runners"]),
        "",
        "## Assumed test runners",
        *(f"- `{entry}`" for entry in doc["assumed_test_runners"]),
        "",
        "## Must-not-touch patterns",
        *(f"- `{entry}`" for entry in doc["must_not_touch_patterns"]),
        "",
        "```json",
        json.dumps(doc, indent=2, sort_keys=True),
        "```",
    ]
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
