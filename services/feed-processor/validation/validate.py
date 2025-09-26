"""CLI entrypoint for feed processor schema validation."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from feed_processor_validation import IngestionValidator  # noqa: E402


def main() -> int:
    try:
        payload: Dict[str, Any] = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"success": False, "error": f"Invalid JSON input: {exc}"}), file=sys.stdout)
        return 2

    job = payload.get("job", {})
    entities = payload.get("entities", [])
    relationships = payload.get("relationships", [])
    postgres_records = payload.get("postgres_records")

    validator = IngestionValidator()
    result = validator.validate_batch(job, entities, relationships, postgres_records)

    output = {
        "success": result.success,
        "violations": [violation.to_dict() for violation in result.violations],
    }
    print(json.dumps(output), file=sys.stdout)
    return 0 if result.success else 1


if __name__ == "__main__":
    sys.exit(main())
