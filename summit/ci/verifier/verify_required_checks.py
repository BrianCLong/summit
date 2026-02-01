from __future__ import annotations

import json
from pathlib import Path

REQUIRED_CHECKS_PATH = Path("summit/ci/verifier/required_checks.json")


def main() -> int:
    config = json.loads(REQUIRED_CHECKS_PATH.read_text())
    required = config.get("required", [])

    if not required:
        print(
            "required_checks.json has empty 'required' list. "
            "See required_checks.todo.md",
        )
        return 1

    print("OK: required checks configured:", ", ".join(required))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
