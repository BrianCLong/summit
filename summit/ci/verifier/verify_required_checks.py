from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    config_path = Path("summit/ci/verifier/required_checks.json")
    config = json.loads(config_path.read_text())
    required = config.get("required", [])

    if not required:
        print(
            "required_checks.json has empty 'required' list. See required_checks.todo.md"
        )
        return 1

    print("OK: required checks configured: {}".format(", ".join(required)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
